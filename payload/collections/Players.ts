import type { CollectionConfig } from 'payload';
import { isEditorial } from '../access/roles';
import { relationship, sourceFields } from './shared';

export const Players: CollectionConfig = {
  slug: 'players',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'team', 'status'] },
  access: {
    read: () => true,
    create: isEditorial,
    update: isEditorial,
    delete: isEditorial,
  },
  fields: [
    ...sourceFields,
    { name: 'name', type: 'text', required: true },
    relationship('user', 'users', { hasMany: false }),
    relationship('team', 'teams'),
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: ['active', 'reserve', 'inactive', 'historical'],
    },
    { name: 'shirtNumber', type: 'number' },
  ],
};
