import type { CollectionConfig } from 'payload';
import { relationship, sourceFields } from './shared';

export const PlayerAppearances: CollectionConfig = {
  slug: 'player-appearances',
  admin: {
    useAsTitle: 'player',
    defaultColumns: ['match', 'player', 'started', 'minutes'],
  },
  fields: [
    ...sourceFields,
    relationship('match', 'matches'),
    relationship('player', 'players'),
    {
      name: 'started',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'minutes',
      type: 'number',
      min: 0,
      max: 120,
      defaultValue: 0,
    },
    {
      name: 'actualAttendance',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description:
          'Organizer-confirmed attendance used for official appearance statistics.',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
    },
  ],
};
