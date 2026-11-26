import type { CollectionConfig } from 'payload';
import {
  allowEditorialOwnerOrAdmin,
  createCollectionAccess,
  hideFromAdminUnlessRoles,
  isEditorial,
} from '../access/roles';
import { immutableOwnerField } from './shared';

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    useAsTitle: 'filename',
    hidden: hideFromAdminUnlessRoles(['administrator', 'editor']),
  },
  access: createCollectionAccess({
    read: isEditorial,
    create: isEditorial,
    update: allowEditorialOwnerOrAdmin('uploadedBy'),
    delete: allowEditorialOwnerOrAdmin('uploadedBy'),
  }),
  upload: {
    mimeTypes: ['image/*', 'application/pdf', 'video/*'],
    pasteURL: false,
  },
  fields: [
    { name: 'alt', type: 'text' },
    { name: 'legacyFileId', type: 'number' },
    immutableOwnerField('uploadedBy'),
  ],
};
