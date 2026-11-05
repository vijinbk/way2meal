import { z } from 'zod';
import { otpCodeSchema, phoneSchema } from './common';

export const otpRequestSchema = z.object({ phone: phoneSchema });
export type OtpRequestInput = z.input<typeof otpRequestSchema>;

export const otpVerifySchema = z.object({ phone: phoneSchema, code: otpCodeSchema });
export type OtpVerifyInput = z.input<typeof otpVerifySchema>;

export const refreshSchema = z.object({ refreshToken: z.string().min(20) });
export type RefreshInput = z.input<typeof refreshSchema>;

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}
