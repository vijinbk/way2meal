import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppConfig } from '../../config/env';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MockOtpProvider } from './otp/mock-otp.provider';
import { OtpOutbox } from './otp/otp-outbox';
import { OTP_PROVIDER } from './otp/otp-provider';
import { TokenService } from './token.service';

@Module({
  imports: [
    JwtModule.register({}),
    ThrottlerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => [
        { ttl: 60_000, limit: config.env.AUTH_IP_RATE_LIMIT_PER_MINUTE },
      ],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    OtpOutbox,
    MockOtpProvider,
    {
      provide: OTP_PROVIDER,
      inject: [AppConfig, MockOtpProvider],
      // Phase 2: add the real SMS provider here, selected by OTP_PROVIDER.
      useFactory: (config: AppConfig, mock: MockOtpProvider) => {
        switch (config.env.OTP_PROVIDER) {
          case 'mock':
            return mock;
        }
      },
    },
  ],
  exports: [JwtModule, OtpOutbox],
})
export class AuthModule {}
