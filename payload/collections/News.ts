import type { CollectionConfig } from 'payload';
import { isEditorial } from '../access/roles';
import { relationship, slugField, sourceFields } from './shared';

export const News: CollectionConfig = {
  slug: 'news',
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
    slugField,
    { name: 'body', type: 'richText' },
    relationship('author', 'users'),
    relationship('image', 'media'),
    { name: 'publishedAt', type: 'date' },
  ],
};
