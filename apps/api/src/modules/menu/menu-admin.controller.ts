import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role, Slot } from '@prisma/client';
import { isoDateSchema, slotSchema, weekdaySchema } from '@way2meal/shared';
import { ZodValidationPipe } from 'nestjs-zod';
import { AuthUser, CurrentUser, Roles } from '../../common/auth/decorators';
import {
  DateRangeQueryDto,
  MenuItemCreateDto,
  MenuItemUpdateDto,
  MenuOverrideUpsertDto,
  MenuTemplateUpsertDto,
} from './menu.dto';
import { MenuAdminService } from './menu-admin.service';

const SlotParam = new ZodValidationPipe(slotSchema);
const DateParam = new ZodValidationPipe(isoDateSchema);
const WeekdayParam = new ZodValidationPipe(weekdaySchema);

@ApiTags('admin: menu')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin')
export class MenuAdminController {
  constructor(private readonly menu: MenuAdminService) {}

  @Get('menu-items')
  listItems() {
    return this.menu.listItems();
  }

  @Post('menu-items')
  createItem(@Body() body: MenuItemCreateDto, @CurrentUser() user: AuthUser) {
    return this.menu.createItem(body, user.id);
  }

  @Patch('menu-items/:id')
  updateItem(
    @Param('id') id: string,
    @Body() body: MenuItemUpdateDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.menu.updateItem(id, body, user.id);
  }

  @Get('menu-templates')
  listTemplates() {
    return this.menu.listTemplates();
  }

  @Put('menu-templates/:weekday/:slot')
  upsertTemplate(
    @Param('weekday', WeekdayParam) weekday: number,
    @Param('slot', SlotParam) slot: Slot,
    @Body() body: MenuTemplateUpsertDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.menu.upsertTemplate(weekday, slot, body, user.id);
  }

  @Get('menu-overrides')
  listOverrides(@Query() q: DateRangeQueryDto) {
    return this.menu.listOverrides(q.from, q.to);
  }

  @Put('menu-overrides/:date/:slot')
  upsertOverride(
    @Param('date', DateParam) date: string,
    @Param('slot', SlotParam) slot: Slot,
    @Body() body: MenuOverrideUpsertDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.menu.upsertOverride(date, slot, body, user.id);
  }

  @Delete('menu-overrides/:date/:slot')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOverride(
    @Param('date', DateParam) date: string,
    @Param('slot', SlotParam) slot: Slot,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.menu.deleteOverride(date, slot, user.id);
  }
}
