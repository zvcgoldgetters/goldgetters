import type { GlobalConfig } from 'payload';

export const clubSettings: GlobalConfig = {
  slug: 'club-settings',
  label: 'Club settings',
  fields: [
    {
      name: 'clubName',
      type: 'text',
      required: true,
      defaultValue: 'Goldgetters',
    },
    { name: 'contactEmail', type: 'email' },
    { name: 'defaultVenue', type: 'text' },
    { name: 'timezone', type: 'text', defaultValue: 'Europe/Brussels' },
  ],
};
