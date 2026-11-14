import type { CollectionConfig } from 'payload';
import { isOrganizer } from '../access/roles';
import { relationship, sourceFields } from './shared';

export const TeamEvents: CollectionConfig = {
  slug: 'team-events',
  admin: { useAsTitle: 'title' },
  access: {
    read: () => true,
    create: isOrganizer,
    update: isOrganizer,
    delete: isOrganizer,
  },
  fields: [
    ...sourceFields,
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
