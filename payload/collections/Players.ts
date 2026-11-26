import type { CollectionConfig } from 'payload';
import {
  allowRolesOrActivePlayer,
  createCollectionAccess,
  hideFromAdminUnlessRoles,
  isDirector,
  isDirectorField,
} from '../access/roles';
import { relationship } from './shared';

export const Players: CollectionConfig = {
  slug: 'players',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'team', 'status'],
    hidden: hideFromAdminUnlessRoles(['administrator', 'director']),
  },
  access: createCollectionAccess({
    read: allowRolesOrActivePlayer([
      'administrator',
      'director',
      'team-manager',
      'treasurer',
      'member',
    ]),
    create: isDirector,
    update: isDirector,
    delete: isDirector,
  }),
  fields: [
    { name: 'name', type: 'text', required: true },
    relationship('user', 'users', {
      hasMany: false,
      access: {
        create: isDirectorField,
        read: isDirectorField,
        update: isDirectorField,
      },
    }),
    relationship('team', 'teams'),
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: ['active', 'reserve', 'inactive', 'historical'],
    },
    { name: 'shirtNumber', type: 'number' },
  ],
};
