import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminOtpController } from './admin-otp.controller';

@Module({
  imports: [AuthModule],
  controllers: [AdminOtpController],
})
export class AdminModule {}
