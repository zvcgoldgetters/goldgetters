import type { CollectionConfig } from 'payload';
import { isAdministrator } from '../access/roles';
import { sourceFields } from './shared';

export const SourceRecords: CollectionConfig = {
  slug: 'source-records',
  admin: {
    useAsTitle: 'sourceId',
    defaultColumns: ['sourceId', 'sourceType', 'targetCollection'],
  },
  access: {
    read: isAdministrator,
    create: isAdministrator,
    update: isAdministrator,
    delete: isAdministrator,
  },
  fields: [
    ...sourceFields,
    { name: 'targetCollection', type: 'text', required: true },
    { name: 'targetId', type: 'text', required: true },
    { name: 'importRun', type: 'text' },
  ],
};
