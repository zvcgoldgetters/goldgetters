import type { CollectionConfig, GlobalConfig, PayloadRequest } from 'payload';
import { describe, expect, it, vi } from 'vitest';
import {
  allowEditorialOwnerOrAdmin,
  allowRolesOrActivePlayer,
  allowUsersCreate,
  allowUsersRead,
  allowUsersUpdate,
  canCreateUserRolesField,
  createAuthCollectionAccess,
  createCollectionAccess,
  createGlobalAccess,
  denyAll,
  denyAllAdmin,
  denyAllField,
  getUserRoles,
  hasAnyAssignedRole,
  hasAnyRole,
  hasRole,
  hideFromAdminUnlessRoles,
  isActiveLinkedPlayer,
  isAdministrator,
  isAdministratorField,
  isAuthenticated,
  isDirector,
  isDirectorField,
  isEditorial,
  isMember,
  isSelfOrDirectorField,
  isTeamManager,
  isTreasurer,
  userRoleOptions,
  userRoles,
  withDefaultDenyCollectionAccess,
  withDefaultDenyGlobalAccess,
} from './roles';

function reqForUser(
  user: unknown,
  options: {
    context?: Record<string, unknown>;
    countTotalDocs?: number;
  } = {},
) {
  const count =
    options.countTotalDocs === undefined
      ? undefined
      : vi.fn().mockResolvedValue({ totalDocs: options.countTotalDocs });

  return {
    count,
    req: {
      context: options.context ?? {},
      payload: count ? { count } : undefined,
      user,
    } as unknown as PayloadRequest,
  };
}

