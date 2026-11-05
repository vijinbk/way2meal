'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SLOTS, type Slot, menuTemplateUpsertSchema } from '@way2meal/shared';
import { useState } from 'react';
import { type MealDraft, MealEditor, draftFrom, payloadFrom } from '@/components/meal-editor';
import { Button, Card, ErrorText, Loading, PageHeader } from '@/components/ui';
import { WeekPreview } from '@/components/week-preview';
import { api } from '@/lib/api';
import { type MenuTemplate, SLOT_LABEL, WEEKDAY_NAMES } from '@/lib/types';

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

export default function WeeklyMenuPage() {
  const qc = useQueryClient();
  const templates = useQuery({
    queryKey: ['/admin/menu-templates'],
    queryFn: () => api<MenuTemplate[]>('/admin/menu-templates'),
  });
  const [editing, setEditing] = useState<{ weekday: number; slot: Slot } | null>(null);
  const [draft, setDraft] = useState<MealDraft>(draftFrom(null));
  const [formError, setFormError] = useState<unknown>(null);

  const find = (weekday: number, slot: Slot) =>
    templates.data?.find((t) => t.weekday === weekday && t.slot === slot);

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api(`/admin/menu-templates/${editing!.weekday}/${editing!.slot}`, { method: 'PUT', body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['/admin/menu-templates'] });
      void qc.invalidateQueries({ queryKey: ['/menu'] });
      setEditing(null);
    },
  });

  const open = (weekday: number, slot: Slot) => {
    setEditing({ weekday, slot });
    setDraft(draftFrom(find(weekday, slot)));
    setFormError(null);
    save.reset();
  };

  const submit = () => {
    setFormError(null);
    try {
      const body = payloadFrom(draft, false);
      const parsed = menuTemplateUpsertSchema.safeParse(body);
      if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join('; '));
      save.mutate(body);
    } catch (e) {
      setFormError(e);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Weekly menu"
        description="The fixed meal for each weekday. Use Date specials to change a single date."
      />

      {editing && (
        <Card title={`${WEEKDAY_NAMES[editing.weekday]} ${SLOT_LABEL[editing.slot]}`}>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <MealEditor draft={draft} onChange={setDraft} />
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

      <Card>
        {templates.isPending ? (
          <Loading />
        ) : templates.error ? (
          <ErrorText error={templates.error} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {WEEKDAYS.map((weekday) => (
              <div key={weekday} className="rounded-md border border-zinc-200 p-3">
                <p className="mb-2 font-semibold">{WEEKDAY_NAMES[weekday]}</p>
                {SLOTS.map((slot) => {
                  const t = find(weekday, slot);
                  return (
                    <div key={slot} className="mb-3 last:mb-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{SLOT_LABEL[slot]}</span>
                        <Button size="sm" variant="ghost" onClick={() => open(weekday, slot)}>
                          {t ? 'Edit' : 'Set menu'}
                        </Button>
                      </div>
                      {t ? (
                        <>
                          <p className="text-sm text-zinc-600">
                            {t.items.map((i) => i.menuItem.name).join(', ')}
                          </p>
                          {(t.proteinG != null || t.kcalMin != null) && (
                            <p className="text-xs text-zinc-500">
                              {t.proteinG != null && `${t.proteinG} g+ protein`}
                              {t.kcalMin != null &&
                                ` · ${t.kcalMin}–${t.kcalMax ?? t.kcalMin} kcal`}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-zinc-400">Not set</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </Card>

      <WeekPreview />
    </div>
  );
}
