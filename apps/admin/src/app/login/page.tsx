'use client';

import { otpCodeSchema, phoneSchema } from '@way2meal/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Card, ErrorText, Field, Input } from '@/components/ui';
import { authPost } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const requestCode = () =>
    run(async () => {
      const parsed = phoneSchema.safeParse(phone);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
      await authPost('/otp/request', { phone: parsed.data });
      setStep('code');
    });

  const verify = () =>
    run(async () => {
      if (!otpCodeSchema.safeParse(code).success)
        throw new Error('Enter the 6-digit code, or your admin login code');
      await authPost('/otp/verify', { phone: phoneSchema.parse(phone), code });
      router.replace('/');
    });

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm" title="Way2meal admin">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void (step === 'phone' ? requestCode() : verify());
          }}
        >
          <Field label="Mobile number">
            <Input
              inputMode="tel"
              autoComplete="tel"
              placeholder="98765 43210"
              value={phone}
              disabled={step === 'code'}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
          {step === 'code' && (
            <Field
              label="Login code"
              hint="Phase 1 has no SMS yet: enter your admin login code (outside production, the sent code is also printed in the API log)."
            >
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={12}
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </Field>
          )}
          <ErrorText error={error} />
          <Button type="submit" disabled={busy}>
            {busy ? 'Please wait…' : step === 'phone' ? 'Send code' : 'Sign in'}
          </Button>
          {step === 'code' && (
            <Button type="button" variant="ghost" onClick={() => setStep('phone')}>
              Use a different number
            </Button>
          )}
        </form>
      </Card>
    </main>
  );
}
