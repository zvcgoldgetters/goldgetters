import type { CollectionConfig, Field } from 'payload';

export const sourceFields: Field[] = [
  {
    name: 'sourceId',
    type: 'text',
    index: true,
    unique: true,
  },
  {
    name: 'sourceType',
    type: 'text',
  },
];

export function relationship(
  name: string,
  relationTo: string,
  options: Partial<Extract<Field, { type: 'relationship' }>> = {},
): Field {
  return {
    name,
    type: 'relationship',
    relationTo,
    ...options,
  } as Field;
}

export function authenticatedAccess(): CollectionConfig['access'] {
  const isAuthenticated = ({ req }: { req: { user?: unknown } }) =>
    Boolean(req.user);

  return {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  };
}
