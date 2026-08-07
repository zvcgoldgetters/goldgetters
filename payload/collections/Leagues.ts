import type { CollectionConfig } from 'payload';
import { slugField, sourceFields } from './shared';

export const Leagues: CollectionConfig = {
  slug: 'leagues',
  admin: { useAsTitle: 'name' },
  fields: [
    ...sourceFields,
    { name: 'name', type: 'text', required: true },
    slugField,
    { name: 'type', type: 'text' },
    { name: 'website', type: 'text' },
  ],
};
