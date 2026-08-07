import type { CollectionConfig } from 'payload';
import { relationship, sourceFields } from './shared';

export const Seasons: CollectionConfig = {
  slug: 'seasons',
  admin: { useAsTitle: 'name' },
  fields: [
    ...sourceFields,
    { name: 'name', type: 'text', required: true },
    { name: 'period', type: 'text' },
    { name: 'series', type: 'text' },
    relationship('teams', 'teams', { hasMany: true }),
    { name: 'rankingUrl', type: 'text' },
  ],
};