describe('Payload user roles and deny-by-default access', () => {
  it('defines the club front-office role vocabulary and labels', () => {
    expect(userRoles).toEqual([
      'administrator',
      'director',
      'team-manager',
      'treasurer',
      'editor',
      'member',
    ]);
    expect(userRoleOptions).toEqual([
      { label: 'Administrator', value: 'administrator' },
      { label: 'Director', value: 'director' },
      { label: 'Team Manager', value: 'team-manager' },
      { label: 'Treasurer', value: 'treasurer' },
      { label: 'Editor', value: 'editor' },
      { label: 'Member', value: 'member' },
    ]);
  });

  it('extracts and matches multiple roles without trusting malformed values', () => {
    expect(getUserRoles({ roles: ['treasurer', 'member'] })).toEqual([
      'treasurer',
      'member',
    ]);
    expect(getUserRoles({ roles: ['editor', 'unknown'] })).toEqual(['editor']);
    expect(getUserRoles({ roles: 'administrator' })).toEqual([]);
    expect(getUserRoles({ roles: [] })).toEqual([]);
    expect(getUserRoles(null)).toEqual([]);

    expect(hasRole({ roles: ['treasurer', 'member'] }, 'treasurer')).toBe(true);
    expect(hasRole({ roles: ['treasurer', 'member'] }, 'member')).toBe(true);
    expect(hasRole({ roles: ['member'] }, 'treasurer')).toBe(false);
    expect(hasRole({ roles: ['administrator'] }, 'administrator')).toBe(true);
    expect(hasRole(null, 'administrator')).toBe(false);
  });

  it('matches any role in an allowed role set across single and multi-role users', () => {
    expect(
      hasAnyRole({ roles: ['team-manager'] }, [
        'administrator',
        'team-manager',
      ]),
    ).toBe(true);
    expect(
      hasAnyRole({ roles: ['member', 'team-manager'] }, [
        'administrator',
        'team-manager',
      ]),
    ).toBe(true);
    expect(
      hasAnyRole({ roles: ['member'] }, ['administrator', 'team-manager']),
    ).toBe(false);
    expect(hasAnyRole({ roles: ['unknown'] }, userRoles)).toBe(false);
  });

  it('distinguishes authenticated users from anonymous requests', () => {
    expect(isAuthenticated({ id: 'user-1' })).toBe(true);
    expect(isAuthenticated(null)).toBe(false);
    expect(isAuthenticated(undefined)).toBe(false);
  });

  it('evaluates role predicates strictly per assigned role', () => {
    expect(hasAnyAssignedRole(reqForUser({ roles: ['member'] }))).toBe(true);
    expect(
      hasAnyAssignedRole(reqForUser({ roles: ['treasurer', 'member'] })),
    ).toBe(true);
    expect(hasAnyAssignedRole(reqForUser({ roles: [] }))).toBe(false);
    expect(hasAnyAssignedRole(reqForUser({ roles: ['unknown'] }))).toBe(false);
    expect(hasAnyAssignedRole(reqForUser(null))).toBe(false);

    expect(isMember(reqForUser({ roles: ['member'] }))).toBe(true);
    expect(isMember(reqForUser({ roles: ['treasurer', 'member'] }))).toBe(true);
    expect(isMember(reqForUser({ roles: ['administrator'] }))).toBe(true);
    expect(isMember(reqForUser({ roles: ['treasurer'] }))).toBe(false);
    expect(isMember(reqForUser({ roles: ['editor'] }))).toBe(false);

    expect(isDirector(reqForUser({ roles: ['director', 'member'] }))).toBe(
      true,
    );
    expect(isDirector(reqForUser({ roles: ['team-manager'] }))).toBe(false);
    expect(
      isTeamManager(reqForUser({ roles: ['team-manager', 'member'] })),
    ).toBe(true);
    expect(isTeamManager(reqForUser({ roles: ['director'] }))).toBe(false);
    expect(isTreasurer(reqForUser({ roles: ['treasurer', 'member'] }))).toBe(
      true,
    );
    expect(isEditorial(reqForUser({ roles: ['editor', 'member'] }))).toBe(true);
  });

  it('denies all access by default including administrators when omitted', () => {
    const adminReq = reqForUser({ id: 1, roles: ['administrator'] });
    const anonReq = reqForUser(null);

    expect(denyAll(adminReq)).toBe(false);
    expect(denyAll(anonReq)).toBe(false);
    expect(denyAllAdmin()).toBe(false);
    expect(denyAllField(adminReq)).toBe(false);

    const collectionAccess = createCollectionAccess({ read: isAdministrator });
    expect(collectionAccess.read?.(adminReq)).toBe(true);
    expect(collectionAccess.create?.(adminReq)).toBe(false);
    expect(collectionAccess.update?.(adminReq)).toBe(false);
    expect(collectionAccess.delete?.(adminReq)).toBe(false);
    expect(collectionAccess.readVersions?.(adminReq)).toBe(false);
    expect(collectionAccess.unlock?.(adminReq)).toBe(false);

    const authAccess = createAuthCollectionAccess({ read: isAdministrator });
    expect(authAccess.admin?.(adminReq)).toBe(false);
    expect(authAccess.unlock?.(adminReq)).toBe(false);

    const globalAccess = createGlobalAccess({ read: isAdministrator });
    expect(globalAccess.read?.(adminReq)).toBe(true);
    expect(globalAccess.update?.(adminReq)).toBe(false);
    expect(globalAccess.readVersions?.(adminReq)).toBe(false);
  });

  it('wraps collections and globals with deny-by-default fallbacks', () => {
    const adminReq = reqForUser({ id: 1, roles: ['administrator'] });

    const wrappedCollection = withDefaultDenyCollectionAccess({
      slug: 'sample',
      fields: [],
      access: { read: isAdministrator },
    } satisfies CollectionConfig);
    expect(wrappedCollection.lockDocuments).toBe(false);
    expect(wrappedCollection.access?.read?.(adminReq)).toBe(true);
    expect(wrappedCollection.access?.create?.(adminReq)).toBe(false);
    expect(wrappedCollection.access?.readVersions?.(adminReq)).toBe(false);
    expect(wrappedCollection.access?.unlock?.(adminReq)).toBe(false);

    const wrappedAuthCollection = withDefaultDenyCollectionAccess({
      slug: 'auth-sample',
      auth: true,
      fields: [],
    } satisfies CollectionConfig);
    expect(wrappedAuthCollection.lockDocuments).toBe(false);
    expect(wrappedAuthCollection.access?.admin?.(adminReq)).toBe(false);
    expect(wrappedAuthCollection.access?.read?.(adminReq)).toBe(false);

    const wrappedGlobal = withDefaultDenyGlobalAccess({
      slug: 'global-sample',
      fields: [],
    } satisfies GlobalConfig);
    expect(wrappedGlobal.lockDocuments).toBe(false);
    expect(wrappedGlobal.access?.read?.(adminReq)).toBe(false);
    expect(wrappedGlobal.access?.update?.(adminReq)).toBe(false);
    expect(wrappedGlobal.access?.readVersions?.(adminReq)).toBe(false);
  });

  it('hides collections from admin navigation unless user has an allowed role', () => {
    const isHidden = hideFromAdminUnlessRoles([
      'administrator',
      'team-manager',
    ]);

    expect(isHidden({ user: { roles: ['administrator'] } })).toBe(false);
    expect(isHidden({ user: { roles: ['member', 'team-manager'] } })).toBe(
      false,
    );
    expect(isHidden({ user: { roles: ['director'] } })).toBe(true);
    expect(isHidden({ user: { roles: ['editor'] } })).toBe(true);
    expect(isHidden({ user: { roles: ['treasurer'] } })).toBe(true);
    expect(isHidden({ user: { roles: ['member'] } })).toBe(true);
    expect(isHidden({ user: null })).toBe(true);
  });

  it('scopes editorial update/delete access to own records for editor and allows administrators', () => {
    const ownerOrAdmin = allowEditorialOwnerOrAdmin('owner');

    expect(ownerOrAdmin(reqForUser(null))).toBe(false);
    expect(ownerOrAdmin(reqForUser({ id: 1, roles: [] }))).toBe(false);
    expect(ownerOrAdmin(reqForUser({ id: 1, roles: ['unknown'] }))).toBe(false);
    expect(ownerOrAdmin(reqForUser({ id: 1, roles: ['member'] }))).toBe(false);
    expect(ownerOrAdmin(reqForUser({ id: 1, roles: ['director'] }))).toBe(
      false,
    );
    expect(ownerOrAdmin(reqForUser({ id: 1, roles: ['treasurer'] }))).toBe(
      false,
    );
    expect(ownerOrAdmin(reqForUser({ id: 1, roles: ['team-manager'] }))).toBe(
      false,
    );
    expect(ownerOrAdmin(reqForUser({ roles: ['editor'] }))).toBe(false);

    expect(ownerOrAdmin(reqForUser({ id: 1, roles: ['administrator'] }))).toBe(
      true,
    );
    expect(
      ownerOrAdmin(reqForUser({ id: 1, roles: ['editor', 'administrator'] })),
    ).toBe(true);
    expect(ownerOrAdmin(reqForUser({ id: 2, roles: ['editor'] }))).toEqual({
      owner: { equals: 2 },
    });
    expect(
      ownerOrAdmin(reqForUser({ id: 3, roles: ['member', 'editor'] })),
    ).toEqual({
      owner: { equals: 3 },
    });
  });

  it('evaluates active linked player access and caches per request context', async () => {
    const readBookingsAccess = allowRolesOrActivePlayer([
      'administrator',
      'treasurer',
    ]);

    expect(readBookingsAccess(reqForUser(null))).toBe(false);
    expect(readBookingsAccess(reqForUser({ id: 1, roles: [] }))).toBe(false);
    expect(readBookingsAccess(reqForUser({ id: 1, roles: ['unknown'] }))).toBe(
      false,
    );
    expect(readBookingsAccess(reqForUser({ roles: ['member'] }))).toBe(false);

    const treasurerReq = reqForUser(
      { id: 2, roles: ['treasurer'] },
      { countTotalDocs: 0 },
    );
    expect(readBookingsAccess(treasurerReq)).toBe(true);
    expect(treasurerReq.count).not.toHaveBeenCalled();

    const noPayloadReq = reqForUser({ id: 3, roles: ['member'] });
    expect(await readBookingsAccess(noPayloadReq)).toBe(false);

    const activePlayerReq = reqForUser(
      { id: 4, roles: ['member'] },
      { countTotalDocs: 1 },
    );
    expect(await readBookingsAccess(activePlayerReq)).toBe(true);
    expect(await readBookingsAccess(activePlayerReq)).toBe(true);
    expect(activePlayerReq.count).toHaveBeenCalledTimes(1);
    expect(activePlayerReq.count).toHaveBeenCalledWith({
      collection: 'players',
      overrideAccess: true,
      req: activePlayerReq.req,
      where: {
        and: [{ user: { equals: 4 } }, { status: { equals: 'active' } }],
      },
    });

    const inactivePlayerReq = reqForUser(
      { id: 5, roles: ['member'] },
      { countTotalDocs: 0 },
    );
    expect(await isActiveLinkedPlayer(inactivePlayerReq.req)).toBe(false);
    expect(inactivePlayerReq.count).toHaveBeenCalledTimes(1);
  });

  it('enforces field-level administrator and self-or-administrator checks', () => {
    expect(
      isAdministratorField({
        ...reqForUser({ id: 1, roles: ['administrator'] }),
      }),
    ).toBe(true);
    expect(
      isAdministratorField({
        ...reqForUser({ id: 2, roles: ['editor', 'member'] }),
      }),
    ).toBe(false);

    expect(
      isDirectorField({
        ...reqForUser({ id: 1, roles: ['director'] }),
      }),
    ).toBe(true);
    expect(
      isDirectorField({
        ...reqForUser({ id: 2, roles: ['team-manager'] }),
      }),
    ).toBe(false);

    expect(
      isSelfOrDirectorField({
        ...reqForUser({ id: 1, roles: ['administrator'] }),
        doc: { id: 99 },
      }),
    ).toBe(true);
    expect(
      isSelfOrDirectorField({
        ...reqForUser({ id: 1, roles: ['director'] }),
        doc: { id: 99 },
      }),
    ).toBe(true);
    expect(
      isSelfOrDirectorField({
        ...reqForUser({ id: 5, roles: ['member'] }),
        doc: { id: 5 },
      }),
    ).toBe(true);
    expect(
      isSelfOrDirectorField({
        ...reqForUser({ id: 5, roles: ['member'] }),
        id: 5,
      }),
    ).toBe(true);
    expect(
      isSelfOrDirectorField({
        ...reqForUser({ id: 5, roles: ['member'] }),
        doc: { id: 6 },
      }),
    ).toBe(false);
    expect(
      isSelfOrDirectorField({
        ...reqForUser(null),
        doc: { id: 5 },
      }),
    ).toBe(false);
  });

  it('limits directors to reading and onboarding non-admin users while keeping updates self-only', () => {
    expect(allowUsersRead(reqForUser(null))).toBe(false);
    expect(allowUsersRead(reqForUser({ id: 1, roles: ['unknown'] }))).toBe(
      false,
    );
    expect(allowUsersRead(reqForUser({ id: 1, roles: [] }))).toBe(false);
    expect(allowUsersRead(reqForUser({ roles: ['member'] }))).toBe(false);
    expect(
      allowUsersRead(reqForUser({ id: 1, roles: ['administrator'] })),
    ).toBe(true);
    expect(allowUsersRead(reqForUser({ id: 2, roles: ['director'] }))).toBe(
      true,
    );
    expect(
      allowUsersRead(reqForUser({ id: 3, roles: ['treasurer', 'member'] })),
    ).toEqual({
      id: { equals: 3 },
    });
    expect(allowUsersRead(reqForUser({ id: 5, roles: ['member'] }))).toEqual({
      id: { equals: 5 },
    });

    expect(allowUsersCreate(reqForUser(null))).toBe(false);
    expect(
      allowUsersCreate({
        ...reqForUser({ id: 5, roles: ['member'] }),
        data: { roles: ['member'] },
      }),
    ).toBe(false);
    expect(
      allowUsersCreate({
        ...reqForUser({ id: 1, roles: ['administrator'] }),
        data: { roles: ['administrator'] },
      }),
    ).toBe(true);
    expect(
      allowUsersCreate({
        ...reqForUser({ id: 2, roles: ['director'] }),
        data: { roles: ['member', 'editor'] },
      }),
    ).toBe(true);
    expect(
      allowUsersCreate({
        ...reqForUser({ id: 2, roles: ['director'] }),
        data: { roles: ['administrator'] },
      }),
    ).toBe(false);
    expect(
      allowUsersCreate({
        ...reqForUser({ id: 2, roles: ['director'] }),
        data: { roles: ['member', 'administrator'] },
      }),
    ).toBe(false);

    expect(
      allowUsersUpdate(reqForUser({ id: 1, roles: ['administrator'] })),
    ).toBe(true);
    expect(
      allowUsersUpdate(reqForUser({ id: 2, roles: ['director'] })),
    ).toEqual({
      id: { equals: 2 },
    });
    expect(allowUsersUpdate(reqForUser({ id: 5, roles: ['member'] }))).toEqual({
      id: { equals: 5 },
    });
    expect(allowUsersUpdate(reqForUser(null))).toBe(false);

    expect(
      canCreateUserRolesField({
        ...reqForUser({ id: 1, roles: ['administrator'] }),
        siblingData: { roles: ['administrator'] },
      }),
    ).toBe(true);
    expect(
      canCreateUserRolesField({
        ...reqForUser({ id: 2, roles: ['director'] }),
        siblingData: { roles: ['team-manager', 'member'] },
      }),
    ).toBe(true);
    expect(
      canCreateUserRolesField({
        ...reqForUser({ id: 2, roles: ['director'] }),
        siblingData: { roles: ['member', 'administrator'] },
      }),
    ).toBe(false);
    expect(
      canCreateUserRolesField({
        ...reqForUser({ id: 5, roles: ['member'] }),
        siblingData: { roles: ['member'] },
      }),
    ).toBe(false);
  });
});
