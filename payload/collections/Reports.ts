import type { CollectionConfig } from 'payload';
import { isEditorial } from '../access/roles';
import { relationship, sourceFields } from './shared';

export const Reports: CollectionConfig = {
  slug: 'reports',
  admin: { useAsTitle: 'title' },
  access: {
    read: () => true,
    create: isEditorial,
    update: isEditorial,
    delete: isEditorial,
  },
  fields: [
    ...sourceFields,
    { name: 'title', type: 'text', required: true },
    relationship('match', 'matches'),
    { name: 'body', type: 'richText' },
    relationship('author', 'users'),
  ],
};
