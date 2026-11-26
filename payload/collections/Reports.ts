import type { CollectionConfig } from 'payload';
import {
  allowEditorialOwnerOrAdmin,
  createCollectionAccess,
  hideFromAdminUnlessRoles,
  isEditorial,
} from '../access/roles';
import {
  displayAttributionField,
  immutableOwnerField,
  relationship,
} from './shared';

export const Reports: CollectionConfig = {
  slug: 'reports',
  versions: { drafts: true },
  admin: {
    useAsTitle: 'title',
    hidden: hideFromAdminUnlessRoles(['administrator', 'editor']),
  },
  access: createCollectionAccess({
    read: isEditorial,
    create: isEditorial,
    update: allowEditorialOwnerOrAdmin('owner'),
    delete: allowEditorialOwnerOrAdmin('owner'),
    readVersions: isEditorial,
  }),
  fields: [
    { name: 'title', type: 'text', required: true },
    relationship('match', 'matches'),
    { name: 'body', type: 'richText' },
    immutableOwnerField(),
    displayAttributionField('author'),
  ],
};
