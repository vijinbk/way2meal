import { Role } from '@prisma/client';
import request from 'supertest';
import { type TestApp, createTestApp, resetDb } from './setup/test-app';

const PHONE = '+919876543210';

describe('Auth (mock OTP)', () => {
  let t: TestApp;
  const http = () => request(t.app.getHttpServer());

  const requestOtp = (phone = PHONE) => http().post('/v1/auth/otp/request').send({ phone });
  const verify = (code: string, phone = PHONE) =>
    http().post('/v1/auth/otp/verify').send({ phone, code });
  const lastCode = () => t.outbox.latest()[0]!.code;
  const login = async (phone = PHONE) => {
    await requestOtp(phone).expect(202);
    const res = await verify(lastCode(), phone).expect(200);
    return res.body as {
      tokens: { accessToken: string; refreshToken: string };
      user: { id: string };
    };
  };

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());
  beforeEach(async () => {
    await resetDb(t.prisma);
    t.clock.set('2026-11-09T08:00:00+05:30');
  });

  it('logs in a new customer end to end and stores only a hash of the code', async () => {
    const req = await requestOtp('98765 43210').expect(202);
    expect(req.body.expiresAt).toBe('2026-11-09T02:35:00.000Z'); // 08:05 IST, TTL 5 min

    const code = lastCode();
    const stored = await t.prisma.otpRequest.findFirstOrThrow({ where: { phone: PHONE } });
    expect(stored.codeHash).not.toContain(code);
    expect(stored.codeHash).toMatch(/^[0-9a-f]{64}$/);

    const res = await verify(code).expect(200);
    expect(res.body).toMatchObject({
      isNewUser: true,
      profileComplete: false,
      user: { phone: PHONE, role: 'CUSTOMER' },
    });

    const me = await http()
      .get('/v1/me')
      .set('Authorization', `Bearer ${res.body.tokens.accessToken}`)
      .expect(200);
    expect(me.body.phone).toBe(PHONE);
  });

  it('returns the existing user on a later login', async () => {
    const first = await login();
    await t.prisma.user.update({ where: { id: first.user.id }, data: { name: 'Asha' } });
    await requestOtp().expect(202);
    const res = await verify(lastCode()).expect(200);
    expect(res.body).toMatchObject({
      isNewUser: false,
      profileComplete: true,
      user: { id: first.user.id },
    });
  });

  it('rejects invalid phone numbers', async () => {
    const res = await requestOtp('12345').expect(400);
    expect(JSON.stringify(res.body)).toContain('10-digit');
  });

  it('rate-limits to 3 OTP requests per 10 minutes per phone', async () => {
    for (let i = 0; i < 3; i++) await requestOtp().expect(202);
    const res = await requestOtp().expect(429);
    expect(res.body.message).toMatch(/3 codes every 10 minutes/);

    await requestOtp('+919800000000').expect(202); // other phones unaffected
    t.clock.advance(10 * 60_000 + 1000);
    await requestOtp().expect(202);
  });

  it('counts wrong attempts and locks the code after the limit', async () => {
    await requestOtp().expect(202);
    const code = lastCode();
    const wrong = code === '000000' ? '111111' : '000000';

    const first = await verify(wrong).expect(401);
    expect(first.body.message).toBe('Incorrect OTP. 4 attempts left.');
    for (let i = 0; i < 4; i++) await verify(wrong).expect(401);

    await verify(code).expect(429);
  });

  it('rejects an expired code', async () => {
    await requestOtp().expect(202);
    t.clock.advance(5 * 60_000);
    const res = await verify(lastCode()).expect(401);
    expect(res.body.message).toMatch(/expired/);
  });

  it('accepts a code only once', async () => {
    await requestOtp().expect(202);
    const code = lastCode();
    await verify(code).expect(200);
    await verify(code).expect(401);
  });

  it('rotates refresh tokens and revokes all sessions on reuse', async () => {
    const { tokens } = await login();
    const rotated = await http()
      .post('/v1/auth/refresh')
      .send({ refreshToken: tokens.refreshToken })
      .expect(200);
    expect(rotated.body.refreshToken).not.toBe(tokens.refreshToken);

    // Replaying the old token is treated as theft…
    await http().post('/v1/auth/refresh').send({ refreshToken: tokens.refreshToken }).expect(401);
    // …so the newer token is revoked too.
    await http()
      .post('/v1/auth/refresh')
      .send({ refreshToken: rotated.body.refreshToken })
      .expect(401);
  });

  it('logout revokes the refresh token', async () => {
    const { tokens } = await login();
    await http().post('/v1/auth/logout').send({ refreshToken: tokens.refreshToken }).expect(204);
    await http().post('/v1/auth/refresh').send({ refreshToken: tokens.refreshToken }).expect(401);
  });

  it('expires refresh tokens after 30 days', async () => {
    const { tokens } = await login();
    t.clock.advance(30 * 86_400_000);
    await http().post('/v1/auth/refresh').send({ refreshToken: tokens.refreshToken }).expect(401);
  });

  it('access tokens expire after 15 minutes', async () => {
    const { tokens } = await login();
    const auth = `Bearer ${tokens.accessToken}`;
    t.clock.advance(14 * 60_000);
    await http().get('/v1/me').set('Authorization', auth).expect(200);
    t.clock.advance(60_000);
    await http().get('/v1/me').set('Authorization', auth).expect(401);
  });

  it('requires authentication by default', async () => {
    await http().get('/v1/me').expect(401);
    await http().get('/v1/me').set('Authorization', 'Bearer not-a-jwt').expect(401);
    await http().get('/v1/health').expect(200);
  });

  it('admin routes need the ADMIN role; the admin can read recent OTPs', async () => {
    const customer = await login();
    await http()
      .get('/v1/admin/otps')
      .set('Authorization', `Bearer ${customer.tokens.accessToken}`)
      .expect(403);

    await t.prisma.user.create({
      data: { phone: '+919999999999', role: Role.ADMIN, name: 'Owner' },
    });
    const admin = await login('+919999999999');
    await requestOtp('+919811111111').expect(202);
    const res = await http()
      .get('/v1/admin/otps')
      .set('Authorization', `Bearer ${admin.tokens.accessToken}`)
      .expect(200);
    expect(res.body[0]).toMatchObject({
      phone: '+919811111111',
      code: expect.stringMatching(/^\d{6}$/),
    });
  });
});

describe('Auth with DEV_OTP (non-production)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp({ env: { DEV_OTP: '123456' } });
    await resetDb(t.prisma);
  });
  afterAll(() => t.close());

  it('accepts the fixed development code', async () => {
    const http = request(t.app.getHttpServer());
    await http.post('/v1/auth/otp/request').send({ phone: PHONE }).expect(202);
    await request(t.app.getHttpServer())
      .post('/v1/auth/otp/verify')
      .send({ phone: PHONE, code: '123456' })
      .expect(200);
  });
});
