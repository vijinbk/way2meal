'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import type { MealFields, MenuItem } from '@/lib/types';
import { Button, Field, Input, Select, Textarea } from './ui';

export interface MealDraft {
  itemIds: string[];
  tagline: string;
  description: string;
  imageUrl: string;
  proteinG: string;
  kcalMin: string;
  kcalMax: string;
  note: string;
}

export function draftFrom(
  meal: (MealFields & { note?: string | null }) | null | undefined,
): MealDraft {
  const s = (v: string | number | null | undefined) => (v == null ? '' : String(v));
  return {
    itemIds: meal?.items.map((i) => i.menuItemId) ?? [],
    tagline: s(meal?.tagline),
    description: s(meal?.description),
    imageUrl: s(meal?.imageUrl),
    proteinG: s(meal?.proteinG),
    kcalMin: s(meal?.kcalMin),
    kcalMax: s(meal?.kcalMax),
    note: s(meal?.note),
  };
}

/** Builds the PUT body. Empty optional fields are sent as null so they can be cleared. */
export function payloadFrom(d: MealDraft, withNote: boolean): Record<string, unknown> {
  const text = (v: string) => (v.trim() === '' ? null : v.trim());
  const int = (label: string, v: string) => {
    if (v.trim() === '') return null;
    if (!/^\d+$/.test(v.trim())) throw new Error(`${label}: enter a whole number`);
    return Number(v);
  };
  return {
    itemIds: d.itemIds,
    tagline: text(d.tagline),
    description: text(d.description),
    imageUrl: text(d.imageUrl),
    proteinG: int('Protein', d.proteinG),
    kcalMin: int('kcal min', d.kcalMin),
    kcalMax: int('kcal max', d.kcalMax),
    ...(withNote ? { note: text(d.note) } : {}),
  };
}

/** Ordered item picker plus the meal's nutrition tags. Used for weekday templates and date overrides. */
export function MealEditor({
  draft,
  onChange,
  withNote = false,
}: {
  draft: MealDraft;
  onChange: (d: MealDraft) => void;
  withNote?: boolean;
}) {
  const items = useQuery({
    queryKey: ['/admin/menu-items'],
    queryFn: () => api<MenuItem[]>('/admin/menu-items'),
  });
  const [pick, setPick] = useState('');
  const byId = new Map((items.data ?? []).map((i) => [i.id, i]));
  const available = (items.data ?? []).filter((i) => i.active && !draft.itemIds.includes(i.id));
  const set = (patch: Partial<MealDraft>) => onChange({ ...draft, ...patch });

  const move = (index: number, by: -1 | 1) => {
    const ids = [...draft.itemIds];
    const target = index + by;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    set({ itemIds: ids });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-sm font-medium text-zinc-800">Items (in serving order)</p>
        <ol className="flex flex-col gap-1">
          {draft.itemIds.map((id, i) => {
            const item = byId.get(id);
            return (
              <li
                key={id}
                className="flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-1.5 text-sm"
              >
                <span className="w-5 text-zinc-400">{i + 1}.</span>
                <span
                  className={`flex-1 ${item && !item.active ? 'text-red-600 line-through' : ''}`}
                >
                  {item?.name ?? 'Unknown item'}
                  {item && !item.active && ' (inactive — remove or reactivate)'}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label="Move up"
                  onClick={() => move(i, -1)}
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label="Move down"
                  onClick={() => move(i, 1)}
                >
                  ↓
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label="Remove"
                  onClick={() => set({ itemIds: draft.itemIds.filter((x) => x !== id) })}
                >
                  ✕
                </Button>
              </li>
            );
          })}
          {draft.itemIds.length === 0 && <li className="text-sm text-zinc-500">No items yet.</li>}
        </ol>
        <div className="mt-2 flex gap-2">
          <Select value={pick} onChange={(e) => setPick(e.target.value)} className="max-w-xs">
            <option value="">Add an item…</option>
            {available.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </Select>
          <Button
            type="button"
            variant="secondary"
            disabled={!pick}
            onClick={() => {
              set({ itemIds: [...draft.itemIds, pick] });
              setPick('');
            }}
          >
            Add
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Protein (g)">
          <Input
            inputMode="numeric"
            value={draft.proteinG}
            onChange={(e) => set({ proteinG: e.target.value })}
          />
        </Field>
        <Field label="kcal min">
          <Input
            inputMode="numeric"
            value={draft.kcalMin}
            onChange={(e) => set({ kcalMin: e.target.value })}
          />
        </Field>
        <Field label="kcal max">
          <Input
            inputMode="numeric"
            value={draft.kcalMax}
            onChange={(e) => set({ kcalMax: e.target.value })}
          />
        </Field>
        <Field label="Tagline">
          <Input
            value={draft.tagline}
            placeholder="Balanced meal"
            onChange={(e) => set({ tagline: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Description">
        <Textarea
          value={draft.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </Field>
      <Field
        label="Photo URL"
        hint="Photo upload arrives with file storage in M3; paste an image link for now."
      >
        <Input
          type="url"
          value={draft.imageUrl}
          onChange={(e) => set({ imageUrl: e.target.value })}
        />
      </Field>
      {withNote && (
        <Field label="Note shown to customers" hint="e.g. Onam special">
          <Input value={draft.note} onChange={(e) => set({ note: e.target.value })} />
        </Field>
      )}
    </div>
  );
}
