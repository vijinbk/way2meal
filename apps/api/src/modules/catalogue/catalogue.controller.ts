import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BUSINESS_TIME_ZONE, PublicConfig } from '@way2meal/shared';
import { Public } from '../../common/auth/decorators';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

/** What customers can buy, and the non-sensitive settings the apps need. Active rows only. */
@ApiTags('catalogue')
@Public()
@Controller()
export class CatalogueController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  @Get('plans')
  plans() {
    return this.prisma.plan.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        kind: true,
        slot: true,
        mealCount: true,
        pricePaise: true,
        maxSkips: true,
        validityDays: true,
        oncePerUser: true,
      },
    });
  }

  @Get('addons')
  addOns() {
    return this.prisma.addOn.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        pricePaise: true,
        slots: true,
      },
    });
  }

  @Get('flavours')
  flavours() {
    return this.prisma.flavour.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, imageUrl: true },
    });
  }

  @Get('config')
  async config(): Promise<PublicConfig> {
    const s = await this.settings.getAll();
    return {
      timeZone: BUSINESS_TIME_ZONE,
      cutoffs: s.cutoffs,
      serviceWeekdays: s.serviceWeekdays,
      bookingDaysAhead: s.bookingDaysAhead,
      whatsappNumber: s.whatsappNumber,
    };
  }
}
