import type { CollectionConfig } from 'payload';
import { isAdministrator, userRoles } from '../access/roles';
import { sourceFields } from './shared';

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'role'],
  },
  access: {
    admin: isAdministrator,
    create: isAdministrator,
    delete: isAdministrator,
    read: isAdministrator,
    update: isAdministrator,
  },
  auth: true,
  fields: [
    ...sourceFields,
    {
      name: 'role',
      type: 'select',
      defaultValue: 'member',
      options: userRoles.map((value) => ({ label: value, value })),
      required: true,
    },
    { name: 'displayName', type: 'text' },
  ],
};
