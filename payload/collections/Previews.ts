import type { CollectionConfig } from 'payload';
import { isEditorial } from '../access/roles';
import { relationship, sourceFields } from './shared';

export const Previews: CollectionConfig = {
  slug: 'previews',
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
