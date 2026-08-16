import type { CollectionConfig } from 'payload';
import { isFinance } from '../access/roles';
import { relationship, sourceFields } from './shared';

export const Bookings: CollectionConfig = {
  slug: 'bookings',
  admin: { useAsTitle: 'date' },
  access: {
    read: isFinance,
    create: isFinance,
    update: isFinance,
    delete: isFinance,
  },
  fields: [
    ...sourceFields,
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
