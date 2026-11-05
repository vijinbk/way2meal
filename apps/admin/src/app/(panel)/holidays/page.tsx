'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, holidayCreateSchema, isoWeekday, istDateOf } from '@way2meal/shared';
import { useState } from 'react';
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
import { type Holiday, SLOT_LABEL, WEEKDAY_NAMES } from '@/lib/types';

export default function HolidaysPage() {
  const qc = useQueryClient();
  const today = istDateOf(new Date());
  const list = useQuery({
    queryKey: ['/admin/holidays', today],
    queryFn: () => api<Holiday[]>(`/admin/holidays?from=${today}&to=${addDays(today, 365)}`),
  });
  const [form, setForm] = useState({ date: addDays(today, 1), slot: '', reason: '' });
  const [formError, setFormError] = useState<unknown>(null);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['/admin/holidays'] });
    void qc.invalidateQueries({ queryKey: ['/menu'] });
  };
  const create = useMutation({
    mutationFn: (body: unknown) => api('/admin/holidays', { method: 'POST', body }),
    onSuccess: () => {
      invalidate();
      setForm((f) => ({ ...f, reason: '' }));
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/holidays/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });

  const submit = () => {
    setFormError(null);
    const body = {
      date: form.date,
      slot: form.slot === '' ? null : form.slot,
      reason: form.reason,
    };
    const parsed = holidayCreateSchema.safeParse(body);
    if (!parsed.success)
      return setFormError(
        new Error(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')),
      );
    create.mutate(parsed.data);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Holidays"
        description="Days the kitchen is closed. Customers see the closure on the menu."
      />
      <Card title="Add a holiday">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date">
              <Input
                type="date"
                min={today}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </Field>
            <Field label="Closed for">
              <Select
                value={form.slot}
                onChange={(e) => setForm({ ...form, slot: e.target.value })}
              >
                <option value="">Lunch and dinner</option>
                <option value="LUNCH">Lunch only</option>
                <option value="DINNER">Dinner only</option>
              </Select>
            </Field>
            <Field label="Reason">
              <Input
                value={form.reason}
                placeholder="e.g. Onam"
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </Field>
          </div>
          <p className="text-xs text-zinc-500">
            From M3, subscribers&apos; meals on a new holiday will move to the end of their plans
            automatically.
          </p>
          <ErrorText error={formError ?? create.error} />
          <div>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Adding…' : 'Add holiday'}
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Upcoming (next 12 months)">
        {list.isPending ? (
          <Loading />
        ) : list.error ? (
          <ErrorText error={list.error} />
        ) : list.data.length === 0 ? (
          <p className="text-sm text-zinc-500">No holidays planned.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {list.data.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span>
                  <span className="font-medium">{h.date}</span>{' '}
                  <span className="text-zinc-500">{WEEKDAY_NAMES[isoWeekday(h.date)]}</span> ·{' '}
                  {h.reason} <Badge>{h.slot ? `${SLOT_LABEL[h.slot]} only` : 'All day'}</Badge>
                </span>
                <ConfirmButton disabled={remove.isPending} onConfirm={() => remove.mutate(h.id)}>
                  Remove
                </ConfirmButton>
              </li>
            ))}
          </ul>
        )}
        <ErrorText error={remove.error} />
      </Card>
    </div>
  );
}
