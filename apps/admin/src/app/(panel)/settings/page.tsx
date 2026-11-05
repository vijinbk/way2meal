'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type SettingKey, type Settings, settingSchemas } from '@way2meal/shared';
import { type ReactNode, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  ErrorText,
  Field,
  Input,
  Loading,
  PageHeader,
  Textarea,
} from '@/components/ui';
import { api } from '@/lib/api';
import { WEEKDAY_NAMES } from '@/lib/types';

/** One card per setting key; each saves independently and is validated with the API's schema. */
function SettingCard<K extends SettingKey>({
  settingKey,
  title,
  children,
  toValue,
}: {
  settingKey: K;
  title: string;
  children: ReactNode;
  toValue: () => unknown;
}) {
  const qc = useQueryClient();
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const save = useMutation({
    mutationFn: (value: unknown) =>
      api(`/admin/settings/${settingKey}`, { method: 'PUT', body: { value } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['/admin/settings'] });
      void qc.invalidateQueries({ queryKey: ['/menu'] });
      setSaved(true);
    },
  });

  const submit = () => {
    setError(null);
    setSaved(false);
    try {
      const value = toValue();
      const parsed = settingSchemas[settingKey].safeParse(value);
      if (!parsed.success)
        throw new Error(
          parsed.error.issues.map((i) => `${i.path.join('.') || title}: ${i.message}`).join('; '),
        );
      save.mutate(parsed.data);
    } catch (e) {
      setError(e);
    }
  };

  return (
    <Card title={title} actions={saved && <Badge tone="green">Saved</Badge>}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {children}
        <ErrorText error={error ?? save.error} />
        <div>
          <Button type="submit" size="sm" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

const intOrNull = (label: string, v: string) => {
  if (v.trim() === '') return null;
  if (!/^\d+$/.test(v.trim())) throw new Error(`${label}: enter a whole number or leave empty`);
  return Number(v);
};

function SettingsForms({ s }: { s: Settings }) {
  const [cutoffs, setCutoffs] = useState(s.cutoffs);
  const [weekdays, setWeekdays] = useState(s.serviceWeekdays);
  const [daysAhead, setDaysAhead] = useState(String(s.bookingDaysAhead));
  const [capacity, setCapacity] = useState({
    LUNCH: s.capacity.LUNCH?.toString() ?? '',
    DINNER: s.capacity.DINNER?.toString() ?? '',
  });
  const [upi, setUpi] = useState({ ...s.upi, qrImageUrl: s.upi.qrImageUrl ?? '' });
  const [whatsapp, setWhatsapp] = useState(s.whatsappNumber);
  const [areas, setAreas] = useState(
    s.deliveryAreas.map((a) => `${a.name}: ${a.pincodes.join(', ')}`).join('\n'),
  );
  const [flags, setFlags] = useState({
    refundsEnabled: s.refundsEnabled,
    carryForwardEnabled: s.carryForwardEnabled,
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SettingCard
        settingKey="cutoffs"
        title="Order cutoff (IST, on the delivery day)"
        toValue={() => cutoffs}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Lunch">
            <Input
              type="time"
              value={cutoffs.LUNCH}
              onChange={(e) => setCutoffs({ ...cutoffs, LUNCH: e.target.value })}
            />
          </Field>
          <Field label="Dinner">
            <Input
              type="time"
              value={cutoffs.DINNER}
              onChange={(e) => setCutoffs({ ...cutoffs, DINNER: e.target.value })}
            />
          </Field>
        </div>
        <p className="text-xs text-zinc-500">
          After the cutoff, customers can&apos;t book, skip or change that day.
        </p>
      </SettingCard>

      <SettingCard
        settingKey="serviceWeekdays"
        title="Service days"
        toValue={() => [...weekdays].sort()}
      >
        <div className="flex flex-wrap gap-4">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <Checkbox
              key={d}
              label={WEEKDAY_NAMES[d]!}
              checked={weekdays.includes(d)}
              onChange={(e) =>
                setWeekdays(e.target.checked ? [...weekdays, d] : weekdays.filter((x) => x !== d))
              }
            />
          ))}
        </div>
      </SettingCard>

      <SettingCard
        settingKey="bookingDaysAhead"
        title="Booking window"
        toValue={() => intOrNull('Days ahead', daysAhead) ?? -1}
      >
        <Field label="Customers can book up to this many days ahead">
          <Input
            inputMode="numeric"
            value={daysAhead}
            onChange={(e) => setDaysAhead(e.target.value)}
          />
        </Field>
      </SettingCard>

      <SettingCard
        settingKey="capacity"
        title="Daily capacity (meals per slot)"

        toValue={() => ({
          LUNCH: intOrNull('Lunch', capacity.LUNCH),
          DINNER: intOrNull('Dinner', capacity.DINNER),
        })}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Lunch" hint="Empty = unlimited">
            <Input
              inputMode="numeric"
              value={capacity.LUNCH}
              onChange={(e) => setCapacity({ ...capacity, LUNCH: e.target.value })}
            />
          </Field>
          <Field label="Dinner" hint="Empty = unlimited">
            <Input
              inputMode="numeric"
              value={capacity.DINNER}
              onChange={(e) => setCapacity({ ...capacity, DINNER: e.target.value })}
            />
          </Field>
        </div>
      </SettingCard>

      <SettingCard
        settingKey="upi"
        title="UPI payment details"

        toValue={() => ({
          vpa: upi.vpa.trim(),
          payeeName: upi.payeeName.trim(),
          qrImageUrl: upi.qrImageUrl.trim() || null,
        })}
      >
        {!s.upi.vpa && <Badge tone="amber">Customers can&apos;t pay until a UPI ID is set</Badge>}
        <Field label="UPI ID">
          <Input
            placeholder="way2meal@okaxis"
            value={upi.vpa}
            onChange={(e) => setUpi({ ...upi, vpa: e.target.value })}
          />
        </Field>
        <Field label="Payee name">
          <Input
            value={upi.payeeName}
            onChange={(e) => setUpi({ ...upi, payeeName: e.target.value })}
          />
        </Field>
        <Field label="QR image URL">
          <Input
            type="url"
            value={upi.qrImageUrl}
            onChange={(e) => setUpi({ ...upi, qrImageUrl: e.target.value })}
          />
        </Field>
      </SettingCard>

      <SettingCard
        settingKey="whatsappNumber"
        title="WhatsApp support number"
        toValue={() => whatsapp.trim()}
      >
        <Field label="Number with country code" hint="Used for the app's “Chat on WhatsApp” button">
          <Input
            inputMode="tel"
            placeholder="+91 98765 43210"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
          />
        </Field>
      </SettingCard>

      <SettingCard
        settingKey="deliveryAreas"
        title="Delivery areas"

        toValue={() =>
          areas
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
              const [name, pins = ''] = line.split(':');
              return {
                name: (name ?? '').trim(),
                pincodes: pins
                  .split(',')
                  .map((p) => p.trim())
                  .filter(Boolean),
              };
            })
        }
      >
        <Field label="One area per line: Area name: pincode, pincode">
          <Textarea
            rows={5}
            placeholder={'Kakkanad: 682030, 682037\nEdappally: 682024'}
            value={areas}
            onChange={(e) => setAreas(e.target.value)}
          />
        </Field>
      </SettingCard>

      <Card title="Policies">
        <div className="flex flex-col gap-3">
          <PolicyToggle
            settingKey="refundsEnabled"
            label="Refunds enabled"
            value={flags.refundsEnabled}
            onChange={(v) => setFlags({ ...flags, refundsEnabled: v })}
          />
          <PolicyToggle
            settingKey="carryForwardEnabled"
            label="Carry forward skipped meals"
            value={flags.carryForwardEnabled}
            onChange={(v) => setFlags({ ...flags, carryForwardEnabled: v })}
          />
        </div>
      </Card>
    </div>
  );
}

function PolicyToggle({
  settingKey,
  label,
  value,
  onChange,
}: {
  settingKey: 'refundsEnabled' | 'carryForwardEnabled';
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: (v: boolean) =>
      api(`/admin/settings/${settingKey}`, { method: 'PUT', body: { value: v } }),
    onSuccess: (_d, v) => {
      onChange(v);
      void qc.invalidateQueries({ queryKey: ['/admin/settings'] });
    },
  });
  return (
    <div>
      <Checkbox
        label={label}
        checked={value}
        disabled={save.isPending}
        onChange={(e) => save.mutate(e.target.checked)}
      />
      <ErrorText error={save.error} />
    </div>
  );
}

export default function SettingsPage() {
  const settings = useQuery({
    queryKey: ['/admin/settings'],
    queryFn: () => api<Settings>('/admin/settings'),
  });
  return (
    <>
      <PageHeader
        title="Settings"
        description="Kitchen-wide rules. Every change is recorded in the audit log."
      />
      {settings.isPending ? (
        <Loading />
      ) : settings.error ? (
        <ErrorText error={settings.error} />
      ) : (
        <SettingsForms s={settings.data} />
      )}
    </>
  );
}
