'use client';

import { addOnCreateSchema, addOnUpdateSchema, formatPaise } from '@way2meal/shared';
import { EntityManager } from '@/components/entity-manager';
import { Badge, PageHeader } from '@/components/ui';
import { type AddOn, SLOT_LABEL } from '@/lib/types';

export default function AddOnsPage() {
  return (
    <>
      <PageHeader
        title="Add-ons"
        description="Extras customers can attach to a meal. Always paid separately."
      />
      <EntityManager<AddOn>
        noun="add-on"
        path="/admin/addons"
        createSchema={addOnCreateSchema}
        updateSchema={addOnUpdateSchema}
        fields={[
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'pricePaise', label: 'Price (₹)', type: 'rupees' },
          { key: 'slots', label: 'Available for', type: 'slots' },
          {
            key: 'dailyStock',
            label: 'Daily stock',
            type: 'int',
            nullable: true,
            hint: 'Leave empty for unlimited',
          },
          { key: 'description', label: 'Description', type: 'textarea', nullable: true },
          { key: 'imageUrl', label: 'Photo URL', type: 'url', nullable: true },
          { key: 'active', label: 'Active (visible in the app)', type: 'checkbox' },
        ]}
        columns={[
          { label: 'Name', render: (a) => a.name },
          {
            label: 'Price',
            render: (a) =>
              a.pricePaise === 0 ? (
                <Badge tone="amber">Price not set</Badge>
              ) : (
                formatPaise(a.pricePaise)
              ),
          },
          { label: 'Slots', render: (a) => a.slots.map((s) => SLOT_LABEL[s]).join(', ') },
          { label: 'Daily stock', render: (a) => a.dailyStock ?? 'Unlimited' },
          {
            label: 'Status',
            render: (a) =>
              a.active ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>,
          },
        ]}
      />
    </>
  );
}
