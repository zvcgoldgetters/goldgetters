import type { CollectionConfig } from 'payload';
import { isEditorial } from '../access/roles';
import { relationship, slugField, sourceFields } from './shared';

export const Teams: CollectionConfig = {
  slug: 'teams',
  admin: { useAsTitle: 'name' },
  access: {
    read: () => true,
    create: isEditorial,
    update: isEditorial,
    delete: isEditorial,
  },
  fields: [
    ...sourceFields,
    { name: 'name', type: 'text', required: true },
    slugField,
    relationship('league', 'leagues'),
    relationship('players', 'players', { hasMany: true }),
    { name: 'contactEmail', type: 'email' },
    { name: 'contactPhone', type: 'text' },
    { name: 'website', type: 'text' },
  ],
};
