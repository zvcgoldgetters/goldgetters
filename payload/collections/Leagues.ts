import type { CollectionConfig } from 'payload';
import {
  allowRoles,
  createCollectionAccess,
  hideFromAdminUnlessRoles,
  isDirector,
} from '../access/roles';
import { slugField } from './shared';

export const Leagues: CollectionConfig = {
  slug: 'leagues',
  admin: {
    useAsTitle: 'name',
    hidden: hideFromAdminUnlessRoles(['administrator', 'director']),
  },
  access: createCollectionAccess({
    read: allowRoles(['administrator', 'director', 'team-manager']),
    create: isDirector,
    update: isDirector,
    delete: isDirector,
  }),
  fields: [
    { name: 'name', type: 'text', required: true },
    slugField('name'),
    { name: 'type', type: 'text' },
    { name: 'website', type: 'text' },
  ],
};
