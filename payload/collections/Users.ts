import type {
  CollectionAfterOperationHook,
  CollectionBeforeOperationHook,
  CollectionBeforeValidateHook,
  CollectionConfig,
  Config,
  DatabaseAdapter,
  JSONFieldValidation,
  UpdateOne,
  UpdateOneArgs,
} from 'payload';
import {
  allowUsersCreate,
  allowUsersRead,
  allowUsersUpdate,
  canCreateUserRolesField,
  createAuthCollectionAccess,
  hasAnyAssignedRole,
  hasRole,
  hideFromAdminUnlessRoles,
  isAdministrator,
  isAdministratorField,
  isSelfOrDirectorField,
  isUserRole,
  type UserRole,
  userRoles,
} from '../access/roles';

const allowRolesWriteByReq = new WeakMap<object, boolean>();

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUsersRoleWriteAllowed(req: unknown): boolean {
  return (
    typeof req === 'object' &&
    req !== null &&
    allowRolesWriteByReq.get(req) === true
  );
}

function omitRolesField(
  data: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).filter(([key]) => key !== 'roles'),
  );
}

function shouldStripRolesOnUpdateOne(
  args: UpdateOneArgs,
): args is UpdateOneArgs & { data: Record<string, unknown> } {
  return (
    args.collection === 'users' &&
    isPlainRecord(args.data) &&
    Object.prototype.hasOwnProperty.call(args.data, 'roles') &&
    !isUsersRoleWriteAllowed(args.req)
  );
}

/**
 * Wraps the database adapter's `updateOne` so internal `users` writes from
 * profile edits, session updates, and password recovery omit `roles` unless
 * the request was explicitly authorized to modify `roles`.
 */
export function withUsersRoleWriteGuard(
  adapterFactory: Config['db'],
): Config['db'] {
  return {
    ...adapterFactory,
    init: (initArgs) => {
      const adapter = adapterFactory.init(initArgs);
      const originalUpdateOne = adapter.updateOne;
      const guardedUpdateOne: UpdateOne = function guardedUpdateOne(
        this: DatabaseAdapter,
        updateArgs,
      ) {
        const nextArgs = shouldStripRolesOnUpdateOne(updateArgs)
          ? {
              ...updateArgs,
              data: omitRolesField(updateArgs.data),
            }
          : updateArgs;

        return originalUpdateOne.call(this, nextArgs);
      };

      return {
        ...adapter,
        updateOne: guardedUpdateOne,
      };
    },
  };
}

const trackAuthorizedRolesWriteBeforeOperation: CollectionBeforeOperationHook =
  (hookArg) => {
    const operationName = Reflect.get(hookArg, 'operation');
    if (operationName === 'update' || operationName === 'updateByID') {
      const rawData: unknown = Reflect.get(hookArg.args, 'data');
      const hasRolesInput =
        isPlainRecord(rawData) &&
        Object.prototype.hasOwnProperty.call(rawData, 'roles') &&
        rawData.roles !== undefined;
      const canWriteRoles =
        Boolean(
          hookArg.overrideAccess ?? Reflect.get(hookArg.args, 'overrideAccess'),
        ) || hasRole(hookArg.req.user, 'administrator');
      allowRolesWriteByReq.set(hookArg.req, hasRolesInput && canWriteRoles);
    } else {
      allowRolesWriteByReq.delete(hookArg.req);
    }

    return hookArg.args;
  };

const stripSnapshotRolesBeforeValidate: CollectionBeforeValidateHook = ({
  data,
  operation,
  req,
}) => {
  if (
    operation === 'update' &&
    isPlainRecord(data) &&
    !isUsersRoleWriteAllowed(req)
  ) {
    return omitRolesField(data);
  }

  return data;
};

const clearRolesWriteTrackingAfterOperation: CollectionAfterOperationHook = ({
  req,
  result,
}) => {
  allowRolesWriteByReq.delete(req);
  return result;
};

function hasUniqueValidRoles(value: unknown): value is UserRole[] {
  if (!Array.isArray(value) || value.length === 0) {
    return false;
  }

  return (
    value.every(isUserRole) && new Set<UserRole>(value).size === value.length
  );
}

const validateUserRoles: JSONFieldValidation = (value, options) => {
  if (
    options.operation === 'update' &&
    value === undefined &&
    !isUsersRoleWriteAllowed(options.req)
  ) {
    return true;
  }

  if (!Array.isArray(value) || value.length === 0) {
    return 'At least one valid role is required.';
  }

  return hasUniqueValidRoles(value)
    ? true
    : 'Roles must be unique valid role values.';
};

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'roles'],
    hidden: hideFromAdminUnlessRoles(['administrator', 'director']),
  },
  access: createAuthCollectionAccess({
    admin: hasAnyAssignedRole,
    read: allowUsersRead,
    create: allowUsersCreate,
    update: allowUsersUpdate,
    delete: isAdministrator,
    unlock: isAdministrator,
  }),
  hooks: {
    beforeOperation: [trackAuthorizedRolesWriteBeforeOperation],
    beforeValidate: [stripSnapshotRolesBeforeValidate],
    afterOperation: [clearRolesWriteTrackingAfterOperation],
  },
  auth: true,
  fields: [
    {
      name: 'roles',
      type: 'json',
      admin: {
        components: {
          Cell: '/payload/components/UserRolesCell#UserRolesCell',
          Field: '/payload/components/UserRolesField#UserRolesField',
        },
      },
      defaultValue: ['member'],
      required: true,
      saveToJWT: true,
      jsonSchema: {
        fileMatch: ['a://b/user-roles.json'],
        schema: {
          items: {
            enum: [...userRoles],
            type: 'string',
          },
          type: 'array',
          uniqueItems: true,
        },
        uri: 'a://b/user-roles.json',
      },
      validate: validateUserRoles,
      access: {
        create: canCreateUserRolesField,
        read: isSelfOrDirectorField,
        update: isAdministratorField,
      },
    },
    { name: 'displayName', type: 'text' },
  ],
};
