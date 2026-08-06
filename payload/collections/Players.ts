import type { CollectionConfig } from 'payload';
import { sourceFields } from './shared';

export const Players: CollectionConfig = {
  slug: 'players',
  admin: { useAsTitle: 'name' },
  fields: [...sourceFields, { name: 'name', type: 'text', required: true }],
};
