import type { CollectionConfig } from 'payload';
import { isEditorial } from '../access/roles';
import { relationship, sourceFields } from './shared';

export const Albums: CollectionConfig = {
  slug: 'albums',
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
    { name: 'eventDate', type: 'date' },
    relationship('match', 'matches'),
    relationship('photographer', 'users'),
    relationship('photos', 'media', { hasMany: true }),
  ],
};
