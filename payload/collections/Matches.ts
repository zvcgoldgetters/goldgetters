import type { CollectionConfig } from 'payload';
import {
  createCollectionAccess,
  hasAnyAssignedRole,
  hideFromAdminUnlessRoles,
  isTeamManager,
} from '../access/roles';
import { relationship } from './shared';

export const Matches: CollectionConfig = {
  slug: 'matches',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['date', 'homeTeam', 'awayTeam'],
    hidden: hideFromAdminUnlessRoles(['administrator', 'team-manager']),
  },
  access: createCollectionAccess({
    read: hasAnyAssignedRole,
    create: isTeamManager,
    update: isTeamManager,
    delete: isTeamManager,
  }),
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'date', type: 'date', required: true },
    relationship('season', 'seasons'),
    relationship('league', 'leagues'),
    relationship('homeTeam', 'teams'),
    relationship('awayTeam', 'teams'),
    relationship('venue', 'venues'),
    { name: 'homeScore', type: 'number' },
    { name: 'awayScore', type: 'number' },
    {
      name: 'status',
      type: 'select',
      options: ['scheduled', 'played', 'postponed', 'cancelled'],
      defaultValue: 'scheduled',
    },
  ],
};
