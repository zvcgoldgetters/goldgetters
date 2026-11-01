import type { CollectionConfig } from 'payload';
import { isEditorial, isPublished } from '../access/roles';
import { relationship, sourceFields } from './shared';

export const Previews: CollectionConfig = {
  slug: 'previews',
  versions: { drafts: true },
  admin: { useAsTitle: 'title' },
  access: {
    read: isPublished,
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
