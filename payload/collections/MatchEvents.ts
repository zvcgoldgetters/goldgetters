import type { CollectionConfig } from 'payload';
import { relationship, sourceFields } from './shared';

export const MatchEvents: CollectionConfig = {
  slug: 'match-events',
  admin: {
    useAsTitle: 'eventType',
    defaultColumns: ['match', 'eventType', 'player', 'minute'],
  },
  fields: [
    ...sourceFields,
    relationship('match', 'matches'),
    {
      name: 'eventType',
      type: 'select',
      required: true,
      options: [
        { label: 'Goal', value: 'goal' },
        { label: 'Yellow card', value: 'yellow-card' },
        { label: 'Red card', value: 'red-card' },
      ],
    },
    relationship('player', 'players', { hasMany: false }),
    relationship('assistPlayer', 'players', { hasMany: false }),
    {
      name: 'ownGoal',
      type: 'select',
      defaultValue: 'none',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Goldgetters', value: 'goldgetters' },
        { label: 'Opponent', value: 'opponent' },
      ],
    },
    {
      name: 'minute',
      type: 'number',
      min: 0,
      max: 90,
    },
    {
      name: 'notes',
      type: 'textarea',
    },
  ],
};
