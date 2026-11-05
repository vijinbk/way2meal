import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser, Roles } from '../../common/auth/decorators';
import { DateRangeQueryDto } from '../menu/menu.dto';
import { HolidayService } from './holiday.service';
import { HolidayCreateDto, SettingUpdateDto } from './settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('admin: settings')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin')
export class SettingsAdminController {
  constructor(
    private readonly settings: SettingsService,
    private readonly holidays: HolidayService,
  ) {}

  @Get('settings')
  getAll() {
    return this.settings.getAll();
  }

  @Put('settings/:key')
  set(@Param('key') key: string, @Body() body: SettingUpdateDto, @CurrentUser() user: AuthUser) {
    return this.settings.set(key, body.value, user.id);
  }

  @Get('holidays')
  listHolidays(@Query() q: DateRangeQueryDto) {
    return this.holidays.list(q.from, q.to);
  }

  @Post('holidays')
  createHoliday(@Body() body: HolidayCreateDto, @CurrentUser() user: AuthUser) {
    return this.holidays.create(body, user.id);
  }

  @Delete('holidays/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteHoliday(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<void> {
    await this.holidays.remove(id, user.id);
  }
}
