import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/auth/decorators';
import { OtpOutbox } from '../auth/otp/otp-outbox';

/** Phase 1 only: lets the admin read a login code to a customer while there is no SMS. */
@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/otps')
export class AdminOtpController {
  constructor(private readonly outbox: OtpOutbox) {}

  @Get()
  latest() {
    return this.outbox
      .latest()
      .map((e) => ({ phone: e.phone, code: e.code, sentAt: e.sentAt.toISOString() }));
  }
}
