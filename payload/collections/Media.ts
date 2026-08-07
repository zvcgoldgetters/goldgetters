import type { CollectionConfig } from 'payload';
import { sourceFields } from './shared';

export const Media: CollectionConfig = {
  slug: 'media',
  admin: { useAsTitle: 'filename' },
  upload: { mimeTypes: ['image/*', 'application/pdf', 'video/*'] },
  fields: [
    ...sourceFields,
    { name: 'alt', type: 'text' },
    { name: 'legacyFileId', type: 'number' },
  ],
};
