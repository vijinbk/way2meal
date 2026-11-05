'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SLOTS, rupeesToPaise } from '@way2meal/shared';
import { type ReactNode, useState } from 'react';
import type { ZodType } from 'zod';
import { api } from '@/lib/api';
import { SLOT_LABEL } from '@/lib/types';
import {
  Button,
  Card,
  Checkbox,
  ErrorText,
  Field,
  Input,
  Loading,
  Select,
  TableWrap,
  Textarea,
  td,
  th,
} from './ui';

export type FieldType =
  'text' | 'textarea' | 'url' | 'int' | 'rupees' | 'checkbox' | 'slots' | 'select';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  /** Empty input becomes null instead of failing validation. */
  nullable?: boolean;
  /** Shown when creating, hidden (and not sent) when editing. */
  createOnly?: boolean;
  options?: { value: string; label: string }[];
  hint?: string;
}

export interface Column<T> {
  label: string;
  render: (row: T) => ReactNode;
}

type FormValue = string | boolean | string[];
type FormState = Record<string, FormValue>;

function toForm(fields: FieldDef[], row: Record<string, unknown> | null): FormState {
  const state: FormState = {};
  for (const f of fields) {
    const v = row?.[f.key];
    if (f.type === 'checkbox') state[f.key] = row ? Boolean(v) : f.key === 'active';
    else if (f.type === 'slots') state[f.key] = Array.isArray(v) ? (v as string[]) : [...SLOTS];
    else if (f.type === 'rupees') state[f.key] = typeof v === 'number' ? (v / 100).toString() : '';
    else if (f.type === 'select')
      state[f.key] = typeof v === 'string' ? v : (f.options?.[0]?.value ?? '');
    else state[f.key] = v == null ? '' : String(v);
  }
  return state;
}

/** Converts form strings into the API's types. Throws with a field-specific message on bad input. */
function toPayload(
  fields: FieldDef[],
  state: FormState,
  editing: boolean,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (editing && f.createOnly) continue;
    const v = state[f.key];
    switch (f.type) {
      case 'checkbox':
      case 'slots':
        out[f.key] = v;
        break;
      case 'select':
        out[f.key] = v;
        break;
      case 'int': {
        const s = String(v).trim();
        if (s === '') {
          if (f.nullable) out[f.key] = null;
          break;
        }
        if (!/^\d+$/.test(s)) throw new Error(`${f.label}: enter a whole number`);
        out[f.key] = Number(s);
        break;
      }
      case 'rupees': {
        const s = String(v).trim();
        try {
          out[f.key] = rupeesToPaise(s);
        } catch {
          throw new Error(`${f.label}: enter an amount in rupees, e.g. 990 or 41.50`);
        }
        break;
      }
      default: {
        const s = String(v).trim();
        if (s === '' && f.nullable) out[f.key] = null;
        else if (s !== '') out[f.key] = s;
      }
    }
  }
  return out;
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: FormValue;
  onChange: (v: FormValue) => void;
}) {
  switch (field.type) {
    case 'checkbox':
      return (
        <Checkbox
          label={field.label}
          checked={value as boolean}
          onChange={(e) => onChange(e.target.checked)}
        />
      );
    case 'slots':
      return (
        <Field label={field.label} hint={field.hint}>
          <div className="flex h-10 items-center gap-4">
            {SLOTS.map((slot) => (
              <Checkbox
                key={slot}
                label={SLOT_LABEL[slot]}
                checked={(value as string[]).includes(slot)}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? [...(value as string[]), slot]
                      : (value as string[]).filter((s) => s !== slot),
                  )
                }
              />
            ))}
          </div>
        </Field>
      );
    case 'select':
      return (
        <Field label={field.label} hint={field.hint}>
          <Select value={value as string} onChange={(e) => onChange(e.target.value)}>
            {field.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      );
    case 'textarea':
      return (
        <Field label={field.label} hint={field.hint}>
          <Textarea value={value as string} onChange={(e) => onChange(e.target.value)} />
        </Field>
      );
    default:
      return (
        <Field label={field.label} hint={field.hint}>
          <Input
            value={value as string}
            inputMode={field.type === 'int' || field.type === 'rupees' ? 'decimal' : undefined}
            type={field.type === 'url' ? 'url' : 'text'}
            placeholder={field.type === 'rupees' ? '₹' : undefined}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      );
  }
}

