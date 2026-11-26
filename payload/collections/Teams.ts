import type { CollectionConfig } from 'payload';
import {
  allowRoles,
  allowRolesField,
  createCollectionAccess,
  hideFromAdminUnlessRoles,
  isTeamManager,
} from '../access/roles';
import { relationship, slugField } from './shared';

export const Teams: CollectionConfig = {
  slug: 'teams',
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
    relationship('league', 'leagues'),
    relationship('players', 'players', { hasMany: true }),
    {
      name: 'contactEmail',
      type: 'email',
      access: {
        read: allowRolesField(['administrator', 'team-manager']),
      },
    },
    {
      name: 'contactPhone',
      type: 'text',
      access: {
        read: allowRolesField(['administrator', 'team-manager']),
      },
    },
    { name: 'website', type: 'text' },
  ],
};
