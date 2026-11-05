import { BadRequestException } from '@nestjs/common';
import { IsoDate, MAX_RANGE_DAYS, daysBetween } from '@way2meal/shared';

/** Validates an inclusive date range and returns its length in days. */
export function assertRange(from: IsoDate, to: IsoDate, maxDays = MAX_RANGE_DAYS): number {
  const span = daysBetween(from, to) + 1;
  if (span < 1) throw new BadRequestException('"to" must be on or after "from"');
  if (span > maxDays) throw new BadRequestException(`Date range can be at most ${maxDays} days`);
  return span;
}
