import type { CollectionConfig } from 'payload';
import { sourceFields } from './shared';

export const Seasons: CollectionConfig = {
  slug: 'seasons',
  admin: { useAsTitle: 'name' },
  fields: [...sourceFields, { name: 'name', type: 'text', required: true }],
};
