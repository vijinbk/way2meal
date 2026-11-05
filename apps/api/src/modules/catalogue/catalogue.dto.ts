import {
  addOnCreateSchema,
  addOnUpdateSchema,
  flavourCreateSchema,
  flavourUpdateSchema,
  planCreateSchema,
  planUpdateSchema,
} from '@way2meal/shared';
import { createZodDto } from 'nestjs-zod';

export class PlanCreateDto extends createZodDto(planCreateSchema) {}
export class PlanUpdateDto extends createZodDto(planUpdateSchema) {}
export class AddOnCreateDto extends createZodDto(addOnCreateSchema) {}
export class AddOnUpdateDto extends createZodDto(addOnUpdateSchema) {}
export class FlavourCreateDto extends createZodDto(flavourCreateSchema) {}
export class FlavourUpdateDto extends createZodDto(flavourUpdateSchema) {}
