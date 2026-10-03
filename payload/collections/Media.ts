import type { CollectionConfig } from 'payload';
import { isEditorial } from '../access/roles';
import { sourceFields } from './shared';

export const Media: CollectionConfig = {
  slug: 'media',
  admin: { useAsTitle: 'filename' },
  access: {
    read: () => true,
    create: isEditorial,
    update: isEditorial,
    delete: isEditorial,
  },
  upload: { mimeTypes: ['image/*', 'application/pdf', 'video/*'] },
  fields: [
    ...sourceFields,
    { name: 'alt', type: 'text' },
    { name: 'legacyFileId', type: 'number' },
  ],
};
