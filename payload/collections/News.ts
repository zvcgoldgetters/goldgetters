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
  slugField,
} from './shared';

export const News: CollectionConfig = {
  slug: 'news',
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
    slugField(),
    { name: 'body', type: 'richText' },
    immutableOwnerField(),
    displayAttributionField('author'),
    relationship('image', 'media'),
    { name: 'publishedAt', type: 'date' },
  ],
};
