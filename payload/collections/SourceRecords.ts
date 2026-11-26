import type { CollectionConfig, FieldHook } from 'payload';
import {
  createCollectionAccess,
  hideFromAdminUnlessRoles,
  isAdministrator,
} from '../access/roles';

const normalizeEmptyString: FieldHook = ({ value }): unknown => {
  const rawValue: unknown = value;
  if (typeof rawValue === 'string' && rawValue.trim().length === 0) {
    return null;
  }

  return rawValue;
};

export const SourceRecords: CollectionConfig = {
  slug: 'source-records',
  admin: {
    useAsTitle: 'sourceId',
    defaultColumns: ['sourceId', 'sourceType', 'targetCollection'],
    hidden: hideFromAdminUnlessRoles(['administrator']),
  },
  indexes: [{ fields: ['sourceType', 'sourceId'], unique: true }],
  access: createCollectionAccess({
    read: isAdministrator,
    create: isAdministrator,
    update: isAdministrator,
    delete: isAdministrator,
  }),
  fields: [
    {
      name: 'sourceId',
      type: 'text',
      required: true,
      hooks: { beforeValidate: [normalizeEmptyString] },
      admin: {
        description:
          'Stable identifier from the Drupal source export (unique per sourceType).',
      },
    },
    {
      name: 'sourceType',
      type: 'text',
      required: true,
      hooks: { beforeValidate: [normalizeEmptyString] },
      admin: {
        description:
          'Source record type (for example user, file, or node bundle) combined with sourceId for uniqueness.',
      },
    },
    {
      name: 'sourceUpdatedAt',
      type: 'text',
      hooks: { beforeValidate: [normalizeEmptyString] },
      admin: {
        description:
          'Raw source timestamp preserved from Drupal; normalize it in importer workflows before date-based queries.',
      },
    },
    { name: 'targetCollection', type: 'text', required: true },
    { name: 'targetId', type: 'text', required: true },
    { name: 'importRun', type: 'text' },
  ],
};
