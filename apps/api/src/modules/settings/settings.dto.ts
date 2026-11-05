import { holidayCreateSchema } from '@way2meal/shared';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class HolidayCreateDto extends createZodDto(holidayCreateSchema) {}
/** The value's shape depends on the key; SettingsService validates it. */
export class SettingUpdateDto extends createZodDto(z.object({ value: z.unknown() })) {}
