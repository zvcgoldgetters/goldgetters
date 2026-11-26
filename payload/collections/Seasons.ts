import type { CollectionConfig } from 'payload';
import {
  allowRolesOrActivePlayer,
  createCollectionAccess,
  hideFromAdminUnlessRoles,
  isDirector,
} from '../access/roles';
import { relationship } from './shared';

export const Seasons: CollectionConfig = {
  slug: 'seasons',
  admin: {
    useAsTitle: 'name',
    hidden: hideFromAdminUnlessRoles(['administrator', 'director']),
  },
  access: createCollectionAccess({
    read: allowRolesOrActivePlayer([
      'administrator',
      'director',
      'team-manager',
      'treasurer',
    ]),
    create: isDirector,
    update: isDirector,
    delete: isDirector,
  }),
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'period', type: 'text' },
    { name: 'series', type: 'text' },
    relationship('teams', 'teams', { hasMany: true }),
    { name: 'rankingUrl', type: 'text' },
  ],
};
