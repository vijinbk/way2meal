import { Module } from '@nestjs/common';
import { CatalogueAdminController } from './catalogue-admin.controller';
import { CatalogueAdminService } from './catalogue-admin.service';
import { CatalogueController } from './catalogue.controller';

@Module({
  controllers: [CatalogueController, CatalogueAdminController],
  providers: [CatalogueAdminService],
})
export class CatalogueModule {}
