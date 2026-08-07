import type { CollectionConfig } from 'payload';
import { relationship, sourceFields } from './shared';

export const Albums: CollectionConfig = {
  slug: 'albums',
  admin: { useAsTitle: 'title' },
  fields: [
    ...sourceFields,
    { name: 'title', type: 'text', required: true },
    { name: 'eventDate', type: 'date' },
    relationship('match', 'matches'),
    relationship('photographer', 'users'),
    relationship('photos', 'media', { hasMany: true }),
  ],
};
