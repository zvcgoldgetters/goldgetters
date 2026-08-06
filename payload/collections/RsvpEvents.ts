import type { CollectionConfig } from 'payload';

const isAuthenticated = ({ req }: { req: { user?: unknown } }): boolean =>
  Boolean(req.user);

export const RsvpEvents: CollectionConfig = {
  slug: 'rsvp-events',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['teamEvent', 'responseDeadline', 'invitationStatus'],
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: 'teamEvent',
      type: 'relationship',
      relationTo: 'team-events',
      required: true,
    },
    {
      name: 'organizers',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      required: true,
    },
    {
      name: 'moderators',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
    },
    {
      name: 'responseStartsAt',
      type: 'date',
    },
    {
      name: 'responseDeadline',
      type: 'date',
    },
    {
      name: 'allowMaybe',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'maxAttendees',
      type: 'number',
      min: 1,
    },
    {
      name: 'guestListVisibility',
      type: 'select',
      defaultValue: 'invitees',
      options: [
        { label: 'Invitees', value: 'invitees' },
        { label: 'Organizers only', value: 'organizers' },
        { label: 'Hidden', value: 'hidden' },
      ],
    },
    {
      name: 'invitationStatus',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Ready for review', value: 'review' },
        { label: 'Sent', value: 'sent' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
    },
    {
      name: 'invitationSentAt',
      type: 'date',
    },
    {
      name: 'cancelledAt',
      type: 'date',
    },
    {
      name: 'cancellationReason',
      type: 'textarea',
    },
    {
      name: 'sourceRid',
      type: 'text',
      unique: true,
      index: true,
    },
    {
      name: 'sourceNid',
      type: 'text',
      unique: true,
      index: true,
    },
  ],
};
