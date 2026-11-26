import type {
  Access,
  CollectionConfig,
  FieldAccess,
  GlobalConfig,
} from 'payload';

export const userRoles = [
  'administrator',
  'director',
  'team-manager',
  'treasurer',
  'editor',
  'member',
] as const;

export type UserRole = (typeof userRoles)[number];

export const userRoleOptions: readonly {
  label: string;
  value: UserRole;
}[] = [
  { label: 'Administrator', value: 'administrator' },
  { label: 'Director', value: 'director' },
  { label: 'Team Manager', value: 'team-manager' },
  { label: 'Treasurer', value: 'treasurer' },
  { label: 'Editor', value: 'editor' },
  { label: 'Member', value: 'member' },
];

const validUserRoles = new Set<string>(userRoles);

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && validUserRoles.has(value);
}

type RoleBearingUser =
  | {
      id?: number | string;
      roles?: unknown;
    }
  | null
  | undefined;

export function getUserRoles(user: RoleBearingUser): UserRole[] {
  if (!Array.isArray(user?.roles)) {
    return [];
  }

  return user.roles.filter(
    (role): role is UserRole =>
      typeof role === 'string' && validUserRoles.has(role),
  );
}

export function hasRole(user: RoleBearingUser, role: UserRole): boolean {
  return getUserRoles(user).includes(role);
}

export function hasAnyRole(
  user: RoleBearingUser,
  roles: readonly UserRole[],
): boolean {
  return getUserRoles(user).some((role) => roles.includes(role));
}

export function isAuthenticated(user: unknown): boolean {
  return Boolean(user);
}

type AccessArgs = Parameters<Access>[0];

export const denyAll: Access = () => false;

export const denyAllAdmin = (): boolean => false;

export const denyAllField: FieldAccess = () => false;

export const allowRoles =
  (roles: readonly UserRole[]) =>
  ({ req }: AccessArgs): boolean =>
    hasAnyRole(req.user, roles);

export const allowRolesField =
  (roles: readonly UserRole[]): FieldAccess =>
  ({ req }) =>
    hasAnyRole(req.user, roles);

export const hideFromAdminUnlessRoles =
  (roles: readonly UserRole[]) =>
  ({ user }: { user: RoleBearingUser }): boolean =>
    !hasAnyRole(user, roles);

export const hasAnyAssignedRole = allowRoles(userRoles);
export const isAdministrator = allowRoles(['administrator']);
export const isDirector = allowRoles(['administrator', 'director']);
export const isTeamManager = allowRoles(['administrator', 'team-manager']);
export const isTreasurer = allowRoles(['administrator', 'treasurer']);
export const isEditorial = allowRoles(['administrator', 'editor']);
export const isMember = allowRoles(['administrator', 'member']);

const activePlayerCache = new WeakMap<object, Promise<boolean>>();

type CountCapablePayload = {
  count?: (args: {
    collection: 'players';
    overrideAccess: true;
    req: AccessArgs['req'];
    where: {
      and: [
        { user: { equals: number | string } },
        { status: { equals: 'active' } },
      ];
    };
  }) => Promise<{ totalDocs: number }>;
};

export async function isActiveLinkedPlayer(
  req: AccessArgs['req'],
): Promise<boolean> {
  const user = req.user as RoleBearingUser;
  if (!user || !hasAnyRole(user, userRoles) || user.id === undefined) {
    return false;
  }

  const cached = activePlayerCache.get(req);
  if (cached) {
    return cached;
  }

  const payloadWithCount = req.payload as CountCapablePayload | undefined;
  if (typeof payloadWithCount?.count !== 'function') {
    return false;
  }

  const lookupPromise = payloadWithCount
    .count({
      collection: 'players',
      overrideAccess: true,
      req,
      where: {
        and: [{ user: { equals: user.id } }, { status: { equals: 'active' } }],
      },
    })
    .then((result) => result.totalDocs > 0);

  activePlayerCache.set(req, lookupPromise);

  return lookupPromise;
}

export const allowRolesOrActivePlayer =
  (roles: readonly UserRole[]): Access =>
  ({ req }) => {
    const user = req.user as RoleBearingUser;
    if (!user || !hasAnyRole(user, userRoles)) {
      return false;
    }

    if (hasAnyRole(user, roles)) {
      return true;
    }

    if (user.id === undefined) {
      return false;
    }

    return isActiveLinkedPlayer(req);
  };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function extractRelationId(value: unknown): number | string | undefined {
  if (typeof value === 'number' || typeof value === 'string') {
    return value;
  }

  if (isRecord(value)) {
    const nestedId = value.id;
    if (typeof nestedId === 'number' || typeof nestedId === 'string') {
      return nestedId;
    }
  }

  return undefined;
}

