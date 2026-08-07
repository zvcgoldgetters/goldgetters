import type { CollectionConfig } from 'payload';
import { relationship, sourceFields } from './shared';

export const Reports: CollectionConfig = {
  slug: 'reports',
  admin: { useAsTitle: 'title' },
  fields: [
    ...sourceFields,
    { name: 'title', type: 'text', required: true },
    relationship('match', 'matches'),
    { name: 'body', type: 'richText' },
    relationship('author', 'users'),
  ],
};
