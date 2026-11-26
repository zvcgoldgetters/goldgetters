import {
  slugField as payloadSlugField,
  type Field,
  type FieldHook,
  type RelationshipField,
} from 'payload';
import {
  denyAllField,
  extractRelationId,
  isAdministratorField,
} from '../access/roles';

function normalizeAttributionValue(value: unknown): number | string | null {
  return extractRelationId(value) ?? null;
}

export const slugField = (useAsSlug = 'title'): Field =>
  payloadSlugField({
    useAsSlug,
    overrides: (baseField) => ({
      ...baseField,
      fields: baseField.fields.map((field) => {
        if (
          'name' in field &&
          field.name === 'generateSlug' &&
          'hooks' in field &&
          field.hooks?.beforeChange?.length
        ) {
          return {
            ...field,
            hooks: {
              ...field.hooks,
              beforeValidate: [
                ...(field.hooks.beforeValidate ?? []),
                ...field.hooks.beforeChange,
              ],
              beforeChange: [],
            },
          };
        }

        return field;
      }),
    }),
  });

export const relationship = (
  name: string,
  relationTo: string,
  options: Partial<
    Omit<RelationshipField, 'name' | 'relationTo' | 'type'>
  > = {},
): Field =>
  ({
    name,
    type: 'relationship',
    relationTo,
    ...options,
  }) as Field;

type VersionFindPayload = {
  db?: {
    findVersions?: (args: {
      collection: string;
      limit: 1;
      pagination: false;
      req: unknown;
      select: { version: Record<string, true> };
      sort: '-updatedAt';
      where: {
        and: [
          { parent: { equals: number | string } },
          { latest: { equals: true } },
        ];
      };
    }) => Promise<{
      docs: { version?: Record<string, unknown> }[];
    }>;
  };
};

function hasDraftsConfig(
  collection: { versions?: unknown } | null | undefined,
): boolean {
  const versions = collection?.versions;
  return Boolean(
    typeof versions === 'object' &&
    versions !== null &&
    'drafts' in versions &&
    versions.drafts,
  );
}

type LatestVersionFieldResult =
  { found: false } | { found: true; value: unknown };

async function findLatestVersionField(args: {
  collectionSlug: string;
  docId: number | string;
  fieldName: string;
  req: { payload?: unknown };
}): Promise<LatestVersionFieldResult> {
  const dbPayload = args.req.payload as VersionFindPayload | undefined;
  const dbAdapter = dbPayload?.db;
  if (typeof dbAdapter?.findVersions !== 'function') {
    return { found: false };
  }

  const result = await dbAdapter.findVersions({
    collection: args.collectionSlug,
    limit: 1,
    pagination: false,
    req: args.req,
    select: { version: { [args.fieldName]: true } },
    sort: '-updatedAt',
    where: {
      and: [{ parent: { equals: args.docId } }, { latest: { equals: true } }],
    },
  });

  if (result.docs.length === 0) {
    return { found: false };
  }

  return {
    found: true,
    value: result.docs[0]?.version?.[args.fieldName] ?? null,
  };
}

function preserveLatestDraftFieldBeforeValidate(
  fieldName: string,
  normalize: (value: unknown) => unknown,
): FieldHook {
  return async ({
    collection,
    operation,
    originalDoc,
    req,
    siblingData,
    value,
  }): Promise<unknown> => {
    const currentValue: unknown = value;
    const docId = extractRelationId(
      (originalDoc as { id?: unknown } | undefined)?.id,
    );
    if (
      operation !== 'update' ||
      siblingData[fieldName] !== undefined ||
      !collection ||
      !hasDraftsConfig(collection) ||
      docId === undefined
    ) {
      return currentValue;
    }

    // Bulk publishes read `originalDoc` from the published table; preserve
    // the latest version's value (including explicit nulls) instead.
    const latest = await findLatestVersionField({
      collectionSlug: collection.slug,
      docId,
      fieldName,
      req,
    });
    return latest.found ? normalize(latest.value) : currentValue;
  };
}

function preserveImmutableFieldBeforeChange(
  fieldName: string,
  normalize: (value: unknown) => unknown,
): FieldHook {
  return async ({
    collection,
    operation,
    originalDoc,
    previousValue,
    req,
    value,
  }): Promise<unknown> => {
    const currentValue: unknown = value;
    if (operation === 'create') {
      return currentValue === undefined || currentValue === null
        ? (req.user?.id ?? currentValue)
        : currentValue;
    }

    if (operation !== 'update') {
      return currentValue;
    }

    const docId = extractRelationId(
      (originalDoc as { id?: unknown } | undefined)?.id,
    );
    if (collection && hasDraftsConfig(collection) && docId !== undefined) {
      const latest = await findLatestVersionField({
        collectionSlug: collection.slug,
        docId,
        fieldName,
        req,
      });
      if (latest.found) {
        return normalize(latest.value);
      }
    }

    return normalize((previousValue as unknown) ?? currentValue);
  };
}

export const immutableOwnerField = (name = 'owner'): Field =>
  relationship(name, 'users', {
    access: {
      create: isAdministratorField,
      update: denyAllField,
    },
    hooks: {
      beforeValidate: [
        preserveLatestDraftFieldBeforeValidate(name, normalizeAttributionValue),
      ],
      beforeChange: [
        preserveImmutableFieldBeforeChange(name, normalizeAttributionValue),
      ],
    },
  });

export const displayAttributionField = (name: string): Field =>
  relationship(name, 'users', {
    hooks: {
      beforeValidate: [
        preserveLatestDraftFieldBeforeValidate(name, normalizeAttributionValue),
      ],
      beforeChange: [
        ({ operation, req, value }): unknown => {
          const currentValue: unknown = value;
          return operation === 'create' && currentValue === undefined
            ? (req.user?.id ?? currentValue)
            : currentValue;
        },
      ],
    },
  });
