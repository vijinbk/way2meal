import { otpRequestSchema, otpVerifySchema, refreshSchema } from '@way2meal/shared';
import { createZodDto } from 'nestjs-zod';

export class OtpRequestDto extends createZodDto(otpRequestSchema) {}
export class OtpVerifyDto extends createZodDto(otpVerifySchema) {}
export class RefreshDto extends createZodDto(refreshSchema) {}
