import type { CollectionConfig } from 'payload';

const isAuthenticated = ({ req }: { req: { user?: unknown } }): boolean =>
  Boolean(req.user);

export const TeamEvents: CollectionConfig = {
  slug: 'team-events',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'eventType', 'startsAt', 'status'],
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'eventType',
      type: 'select',
      required: true,
      options: [
        { label: 'Match', value: 'match' },
        { label: 'Training', value: 'training' },
        { label: 'Tournament', value: 'tournament' },
      ],
    },
    {
      name: 'startsAt',
      type: 'date',
      required: true,
    },
    {
      name: 'endsAt',
      type: 'date',
    },
    {
      name: 'location',
      type: 'text',
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'scheduled',
      options: [
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Rescheduled', value: 'rescheduled' },
      ],
    },
    {
      name: 'sourceId',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        description: 'Stable source identifier used by repeatable imports.',
      },
    },
  ],
};