/**
 * List + create + edit for a catalogue entity. Inputs are converted to API
 * types (rupees → paise) and validated with the same Zod schema the API uses.
 */
export function EntityManager<T extends { id: string; active?: boolean }>({
  noun,
  path,
  fields,
  columns,
  createSchema,
  updateSchema,
}: {
  noun: string;
  path: string;
  fields: FieldDef[];
  columns: Column<T>[];
  createSchema: ZodType;
  updateSchema: ZodType;
}) {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: [path], queryFn: () => api<T[]>(path) });
  const [editing, setEditing] = useState<T | 'new' | null>(null);
  const [form, setForm] = useState<FormState>({});
  const [formError, setFormError] = useState<unknown>(null);

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editing === 'new'
        ? api(path, { method: 'POST', body: payload })
        : api(`${path}/${(editing as T).id}`, { method: 'PATCH', body: payload }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [path] });
      setEditing(null);
    },
  });

  const toggle = useMutation({
    mutationFn: (row: T) =>
      api(`${path}/${row.id}`, { method: 'PATCH', body: { active: !row.active } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: [path] }),
  });

  const open = (row: T | 'new') => {
    setEditing(row);
    setForm(toForm(fields, row === 'new' ? null : (row as unknown as Record<string, unknown>)));
    setFormError(null);
    save.reset();
  };

  const submit = () => {
    setFormError(null);
    try {
      const isEdit = editing !== 'new';
      const payload = toPayload(fields, form, isEdit);
      const parsed = (isEdit ? updateSchema : createSchema).safeParse(payload);
      if (!parsed.success) {
        setFormError(
          new Error(
            parsed.error.issues.map((i) => `${i.path.join('.') || noun}: ${i.message}`).join('; '),
          ),
        );
        return;
      }
      save.mutate(payload);
    } catch (e) {
      setFormError(e);
    }
  };

  const visibleFields = fields.filter((f) => !(editing !== 'new' && f.createOnly));

  return (
    <div className="flex flex-col gap-4">
      {editing ? (
        <Card title={editing === 'new' ? `New ${noun}` : `Edit ${noun}`}>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {visibleFields.map((f) => (
                <div key={f.key} className={f.type === 'textarea' ? 'sm:col-span-2' : undefined}>
                  <FieldInput
                    field={f}
                    value={form[f.key] ?? ''}
                    onChange={(v) => setForm((s) => ({ ...s, [f.key]: v }))}
                  />
                </div>
              ))}
            </div>
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
      ) : (
        <div>
          <Button onClick={() => open('new')}>+ New {noun}</Button>
        </div>
      )}

      <Card>
        {list.isPending ? (
          <Loading />
        ) : list.error ? (
          <ErrorText error={list.error} />
        ) : (
          <TableWrap>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.label} className={th}>
                      {c.label}
                    </th>
                  ))}
                  <th className={th} />
                </tr>
              </thead>
              <tbody>
                {list.data.map((row) => (
                  <tr key={row.id} className={row.active === false ? 'text-zinc-400' : undefined}>
                    {columns.map((c) => (
                      <td key={c.label} className={td}>
                        {c.render(row)}
                      </td>
                    ))}
                    <td className={`${td} whitespace-nowrap text-right`}>
                      <Button size="sm" variant="ghost" onClick={() => open(row)}>
                        Edit
                      </Button>
                      {row.active !== undefined && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={toggle.isPending}
                          onClick={() => toggle.mutate(row)}
                        >
                          {row.active ? 'Deactivate' : 'Activate'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
        <ErrorText error={toggle.error} />
      </Card>
    </div>
  );
}
