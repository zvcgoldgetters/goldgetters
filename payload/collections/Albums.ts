import type { CollectionConfig } from 'payload';
import { isEditorial, isPublished } from '../access/roles';
import { relationship, sourceFields } from './shared';

export const Albums: CollectionConfig = {
  slug: 'albums',
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
    { name: 'eventDate', type: 'date' },
    relationship('match', 'matches'),
    relationship('photographer', 'users'),
    relationship('photos', 'media', { hasMany: true }),
  ],
};
