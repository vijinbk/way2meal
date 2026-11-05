'use client';

import { menuItemCreateSchema, menuItemUpdateSchema } from '@way2meal/shared';
import { EntityManager } from '@/components/entity-manager';
import { Badge, PageHeader } from '@/components/ui';
import type { MenuItem } from '@/lib/types';

export default function MenuItemsPage() {
  return (
    <>
      <PageHeader
        title="Menu items"
        description="The dishes that make up each meal. A deactivated item disappears from every menu that uses it."
      />
      <EntityManager<MenuItem>
        noun="menu item"
        path="/admin/menu-items"
        createSchema={menuItemCreateSchema}
        updateSchema={menuItemUpdateSchema}
        fields={[
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'proteinG', label: 'Protein (g)', type: 'int', nullable: true },
          { key: 'kcalMin', label: 'kcal min', type: 'int', nullable: true },
          { key: 'kcalMax', label: 'kcal max', type: 'int', nullable: true },
          { key: 'description', label: 'Description', type: 'textarea', nullable: true },
          { key: 'imageUrl', label: 'Photo URL', type: 'url', nullable: true },
          { key: 'active', label: 'Active', type: 'checkbox' },
        ]}
        columns={[
          { label: 'Name', render: (i) => i.name },
          {
            label: 'Description',
            render: (i) => <span className="text-zinc-600">{i.description}</span>,
          },
          {
            label: 'Status',
            render: (i) =>
              i.active ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>,
          },
        ]}
      />
    </>
  );
}
