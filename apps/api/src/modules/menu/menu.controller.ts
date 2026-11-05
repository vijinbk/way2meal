import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/auth/decorators';
import { MenuQueryDto } from './menu.dto';
import { MenuService } from './menu.service';

@ApiTags('menu')
@Public()
@Controller('menu')
export class MenuController {
  constructor(private readonly menu: MenuService) {}

  /** Resolved menu per date (override, else weekday template); closed days flagged. */
  @Get()
  resolve(@Query() q: MenuQueryDto) {
    return this.menu.resolve(q.from, q.to, q.slot ? [q.slot] : undefined);
  }
}
