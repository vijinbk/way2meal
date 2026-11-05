import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';

/**
 * Turns database constraint errors into the HTTP errors clients expect instead
 * of a 500: unique violation → 409, missing row → 404, still referenced → 409.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter implements ExceptionFilter {
  override catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    super.catch(this.translate(error), host);
  }

  private translate(error: Prisma.PrismaClientKnownRequestError): unknown {
    switch (error.code) {
      case 'P2002': {
        const target = (error.meta?.target as string[] | string | undefined) ?? 'value';
        const fields = Array.isArray(target) ? target.join(', ') : target;
        return new ConflictException(`A record with this ${fields} already exists`);
      }
      case 'P2025':
        return new NotFoundException('Record not found');
      case 'P2003':
        return new ConflictException('This record is still in use and cannot be changed this way');
      default:
        return error;
    }
  }
}
