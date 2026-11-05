import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SETTING_KEYS, SettingKey, SettingValue, Settings, settingSchemas } from '@way2meal/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Reads admin-editable settings from the `Setting` table. There are no code
 * defaults on purpose: a missing or malformed row is a configuration error
 * (run the seed), not something to paper over with a hard-coded value.
 */
@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
    const row = await this.prisma.setting.findUnique({ where: { key } });
    if (!row) throw new InternalServerErrorException(`Setting "${key}" is not configured`);
    return this.parse(key, row.value);
  }

  async getAll(): Promise<Settings> {
    const rows = await this.prisma.setting.findMany({ where: { key: { in: SETTING_KEYS } } });
    const byKey = new Map(rows.map((r) => [r.key, r.value]));
    const entries = SETTING_KEYS.map((key) => {
      if (!byKey.has(key))
        throw new InternalServerErrorException(`Setting "${key}" is not configured`);
      return [key, this.parse(key, byKey.get(key))] as const;
    });
    return Object.fromEntries(entries) as Settings;
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
