import type { CollectionConfig } from 'payload';
import { isEditorial } from '../access/roles';
import { relationship, sourceFields } from './shared';

export const Seasons: CollectionConfig = {
  slug: 'seasons',
  admin: { useAsTitle: 'name' },
  access: {
    read: () => true,
    create: isEditorial,
    update: isEditorial,
    delete: isEditorial,
  },
  fields: [
    ...sourceFields,
    { name: 'name', type: 'text', required: true },
    { name: 'period', type: 'text' },
    { name: 'series', type: 'text' },
    relationship('teams', 'teams', { hasMany: true }),
    { name: 'rankingUrl', type: 'text' },
  ],
};
