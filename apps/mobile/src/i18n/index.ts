import { type MessageKey, en } from './en';

/**
 * Minimal i18n: every UI string goes through t() with a typed key, so adding
 * Malayalam is a new dictionary with the same keys plus a locale switch.
 */
const dictionaries: Record<string, Partial<Record<MessageKey, string>>> = { en };
let locale = 'en';

export function setLocale(next: string): void {
  if (dictionaries[next]) locale = next;
}

export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const template = dictionaries[locale]?.[key] ?? en[key];
  return params
    ? template.replace(/\{(\w+)\}/g, (_, p: string) => String(params[p] ?? `{${p}}`))
    : template;
}

export type { MessageKey };
