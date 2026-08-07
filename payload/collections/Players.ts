import type { CollectionConfig } from 'payload';
import { relationship, sourceFields } from './shared';

export const Players: CollectionConfig = {
  slug: 'players',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'team', 'status'] },
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
