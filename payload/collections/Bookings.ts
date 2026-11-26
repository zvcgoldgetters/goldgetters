import type { CollectionConfig } from 'payload';
import {
  allowRolesOrActivePlayer,
  createCollectionAccess,
  isTreasurer,
} from '../access/roles';
import { relationship } from './shared';

export const Bookings: CollectionConfig = {
  slug: 'bookings',
  admin: {
    useAsTitle: 'date',
  },
  access: createCollectionAccess({
    read: allowRolesOrActivePlayer(['administrator', 'treasurer']),
    create: isTreasurer,
    update: isTreasurer,
    delete: isTreasurer,
  }),
  fields: [
    { name: 'date', type: 'date', required: true },
    { name: 'category', type: 'text' },
    { name: 'amount', type: 'number' },
    {
      name: 'status',
      type: 'select',
      options: ['planned', 'confirmed', 'cancelled', 'paid'],
    },
    relationship('season', 'seasons'),
    relationship('player', 'players'),
    relationship('match', 'matches'),
    { name: 'note', type: 'textarea' },
  ],
};
