import type { CollectionConfig } from 'payload';
import { relationship, sourceFields } from './shared';

export const Matches: CollectionConfig = {
  slug: 'matches',
  admin: { useAsTitle: 'title' },
  fields: [
    ...sourceFields,
    { name: 'title', type: 'text', required: true },
    { name: 'date', type: 'date' },
    relationship('season', 'seasons', { hasMany: false }),
  ],
};
