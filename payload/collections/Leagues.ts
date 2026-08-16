import type { CollectionConfig } from 'payload';
import { isEditorial } from '../access/roles';
import { slugField, sourceFields } from './shared';

export const Leagues: CollectionConfig = {
  slug: 'leagues',
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
    { name: 'type', type: 'text' },
    { name: 'website', type: 'text' },
  ],
};
