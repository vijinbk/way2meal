import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser, Roles } from '../../common/auth/decorators';
import {
  AddOnCreateDto,
  AddOnUpdateDto,
  FlavourCreateDto,
  FlavourUpdateDto,
  PlanCreateDto,
  PlanUpdateDto,
} from './catalogue.dto';
import { CatalogueAdminService } from './catalogue-admin.service';

@ApiTags('admin: catalogue')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin')
export class CatalogueAdminController {
  constructor(private readonly catalogue: CatalogueAdminService) {}

  @Get('plans')
  listPlans() {
    return this.catalogue.listPlans();
  }

  @Post('plans')
  createPlan(@Body() body: PlanCreateDto, @CurrentUser() user: AuthUser) {
    return this.catalogue.createPlan(body, user.id);
  }

  @Patch('plans/:id')
  updatePlan(@Param('id') id: string, @Body() body: PlanUpdateDto, @CurrentUser() user: AuthUser) {
    return this.catalogue.updatePlan(id, body, user.id);
  }

  @Get('addons')
  listAddOns() {
    return this.catalogue.listAddOns();
  }

  @Post('addons')
  createAddOn(@Body() body: AddOnCreateDto, @CurrentUser() user: AuthUser) {
    return this.catalogue.createAddOn(body, user.id);
  }

  @Patch('addons/:id')
  updateAddOn(
    @Param('id') id: string,
    @Body() body: AddOnUpdateDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.catalogue.updateAddOn(id, body, user.id);
  }

  @Get('flavours')
  listFlavours() {
    return this.catalogue.listFlavours();
  }

  @Post('flavours')
  createFlavour(@Body() body: FlavourCreateDto, @CurrentUser() user: AuthUser) {
    return this.catalogue.createFlavour(body, user.id);
  }

  @Patch('flavours/:id')
  updateFlavour(
    @Param('id') id: string,
    @Body() body: FlavourUpdateDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.catalogue.updateFlavour(id, body, user.id);
  }
}
