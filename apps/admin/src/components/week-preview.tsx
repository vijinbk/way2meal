'use client';

import { useQuery } from '@tanstack/react-query';
import { type ResolvedMenu, addDays, istDateOf, isoWeekday } from '@way2meal/shared';
import { useState } from 'react';
import { api } from '@/lib/api';
import { SLOT_LABEL, WEEKDAY_NAMES } from '@/lib/types';
import { Badge, Button, Card, ErrorText, Loading } from './ui';

const mondayOf = (date: string) => addDays(date, 1 - isoWeekday(date));

/** What customers will see for a week: overrides, templates and holidays resolved by the API. */
export function WeekPreview() {
  const [monday, setMonday] = useState(() => mondayOf(istDateOf(new Date())));
  const sunday = addDays(monday, 6);
  const menu = useQuery({
    queryKey: ['/menu', monday],
    queryFn: () => api<ResolvedMenu[]>(`/menu?from=${monday}&to=${sunday}`),
  });
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  return (
    <Card
      title={`Preview: week of ${monday}`}
      actions={
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setMonday(addDays(monday, -7))}>
            ← Previous
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setMonday(mondayOf(istDateOf(new Date())))}
          >
            This week
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setMonday(addDays(monday, 7))}>
            Next →
          </Button>
        </div>
      }
    >
      {menu.isPending ? (
        <Loading />
      ) : menu.error ? (
        <ErrorText error={menu.error} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {days.map((date) => (
            <div key={date} className="rounded-md border border-zinc-200 p-3">
              <p className="mb-2 text-sm font-semibold">
                {WEEKDAY_NAMES[isoWeekday(date)]}{' '}
                <span className="font-normal text-zinc-500">{date}</span>
              </p>
              {menu.data
                .filter((m) => m.date === date)
                .map((m) => (
                  <div key={m.slot} className="mb-2 text-sm last:mb-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{SLOT_LABEL[m.slot]}</span>
                      {m.source === 'OVERRIDE' && <Badge tone="amber">Special</Badge>}
                      {m.holiday && <Badge tone="red">Holiday: {m.holiday.reason}</Badge>}
                      {!m.isServiceDay && !m.holiday && <Badge>Closed</Badge>}
                    </div>
                    {m.items.length > 0 ? (
                      <p className="text-zinc-600">{m.items.map((i) => i.name).join(', ')}</p>
                    ) : (
                      m.isServiceDay && <p className="text-amber-700">No menu set</p>
                    )}
                    {m.note && <p className="text-xs text-amber-800">{m.note}</p>}
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
