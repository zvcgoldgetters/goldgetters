import type { Access, CollectionConfig, Where } from 'payload';

type RequestUser = { id?: string | number; role?: string };

const canReadResponse: Access = ({ req }) => {
  const user = req.user as RequestUser | undefined;
  if (!user?.id) {
    return false;
  }
  if (user.role === 'admin' || user.role === 'organizer') {
    return true;
  }
  return { invitee: { equals: user.id } } satisfies Where;
};

const isAuthenticated = ({ req }: { req: { user?: unknown } }): boolean =>
  Boolean(req.user);

export const RsvpResponses: CollectionConfig = {
  slug: 'rsvp-responses',
  admin: {
    useAsTitle: 'inviteeEmail',
    defaultColumns: ['rsvpEvent', 'response', 'guestCount', 'respondedAt'],
  },
  access: {
    read: canReadResponse,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: 'rsvpEvent',
      type: 'relationship',
      relationTo: 'rsvp-events',
      required: true,
    },
    {
      name: 'invitee',
      type: 'relationship',
      relationTo: 'users',
    },
    {
      name: 'inviteeEmail',
      type: 'email',
      admin: {
        description: 'External guest email when no Payload user exists.',
      },
    },
    {
      name: 'inviteeName',
      type: 'text',
    },
    {
      name: 'response',
      type: 'select',
      required: true,
      defaultValue: 'none',
      options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
        { label: 'Maybe', value: 'maybe' },
        { label: 'No response', value: 'none' },
      ],
    },
    {
      name: 'comment',
      type: 'textarea',
      access: {
        read: isAuthenticated,
      },
    },
    {
      name: 'guestCount',
      type: 'number',
      min: 0,
      defaultValue: 0,
    },
    {
      name: 'invitedAt',
      type: 'date',
    },
    {
      name: 'receivedAt',
      type: 'date',
    },
    {
      name: 'respondedAt',
      type: 'date',
    },
    {
      name: 'invitationId',
      type: 'text',
      unique: true,
      index: true,
    },
    {
      name: 'tokenHash',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        hidden: true,
      },
    },
    {
      name: 'tokenExpiresAt',
      type: 'date',
    },
    {
      name: 'tokenRevokedAt',
      type: 'date',
    },
    {
      name: 'tokenLastUsedAt',
      type: 'date',
    },
    {
      name: 'sourceInviteId',
      type: 'text',
      unique: true,
      index: true,
    },
  ],
};
