import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  HolidayEntry,
  IsoDate,
  SETTING_KEYS,
  ServiceCalendar,
  SettingKey,
  SettingValue,
  Settings,
  dbDateToIsoDate,
  isoDateToDbDate,
  settingSchemas,
} from '@way2meal/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

type Db = PrismaService | Prisma.TransactionClient;

const isSettingKey = (key: string): key is SettingKey => (SETTING_KEYS as string[]).includes(key);

/**
 * Reads admin-editable settings from the `Setting` table. There are no code
 * defaults on purpose: a missing or malformed row is a configuration error
 * (run the seed), not something to paper over with a hard-coded value.
 */
@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async get<K extends SettingKey>(key: K, db: Db = this.prisma): Promise<SettingValue<K>> {
    const row = await db.setting.findUnique({ where: { key } });
    if (!row) throw new InternalServerErrorException(`Setting "${key}" is not configured`);
    return this.parse(key, row.value);
  }

  async getAll(db: Db = this.prisma): Promise<Settings> {
    const rows = await db.setting.findMany({ where: { key: { in: SETTING_KEYS } } });
    const byKey = new Map(rows.map((r) => [r.key, r.value]));
    const entries = SETTING_KEYS.map((key) => {
      if (!byKey.has(key))
        throw new InternalServerErrorException(`Setting "${key}" is not configured`);
      return [key, this.parse(key, byKey.get(key))] as const;
    });
    return Object.fromEntries(entries) as Settings;
  }

  /** Validates against the key's schema, saves, and audit-logs in one transaction. */
  async set(key: string, value: unknown, actorId: string): Promise<unknown> {
    if (!isSettingKey(key)) throw new NotFoundException(`Unknown setting "${key}"`);
    const parsed = settingSchemas[key].safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException({
        message: `Invalid value for "${key}"`,
        errors: parsed.error.issues,
      });
    }
    const json = parsed.data as Prisma.InputJsonValue;
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.setting.findUnique({ where: { key } });
      await tx.setting.upsert({
        where: { key },
        create: { key, value: json },
        update: { value: json },
      });
      await this.audit.record(
        {
          actorId,
          action: 'setting.update',
          entity: 'Setting',
          entityId: key,
          before: before?.value,
          after: json,
        },
        tx,
      );
      return parsed.data;
    });
  }

  /** Service weekdays + holidays overlapping [from, to] — everything isServiceDay() needs. */
  async getServiceCalendar(
    from: IsoDate,
    to: IsoDate,
    db: Db = this.prisma,
  ): Promise<ServiceCalendar> {
    const [serviceWeekdays, holidays] = await Promise.all([
      this.get('serviceWeekdays', db),
      db.holiday.findMany({
        where: { date: { gte: isoDateToDbDate(from), lte: isoDateToDbDate(to) } },
      }),
    ]);
    return {
      serviceWeekdays,
      holidays: holidays.map((h): HolidayEntry => ({
        date: dbDateToIsoDate(h.date),
        slot: h.slot,
      })),
    };
  }

  private parse<K extends SettingKey>(key: K, value: unknown): SettingValue<K> {
    const result = settingSchemas[key].safeParse(value);
    if (!result.success) {
      throw new InternalServerErrorException(
        `Setting "${key}" is malformed: ${result.error.message}`,
      );
    }
    return result.data as SettingValue<K>;
  }
}
