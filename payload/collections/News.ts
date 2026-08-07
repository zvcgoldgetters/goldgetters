import type { CollectionConfig } from 'payload';
import { relationship, slugField, sourceFields } from './shared';

export const News: CollectionConfig = {
  slug: 'news',
  admin: { useAsTitle: 'title' },
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
