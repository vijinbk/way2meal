'use client';

import { flavourCreateSchema, flavourUpdateSchema } from '@way2meal/shared';
import { EntityManager } from '@/components/entity-manager';
import { Badge, PageHeader } from '@/components/ui';
import type { Flavour } from '@/lib/types';

export default function FlavoursPage() {
  return (
    <>
      <PageHeader
        title="Flavours"
        description="Chicken flavours customers can choose for dinner. With none chosen, the kitchen decides."
      />
      <EntityManager<Flavour>
        noun="flavour"
        path="/admin/flavours"
        createSchema={flavourCreateSchema}
        updateSchema={flavourUpdateSchema}
        fields={[
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'sortOrder', label: 'Display order', type: 'int' },
          { key: 'imageUrl', label: 'Photo URL', type: 'url', nullable: true },
          { key: 'active', label: 'Active (visible in the app)', type: 'checkbox' },
        ]}
        columns={[
          { label: 'Order', render: (f) => f.sortOrder },
          { label: 'Name', render: (f) => f.name },
          {
            label: 'Status',
            render: (f) =>
              f.active ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>,
          },
        ]}
      />
    </>
  );
}
