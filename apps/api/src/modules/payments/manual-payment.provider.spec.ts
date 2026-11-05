import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
import { ManualPaymentInstructions, ManualPaymentProvider } from './manual-payment.provider';

const settingsWith = (upi: { vpa: string; payeeName: string; qrImageUrl: string | null }) =>
  ({ get: jest.fn().mockResolvedValue(upi) }) as unknown as SettingsService;

describe('ManualPaymentProvider', () => {
  const provider = new ManualPaymentProvider(
    settingsWith({ vpa: 'way2meal@upi', payeeName: 'Way2meal', qrImageUrl: 'https://cdn/qr.png' }),
  );

  it('returns UPI instructions from settings with a prefilled upi:// link', async () => {
    const intent = await provider.createIntent({
      amountPaise: 415_900,
      refType: 'SUBSCRIPTION',
      refId: 'cksub1234abcd',
    });
    const ins = intent.instructions as ManualPaymentInstructions;
    expect(ins).toMatchObject({
      method: 'UPI_MANUAL',
      amountPaise: 415_900,
      vpa: 'way2meal@upi',
      reference: 'W2M-S-1234ABCD',
    });
    const uri = new URL(ins.upiUri);
    expect(uri.protocol).toBe('upi:');
    expect(uri.searchParams.get('am')).toBe('4159.00');
    expect(uri.searchParams.get('cu')).toBe('INR');
    expect(uri.searchParams.get('pa')).toBe('way2meal@upi');
  });

  it('refuses to take payment until the kitchen has set its UPI ID', async () => {
    const unconfigured = new ManualPaymentProvider(
      settingsWith({ vpa: '', payeeName: 'Way2meal', qrImageUrl: null }),
    );
    await expect(
      unconfigured.createIntent({ amountPaise: 100, refType: 'ORDER', refId: 'o1' }),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('rejects non-integer or negative amounts', async () => {
    await expect(
      provider.createIntent({ amountPaise: 99.5, refType: 'ORDER', refId: 'o1' }),
    ).rejects.toThrow(RangeError);
    await expect(provider.refund('p1', -1)).rejects.toThrow(RangeError);
  });

  it('treats the admin decision as verification', async () => {
    await expect(provider.verify('p1', { decision: 'APPROVE' })).resolves.toBe('PAID');
    await expect(provider.verify('p1', { decision: 'REJECT' })).resolves.toBe('FAILED');
    await expect(provider.verify('p1', { decision: 'MAYBE' })).rejects.toThrow(BadRequestException);
  });
});
