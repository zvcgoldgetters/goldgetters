import type { Field } from 'payload';

export const sourceFields: Field[] = [
  {
    name: 'sourceId',
    type: 'text',
    required: true,
    unique: true,
    admin: { description: 'Stable identifier from the Drupal source export.' },
  },
  { name: 'sourceType', type: 'text', required: true },
  { name: 'sourceUpdatedAt', type: 'date' },
];

export const slugField: Field = {
  name: 'slug',
  type: 'text',
  required: true,
  unique: true,
  index: true,
};

export const relationship = (
  name: string,
  relationTo: string,
  options: Partial<Field> = {},
): Field =>
  ({
    name,
    type: 'relationship',
    relationTo,
    ...options,
  }) as Field;
