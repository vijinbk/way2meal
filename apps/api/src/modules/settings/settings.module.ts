import { Global, Module } from '@nestjs/common';
import { HolidayService } from './holiday.service';
import { SettingsAdminController } from './settings-admin.controller';
import { SettingsService } from './settings.service';

@Global()
@Module({
  controllers: [SettingsAdminController],
  providers: [SettingsService, HolidayService],
  exports: [SettingsService, HolidayService],
})
export class SettingsModule {}
