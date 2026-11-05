import {
  dateRangeQuerySchema,
  menuItemCreateSchema,
  menuItemUpdateSchema,
  menuOverrideUpsertSchema,
  menuQuerySchema,
  menuTemplateUpsertSchema,
} from '@way2meal/shared';
import { createZodDto } from 'nestjs-zod';

export class MenuQueryDto extends createZodDto(menuQuerySchema) {}
export class DateRangeQueryDto extends createZodDto(dateRangeQuerySchema) {}
export class MenuItemCreateDto extends createZodDto(menuItemCreateSchema) {}
export class MenuItemUpdateDto extends createZodDto(menuItemUpdateSchema) {}
export class MenuTemplateUpsertDto extends createZodDto(menuTemplateUpsertSchema) {}
export class MenuOverrideUpsertDto extends createZodDto(menuOverrideUpsertSchema) {}
