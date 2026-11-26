import type { GlobalConfig } from 'payload';
import { createGlobalAccess, isDirector } from '../access/roles';
import { relationship } from '../collections/shared';

export const clubSettings: GlobalConfig = {
  slug: 'club-settings',
  access: createGlobalAccess({
    read: isDirector,
    update: isDirector,
  }),
  label: 'Club settings',
  fields: [
    {
      name: 'clubName',
      type: 'text',
      required: true,
      defaultValue: 'Goldgetters',
    },
    { name: 'contactEmail', type: 'email' },
    { name: 'contactPhone', type: 'text' },
    relationship('currentTeam', 'teams'),
    relationship('currentSeason', 'seasons'),
    relationship('currentLeague', 'leagues'),
    relationship('defaultVenue', 'venues'),
    { name: 'timezone', type: 'text', defaultValue: 'Europe/Brussels' },
  ],
};
