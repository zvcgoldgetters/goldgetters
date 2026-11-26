import type { CollectionConfig } from 'payload';
import {
  allowRoles,
  createCollectionAccess,
  hideFromAdminUnlessRoles,
  isTeamManager,
} from '../access/roles';
import { relationship } from './shared';

export const TeamEvents: CollectionConfig = {
  slug: 'team-events',
  admin: {
    useAsTitle: 'title',
    hidden: hideFromAdminUnlessRoles([
      'administrator',
      'team-manager',
      'member',
    ]),
  },
  access: createCollectionAccess({
    read: allowRoles(['administrator', 'team-manager', 'member']),
    create: isTeamManager,
    update: isTeamManager,
    delete: isTeamManager,
  }),
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'date', type: 'date', required: true },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: ['training', 'tournament', 'other'],
    },
    relationship('team', 'teams'),
    relationship('venue', 'venues'),
    { name: 'description', type: 'textarea' },
  ],
};
