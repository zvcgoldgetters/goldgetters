import type { CollectionConfig } from 'payload';
import { sourceFields } from './shared';

export const SourceRecords: CollectionConfig = {
  slug: 'source-records',
  admin: {
    useAsTitle: 'sourceId',
    defaultColumns: ['sourceId', 'sourceType', 'targetCollection'],
  },
  fields: [
    ...sourceFields,
    { name: 'targetCollection', type: 'text', required: true },
    { name: 'targetId', type: 'text', required: true },
    { name: 'importRun', type: 'text' },
  ],
};
