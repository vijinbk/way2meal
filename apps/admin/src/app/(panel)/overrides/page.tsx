'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type Slot,
  addDays,
  isIsoDate,
  istDateOf,
  menuOverrideUpsertSchema,
} from '@way2meal/shared';
import { useState } from 'react';
import { type MealDraft, MealEditor, draftFrom, payloadFrom } from '@/components/meal-editor';
import {
  Badge,
  Button,
  Card,
  ConfirmButton,
  ErrorText,
  Field,
  Input,
  Loading,
  PageHeader,
  Select,
} from '@/components/ui';
import { api } from '@/lib/api';
import { type MenuOverride, SLOT_LABEL } from '@/lib/types';

export default function OverridesPage() {
  const qc = useQueryClient();
  const today = istDateOf(new Date());
  const to = addDays(today, 180);
  const key = ['/admin/menu-overrides', today];
  const list = useQuery({
    queryKey: key,
    queryFn: () => api<MenuOverride[]>(`/admin/menu-overrides?from=${today}&to=${to}`),
  });

  const [editing, setEditing] = useState<{ date: string; slot: Slot; isNew: boolean } | null>(null);
  const [draft, setDraft] = useState<MealDraft>(draftFrom(null));
  const [formError, setFormError] = useState<unknown>(null);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['/admin/menu-overrides'] });
    void qc.invalidateQueries({ queryKey: ['/menu'] });
  };
  const save = useMutation({
    mutationFn: (v: { date: string; slot: Slot; body: Record<string, unknown> }) =>
      api(`/admin/menu-overrides/${v.date}/${v.slot}`, { method: 'PUT', body: v.body }),
    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
  });
  const remove = useMutation({
    mutationFn: (o: MenuOverride) =>
      api(`/admin/menu-overrides/${o.date}/${o.slot}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });

  const open = (o: MenuOverride | null) => {
    setEditing(
      o
        ? { date: o.date, slot: o.slot, isNew: false }
        : { date: addDays(today, 1), slot: 'LUNCH', isNew: true },
    );
    setDraft(draftFrom(o));
    setFormError(null);
    save.reset();
  };

  const submit = () => {
    setFormError(null);
    try {
      if (!editing || !isIsoDate(editing.date)) throw new Error('Pick a valid date');
      const body = payloadFrom(draft, true);
      const parsed = menuOverrideUpsertSchema.safeParse(body);
      if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join('; '));
      if (
        editing.isNew &&
        list.data?.some((o) => o.date === editing.date && o.slot === editing.slot)
      ) {
        throw new Error(
          `${SLOT_LABEL[editing.slot]} on ${editing.date} already has a special — edit it from the list.`,
        );
      }
      save.mutate({ date: editing.date, slot: editing.slot, body });
    } catch (e) {
      setFormError(e);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Date specials"
        description="Replace the weekly menu for one date and slot, e.g. a festival meal. The app shows the special instead of the weekly menu."
        actions={!editing && <Button onClick={() => open(null)}>+ New special</Button>}
      />

      {editing && (
        <Card
          title={
            editing.isNew
              ? 'New special'
              : `Edit special: ${SLOT_LABEL[editing.slot]} on ${editing.date}`
          }
        >
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            {editing.isNew && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Date">
                  <Input
                    type="date"
                    min={today}
                    value={editing.date}
                    onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                  />
                </Field>
                <Field label="Slot">
                  <Select
                    value={editing.slot}
                    onChange={(e) => setEditing({ ...editing, slot: e.target.value as Slot })}
                  >
                    <option value="LUNCH">Lunch</option>
                    <option value="DINNER">Dinner</option>
                  </Select>
                </Field>
              </div>
            )}
            <MealEditor draft={draft} onChange={setDraft} withNote />
            <ErrorText error={formError ?? save.error} />
            <div className="flex gap-2">
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? 'Saving…' : 'Save'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card title="Upcoming specials (next 6 months)">
        {list.isPending ? (
          <Loading />
        ) : list.error ? (
          <ErrorText error={list.error} />
        ) : list.data.length === 0 ? (
          <p className="text-sm text-zinc-500">No specials planned.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {list.data.map((o) => (
              <li key={o.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-medium">
                    {o.date} · {SLOT_LABEL[o.slot]} {o.note && <Badge tone="amber">{o.note}</Badge>}
                  </p>
                  <p className="text-sm text-zinc-600">
                    {o.items.map((i) => i.menuItem.name).join(', ')}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => open(o)}>
                    Edit
                  </Button>
                  <ConfirmButton disabled={remove.isPending} onConfirm={() => remove.mutate(o)}>
                    Remove
                  </ConfirmButton>
                </div>
              </li>
            ))}
          </ul>
        )}
        <ErrorText error={remove.error} />
      </Card>
    </div>
  );
}
