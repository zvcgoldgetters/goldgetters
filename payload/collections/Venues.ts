import type { CollectionConfig } from 'payload';
import { slugField, sourceFields } from './shared';

export const Venues: CollectionConfig = {
  slug: 'venues',
  admin: { useAsTitle: 'name' },
  fields: [
    ...sourceFields,
    { name: 'name', type: 'text', required: true },
    slugField,
    { name: 'address', type: 'textarea' },
    { name: 'mapUrl', type: 'text' },
    { name: 'legacyVenueId', type: 'number' },
  ],
};
