'use client';

import { PLAN_KINDS, formatPaise, planCreateSchema, planUpdateSchema } from '@way2meal/shared';
import { EntityManager } from '@/components/entity-manager';
import { Badge, PageHeader } from '@/components/ui';
import { type Plan, SLOT_LABEL } from '@/lib/types';

const KIND_LABEL: Record<string, string> = {
  TRIAL: 'Trial',
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
};

export default function PlansPage() {
  return (
    <>
      <PageHeader
        title="Plans & pricing"
        description="Price, meal count and skip rules per plan. Changes apply to new purchases; existing subscriptions keep the terms they were bought with."
      />
      <EntityManager<Plan>
        noun="plan"
        path="/admin/plans"
        createSchema={planCreateSchema}
        updateSchema={planUpdateSchema}
        fields={[
          { key: 'name', label: 'Name', type: 'text' },
          {
            key: 'kind',
            label: 'Type',
            type: 'select',
            createOnly: true,
            options: PLAN_KINDS.map((k) => ({ value: k, label: KIND_LABEL[k]! })),
          },
          {
            key: 'slot',
            label: 'Slot',
            type: 'select',
            createOnly: true,
            options: [
              { value: 'LUNCH', label: 'Lunch' },
              { value: 'DINNER', label: 'Dinner' },
            ],
          },
          { key: 'pricePaise', label: 'Price (₹)', type: 'rupees' },
          {
            key: 'mealCount',
            label: 'Meals',
            type: 'int',
            hint: 'Trial and daily plans are always 1 meal',
          },
          { key: 'maxSkips', label: 'Max skips', type: 'int', hint: '0 for trial and daily plans' },
          {
            key: 'validityDays',
            label: 'Validity (days)',
            type: 'int',
            hint: 'All meals, including carried-forward ones, must be delivered within this many days of the start',
          },
          { key: 'sortOrder', label: 'Display order', type: 'int' },
          { key: 'oncePerUser', label: 'Once per phone number', type: 'checkbox' },
          { key: 'active', label: 'Active (visible in the app)', type: 'checkbox' },
        ]}
        columns={[
          { label: 'Name', render: (p) => p.name },
          { label: 'Type', render: (p) => `${KIND_LABEL[p.kind]} · ${SLOT_LABEL[p.slot]}` },
          { label: 'Price', render: (p) => formatPaise(p.pricePaise) },
          { label: 'Meals', render: (p) => p.mealCount },
          { label: 'Skips', render: (p) => p.maxSkips },
          { label: 'Validity', render: (p) => `${p.validityDays} d` },
          {
            label: 'Status',
            render: (p) =>
              p.active ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>,
          },
        ]}
      />
    </>
  );
}
