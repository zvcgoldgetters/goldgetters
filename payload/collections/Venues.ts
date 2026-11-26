import type { CollectionConfig } from 'payload';
import {
  allowRoles,
  createCollectionAccess,
  hideFromAdminUnlessRoles,
  isTeamManager,
} from '../access/roles';
import { slugField } from './shared';

export const Venues: CollectionConfig = {
  slug: 'venues',
  admin: {
    useAsTitle: 'name',
    hidden: hideFromAdminUnlessRoles(['administrator', 'team-manager']),
  },
  access: createCollectionAccess({
    read: allowRoles(['administrator', 'director', 'team-manager', 'member']),
    create: isTeamManager,
    update: isTeamManager,
    delete: isTeamManager,
  }),
  fields: [
    { name: 'name', type: 'text', required: true },
    slugField('name'),
    { name: 'address', type: 'textarea' },
    { name: 'mapUrl', type: 'text' },
    { name: 'legacyVenueId', type: 'number' },
  ],
};
