import type { CollectionConfig } from 'payload';
import { isAdministrator, userRoles } from '../access/roles';

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
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
    {
      name: 'role',
      type: 'select',
      defaultValue: 'member',
      options: userRoles.map((value) => ({ label: value, value })),
      required: true,
    },
  ],
};
