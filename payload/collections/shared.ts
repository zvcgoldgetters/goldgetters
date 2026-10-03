import { slugField as payloadSlugField, type Field } from 'payload';

export const sourceFields: Field[] = [
  {
    name: 'sourceId',
    type: 'text',
    required: true,
    unique: true,
    admin: { description: 'Stable identifier from the Drupal source export.' },
  },
  { name: 'sourceType', type: 'text', required: true },
  {
    name: 'sourceUpdatedAt',
    type: 'text',
    admin: {
      description:
        'Raw source timestamp preserved from Drupal; normalize it in importer workflows before date-based queries.',
    },
  },
];

export const slugField = (useAsSlug = 'title'): Field =>
  payloadSlugField({ useAsSlug });

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