export const allowEditorialOwnerOrAdmin =
  (ownerField: string): Access =>
  ({ req }) => {
    const user = req.user as RoleBearingUser;
    if (!user || !hasAnyRole(user, ['administrator', 'editor'])) {
      return false;
    }

    if (hasRole(user, 'administrator')) {
      return true;
    }

    if (user.id === undefined) {
      return false;
    }

    return { [ownerField]: { equals: user.id } };
  };

export const isAdministratorField: FieldAccess = allowRolesField([
  'administrator',
]);

export const isDirectorField: FieldAccess = allowRolesField([
  'administrator',
  'director',
]);

export const isSelfOrDirectorField: FieldAccess = ({ req, doc, id }) => {
  const user = req.user as RoleBearingUser;
  if (!user || !hasAnyRole(user, userRoles)) {
    return false;
  }

  if (hasAnyRole(user, ['administrator', 'director'])) {
    return true;
  }

  if (user.id === undefined) {
    return false;
  }

  const targetId = (doc as { id?: unknown } | undefined)?.id ?? id;
  return targetId === user.id;
};

function containsAdministratorRole(roles: unknown): boolean {
  if (roles === 'administrator') {
    return true;
  }

  return Array.isArray(roles) && roles.includes('administrator');
}

export const allowUsersRead: Access = ({ req }) => {
  const user = req.user as RoleBearingUser;
  if (!user || !hasAnyRole(user, userRoles)) {
    return false;
  }

  if (hasAnyRole(user, ['administrator', 'director'])) {
    return true;
  }

  if (user.id === undefined) {
    return false;
  }

  return { id: { equals: user.id } };
};

export const allowUsersCreate: Access = ({ req, data }) => {
  const user = req.user as RoleBearingUser;
  if (!user || !hasAnyRole(user, userRoles)) {
    return false;
  }

  if (hasRole(user, 'administrator')) {
    return true;
  }

  if (!hasRole(user, 'director')) {
    return false;
  }

  const submittedRoles = (data as { roles?: unknown } | undefined)?.roles;
  return !containsAdministratorRole(submittedRoles);
};

export const allowUsersUpdate: Access = ({ req }) => {
  const user = req.user as RoleBearingUser;
  if (!user || !hasAnyRole(user, userRoles)) {
    return false;
  }

  if (hasRole(user, 'administrator')) {
    return true;
  }

  if (user.id === undefined) {
    return false;
  }

  return { id: { equals: user.id } };
};

export const canCreateUserRolesField: FieldAccess = ({
  req,
  data,
  siblingData,
}) => {
  const user = req.user as RoleBearingUser;
  if (!user || !hasAnyRole(user, userRoles)) {
    return false;
  }

  if (hasRole(user, 'administrator')) {
    return true;
  }

  if (!hasRole(user, 'director')) {
    return false;
  }

  const submittedRoles =
    (siblingData as { roles?: unknown } | undefined)?.roles ??
    (data as { roles?: unknown } | undefined)?.roles;

  return !containsAdministratorRole(submittedRoles);
};

export function createCollectionAccess(
  overrides: CollectionConfig['access'] = {},
): NonNullable<CollectionConfig['access']> {
  return {
    create: denyAll,
    read: denyAll,
    update: denyAll,
    delete: denyAll,
    readVersions: denyAll,
    unlock: denyAll,
    ...overrides,
  };
}

export function createAuthCollectionAccess(
  overrides: CollectionConfig['access'] = {},
): NonNullable<CollectionConfig['access']> {
  return {
    admin: denyAllAdmin,
    ...createCollectionAccess(overrides),
  };
}

export function createGlobalAccess(
  overrides: GlobalConfig['access'] = {},
): NonNullable<GlobalConfig['access']> {
  return {
    read: denyAll,
    update: denyAll,
    readVersions: denyAll,
    ...overrides,
  };
}

export function withDefaultDenyCollectionAccess(
  collection: CollectionConfig,
): CollectionConfig {
  return {
    ...collection,
    lockDocuments: false,
    access: collection.auth
      ? createAuthCollectionAccess(collection.access)
      : createCollectionAccess(collection.access),
  };
}

export function withDefaultDenyGlobalAccess(
  globalConfig: GlobalConfig,
): GlobalConfig {
  return {
    ...globalConfig,
    lockDocuments: false,
    access: createGlobalAccess(globalConfig.access),
  };
}
