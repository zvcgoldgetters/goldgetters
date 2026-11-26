import type { Field, PayloadRequest } from 'payload';
import { describe, expect, it, vi } from 'vitest';
import {
  allowUsersCreate,
  allowUsersRead,
  allowUsersUpdate,
  canCreateUserRolesField,
  denyAll,
  denyAllField,
  hasAnyAssignedRole,
  isAdministrator,
  isAdministratorField,
  isDirector,
  isDirectorField,
  isEditorial,
  isSelfOrDirectorField,
  isTeamManager,
  isTreasurer,
  userRoles,
  type UserRole,
} from '../access/roles';
import { clubSettings } from '../globals/ClubSettings';
import { Albums } from './Albums';
import { Bookings } from './Bookings';
import { Leagues } from './Leagues';
import { Matches } from './Matches';
import { Media } from './Media';
import { News } from './News';
import { Players } from './Players';
import { Previews } from './Previews';
import { Reports } from './Reports';
import { Seasons } from './Seasons';
import { SourceRecords } from './SourceRecords';
import { TeamEvents } from './TeamEvents';
import { Teams } from './Teams';
import { Users } from './Users';
import { Venues } from './Venues';

const collections = [
  Users,
  Players,
  Teams,
  Venues,
  Leagues,
  Seasons,
  Matches,
  TeamEvents,
  Reports,
  Previews,
  News,
  Albums,
  Media,
  Bookings,
  SourceRecords,
];

const relationshipTargets = new Set(
  collections.map((collection) => collection.slug),
);

function relationshipFields(collection: (typeof collections)[number]) {
  return collection.fields.filter(
    (
      field,
    ): field is Extract<
      (typeof collection.fields)[number],
      { type: 'relationship' }
    > => field.type === 'relationship',
  );
}

function fieldNames(fields: readonly Field[]): string[] {
  return fields.flatMap((field) => {
    if ('name' in field && typeof field.name === 'string') {
      return [field.name];
    }

    return field.type === 'row' ? fieldNames(field.fields) : [];
  });
}

function collectionFieldNames(collection: (typeof collections)[number]) {
  return fieldNames(collection.fields);
}

function findField(collection: (typeof collections)[number], name: string) {
  return collection.fields.find(
    (field) => 'name' in field && field.name === name,
  );
}

function reqForUser(
  role?: UserRole,
  options: { countTotalDocs?: number } = {},
) {
  const count =
    options.countTotalDocs === undefined
      ? undefined
      : vi.fn().mockResolvedValue({ totalDocs: options.countTotalDocs });

  return {
    req: {
      context: {},
      payload: count ? { count } : undefined,
      user: role ? { id: 1, roles: [role] } : null,
    } as unknown as PayloadRequest,
  };
}

describe('core Payload domain model', () => {
  it('registers every collection from the migration scope', () => {
    expect(collections.map((collection) => collection.slug)).toEqual([
      'users',
      'players',
      'teams',
      'venues',
      'leagues',
      'seasons',
      'matches',
      'team-events',
      'reports',
      'previews',
      'news',
      'albums',
      'media',
      'bookings',
      'source-records',
    ]);
  });

  it('keeps relationship fields inside the registered collection graph', () => {
    expect(
      collections.every((collection) =>
        relationshipFields(collection).every((field) => {
          const targets = Array.isArray(field.relationTo)
            ? field.relationTo
            : [field.relationTo];
          return targets.every((target) => relationshipTargets.has(target));
        }),
      ),
    ).toBe(true);
  });

  it('enforces deny-by-default across every collection and global operation', () => {
    const collectionOperations = [
      'read',
      'create',
      'update',
      'delete',
      'readVersions',
      'unlock',
    ] as const;

    collections.forEach((collection) => {
      collectionOperations.forEach((operation) => {
        const handler = collection.access?.[operation];
        expect(typeof handler, `${collection.slug}.${operation}`).toBe(
          'function',
        );
        expect(handler?.(reqForUser()), `${collection.slug}.${operation}`).toBe(
          false,
        );
      });
    });

    expect(typeof Users.access?.admin).toBe('function');
    expect(Users.access?.admin?.(reqForUser())).toBe(false);
    expect(typeof clubSettings.access?.read).toBe('function');
    expect(typeof clubSettings.access?.update).toBe('function');
    expect(typeof clubSettings.access?.readVersions).toBe('function');
    expect(clubSettings.access?.read?.(reqForUser())).toBe(false);
    expect(clubSettings.access?.update?.(reqForUser())).toBe(false);
    expect(clubSettings.access?.readVersions?.(reqForUser())).toBe(false);
  });

  it('assigns explicit role grants for users and editorial collections', () => {
    expect(Users.access?.admin).toBe(hasAnyAssignedRole);
    expect(Users.access?.read).toBe(allowUsersRead);
    expect(Users.access?.create).toBe(allowUsersCreate);
    expect(Users.access?.update).toBe(allowUsersUpdate);
    expect(Users.access?.delete).toBe(isAdministrator);
    expect(Users.access?.unlock).toBe(isAdministrator);
    expect(Users.access?.readVersions).toBe(denyAll);

    const draftCollections = [Albums, News, Previews, Reports];
    const editorialCollections = [
      [News, 'owner'],
      [Reports, 'owner'],
      [Previews, 'owner'],
      [Albums, 'owner'],
      [Media, 'uploadedBy'],
    ] as const;

    draftCollections.forEach((collection) => {
      expect(collection.access?.read).toBe(isEditorial);
      expect(collection.access?.readVersions).toBe(isEditorial);
    });

    editorialCollections.forEach(([collection, ownerField]) => {
      expect(collection.access?.read).toBe(isEditorial);
      expect(collection.access?.create).toBe(isEditorial);

      (['update', 'delete'] as const).forEach((operation) => {
        const handler = collection.access?.[operation];
        expect(typeof handler, `${collection.slug}.${operation}`).toBe(
          'function',
        );
        expect(
          handler?.(reqForUser('administrator')),
          `${collection.slug}.${operation}.administrator`,
        ).toBe(true);
        expect(
          handler?.(reqForUser('editor')),
          `${collection.slug}.${operation}.editor`,
        ).toEqual({ [ownerField]: { equals: 1 } });
        (['director', 'team-manager', 'treasurer', 'member'] as const).forEach(
          (role) => {
            expect(
              handler?.(reqForUser(role)),
              `${collection.slug}.${operation}.${role}`,
            ).toBe(false);
          },
        );
        expect(
          handler?.(reqForUser()),
          `${collection.slug}.${operation}.anon`,
        ).toBe(false);
      });
    });

    expect(Media.upload).toMatchObject({
      pasteURL: false,
    });
  });

  it('assigns explicit role grants for director, team-manager, treasurer, and administrator collections', async () => {
    [Leagues, Seasons, Players].forEach((collection) => {
      expect(collection.access?.create).toBe(isDirector);
      expect(collection.access?.update).toBe(isDirector);
      expect(collection.access?.delete).toBe(isDirector);
    });

    [Matches, TeamEvents, Teams, Venues].forEach((collection) => {
      expect(collection.access?.create).toBe(isTeamManager);
      expect(collection.access?.update).toBe(isTeamManager);
      expect(collection.access?.delete).toBe(isTeamManager);
    });

    expect(clubSettings.access?.read).toBe(isDirector);
    expect(clubSettings.access?.update).toBe(isDirector);

    expect(Matches.access?.read).toBe(hasAnyAssignedRole);

    await userRoles.reduce(async (previous, role) => {
      await previous;
      expect(Leagues.access?.read?.(reqForUser(role)), role).toBe(
        ['administrator', 'director', 'team-manager'].includes(role),
      );
      expect(TeamEvents.access?.read?.(reqForUser(role)), role).toBe(
        ['administrator', 'team-manager', 'member'].includes(role),
      );
      expect(Teams.access?.read?.(reqForUser(role)), role).toBe(
        ['administrator', 'director', 'team-manager', 'member'].includes(role),
      );
      expect(Venues.access?.read?.(reqForUser(role)), role).toBe(
        ['administrator', 'director', 'team-manager', 'member'].includes(role),
      );
      expect(
        await Seasons.access?.read?.(reqForUser(role, { countTotalDocs: 0 })),
        role,
      ).toBe(
        ['administrator', 'director', 'team-manager', 'treasurer'].includes(
          role,
        ),
      );
      expect(
        await Players.access?.read?.(reqForUser(role, { countTotalDocs: 0 })),
        role,
      ).toBe(
        [
          'administrator',
          'director',
          'team-manager',
          'treasurer',
          'member',
        ].includes(role),
      );
      expect(
        await Bookings.access?.read?.(reqForUser(role, { countTotalDocs: 0 })),
        role,
      ).toBe(['administrator', 'treasurer'].includes(role));
    }, Promise.resolve());

    expect(
      await Bookings.access?.read?.(
        reqForUser('member', { countTotalDocs: 1 }),
      ),
    ).toBe(true);
    expect(
      await Seasons.access?.read?.(reqForUser('member', { countTotalDocs: 1 })),
    ).toBe(true);

    expect(Bookings.access?.create).toBe(isTreasurer);
    expect(Bookings.access?.update).toBe(isTreasurer);
    expect(Bookings.access?.delete).toBe(isTreasurer);

    expect(SourceRecords.access?.read).toBe(isAdministrator);
    expect(SourceRecords.access?.create).toBe(isAdministrator);
    expect(SourceRecords.access?.update).toBe(isAdministrator);
    expect(SourceRecords.access?.delete).toBe(isAdministrator);
  });

  it('hides read-only or restricted collections in admin navigation', () => {
    const adminHiddenCheck = (
      collection: (typeof collections)[number],
      role: UserRole,
    ) => {
      const hidden = collection.admin?.hidden;
      return typeof hidden === 'function'
        ? hidden({ user: { id: 1, roles: [role] } as never })
        : Boolean(hidden);
    };

    expect(Bookings.admin?.hidden).toBeUndefined();

    collections.forEach((collection) => {
      expect(adminHiddenCheck(collection, 'administrator')).toBe(false);
      expect(adminHiddenCheck(collection, 'member')).toBe(
        collection !== TeamEvents && collection !== Bookings,
      );
    });

    [Albums, Media, News, Previews, Reports].forEach((collection) => {
      expect(adminHiddenCheck(collection, 'editor')).toBe(false);
      expect(adminHiddenCheck(collection, 'director')).toBe(true);
      expect(adminHiddenCheck(collection, 'team-manager')).toBe(true);
    });

    [Leagues, Seasons, Players].forEach((collection) => {
      expect(adminHiddenCheck(collection, 'director')).toBe(false);
      expect(adminHiddenCheck(collection, 'team-manager')).toBe(true);
      expect(adminHiddenCheck(collection, 'editor')).toBe(true);
      expect(adminHiddenCheck(collection, 'treasurer')).toBe(true);
    });

    [Matches, TeamEvents, Teams, Venues].forEach((collection) => {
      expect(adminHiddenCheck(collection, 'team-manager')).toBe(false);
      expect(adminHiddenCheck(collection, 'director')).toBe(true);
      expect(adminHiddenCheck(collection, 'editor')).toBe(true);
      expect(adminHiddenCheck(collection, 'treasurer')).toBe(true);
    });

    expect(adminHiddenCheck(Users, 'director')).toBe(false);
    expect(adminHiddenCheck(SourceRecords, 'director')).toBe(true);

    [Users, SourceRecords].forEach((collection) => {
      expect(adminHiddenCheck(collection, 'team-manager')).toBe(true);
      expect(adminHiddenCheck(collection, 'treasurer')).toBe(true);
      expect(adminHiddenCheck(collection, 'editor')).toBe(true);
    });
  });

  it('protects sensitive fields with field-level access controls', () => {
    const rolesField = findField(Users, 'roles');
    expect(rolesField).toMatchObject({
      type: 'json',
      required: true,
      saveToJWT: true,
      access: {
        create: canCreateUserRolesField,
        read: isSelfOrDirectorField,
        update: isAdministratorField,
      },
    });

    const playerUserField = findField(Players, 'user');
    expect(playerUserField).toMatchObject({
      access: {
        create: isDirectorField,
        read: isDirectorField,
        update: isDirectorField,
      },
    });

    ['contactEmail', 'contactPhone'].forEach((fieldName) => {
      const field = findField(Teams, fieldName);
      const readAccess =
        field && 'access' in field ? field.access?.read : undefined;
      expect(typeof readAccess).toBe('function');
      expect(readAccess?.(reqForUser('administrator'))).toBe(true);
      expect(readAccess?.(reqForUser('team-manager'))).toBe(true);
      expect(readAccess?.(reqForUser('director'))).toBe(false);
      expect(readAccess?.(reqForUser('treasurer'))).toBe(false);
      expect(readAccess?.(reqForUser('editor'))).toBe(false);
      expect(readAccess?.(reqForUser('member'))).toBe(false);
      expect(readAccess?.(reqForUser())).toBe(false);
    });

    collections
      .filter((collection) => collection !== SourceRecords)
      .forEach((collection) => {
        ['sourceId', 'sourceType', 'sourceUpdatedAt'].forEach((fieldName) => {
          expect(findField(collection, fieldName)).toBeUndefined();
        });
      });

    ['sourceId', 'sourceType', 'sourceUpdatedAt'].forEach((fieldName) => {
      const field = findField(SourceRecords, fieldName);
      expect(field).toBeDefined();
      expect(
        field && 'hooks' in field ? field.hooks?.beforeValidate?.length : 0,
      ).toBeGreaterThan(0);
    });
    const sourceIdField = findField(SourceRecords, 'sourceId');
    expect(sourceIdField).toMatchObject({
      required: true,
    });
    expect(
      Boolean(
        sourceIdField && 'unique' in sourceIdField && sourceIdField.unique,
      ),
    ).toBe(false);
    expect(findField(SourceRecords, 'sourceType')).toMatchObject({
      required: true,
    });
    expect(SourceRecords.indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fields: ['sourceType', 'sourceId'],
          unique: true,
        }),
      ]),
    );

    (
      [
        [News, 'owner'],
        [Reports, 'owner'],
        [Previews, 'owner'],
        [Albums, 'owner'],
        [Media, 'uploadedBy'],
      ] as const
    ).forEach(([collection, fieldName]) => {
      const field = findField(collection, fieldName);
      expect(field).toMatchObject({
        access: {
          create: isAdministratorField,
          update: denyAllField,
        },
      });
      expect(
        field && 'hooks' in field ? field.hooks?.beforeValidate?.length : 0,
      ).toBeGreaterThan(0);
      expect(
        field && 'hooks' in field ? field.hooks?.beforeChange?.length : 0,
      ).toBeGreaterThan(0);
    });

    (
      [
        [News, 'author'],
        [Reports, 'author'],
        [Previews, 'author'],
        [Albums, 'photographer'],
      ] as const
    ).forEach(([collection, fieldName]) => {
      const field = findField(collection, fieldName);
      expect(
        field && 'access' in field ? field.access : undefined,
      ).toBeUndefined();
      expect(
        field && 'hooks' in field ? field.hooks?.beforeChange?.length : 0,
      ).toBeGreaterThan(0);
    });
  });

  it('defines the expected domain fields and select values', () => {
    const expectedFields = new Map([
      [Players, ['name', 'user', 'team', 'status', 'shirtNumber']],
      [Teams, ['name', 'slug', 'league', 'players', 'contactEmail']],
      [Matches, ['title', 'date', 'season', 'league', 'homeTeam', 'awayTeam']],
      [TeamEvents, ['title', 'date', 'type', 'team', 'venue']],
      [News, ['title', 'slug', 'body', 'author', 'image', 'publishedAt']],
      [
        Bookings,
        ['date', 'category', 'amount', 'status', 'season', 'player', 'match'],
      ],
    ]);

    expectedFields.forEach((names, collection) => {
      expect(collectionFieldNames(collection)).toEqual(
        expect.arrayContaining(names),
      );
    });

    expect(findField(Players, 'status')).toMatchObject({
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: ['active', 'reserve', 'inactive', 'historical'],
    });
    expect(findField(Matches, 'status')).toMatchObject({
      type: 'select',
      defaultValue: 'scheduled',
      options: ['scheduled', 'played', 'postponed', 'cancelled'],
    });
    expect(findField(TeamEvents, 'type')).toMatchObject({
      type: 'select',
      required: true,
      options: ['training', 'tournament', 'other'],
    });
    expect(findField(Bookings, 'status')).toMatchObject({
      type: 'select',
      options: ['planned', 'confirmed', 'cancelled', 'paid'],
    });
  });

  it('uses Payload slug fields with the correct source field', () => {
    const sluggedCollections = [
      [News, 'title'],
      [Teams, 'name'],
      [Leagues, 'name'],
      [Venues, 'name'],
    ] as const;

    sluggedCollections.forEach(([collection, sourceField]) => {
      const slugRow = collection.fields.find(
        (field) =>
          field.type === 'row' &&
          field.fields.some(
            (nestedField) =>
              'name' in nestedField && nestedField.name === 'slug',
          ),
      );

      expect(slugRow).toMatchObject({ type: 'row' });
      expect(slugRow?.type === 'row' && slugRow.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'generateSlug', defaultValue: true }),
          expect.objectContaining({
            name: 'slug',
            required: true,
            unique: true,
            index: true,
          }),
        ]),
      );
      const slugField =
        slugRow?.type === 'row'
          ? slugRow.fields.find(
              (field) => 'name' in field && field.name === 'slug',
            )
          : undefined;
      expect(slugField).toMatchObject({
        admin: {
          components: { Field: { clientProps: { useAsSlug: sourceField } } },
        },
      });
    });
  });

  it('keeps source metadata exclusively on source-records', () => {
    expect(
      ['sourceId', 'sourceType', 'sourceUpdatedAt'].every((name) =>
        SourceRecords.fields.some(
          (field) => 'name' in field && field.name === name,
        ),
      ),
    ).toBe(true);
    expect(
      collections
        .filter((collection) => collection !== SourceRecords)
        .every((collection) =>
          ['sourceId', 'sourceType', 'sourceUpdatedAt'].every(
            (name) => !findField(collection, name),
          ),
        ),
    ).toBe(true);
  });

  it('preserves source timestamps without forcing legacy date parsing', () => {
    expect(
      SourceRecords.fields.find(
        (field) => 'name' in field && field.name === 'sourceUpdatedAt',
      ),
    ).toMatchObject({ type: 'text' });
  });

  it('models the current club context as global relationships', () => {
    const clubRelationshipFields = clubSettings.fields.filter(
      (field) => field.type === 'relationship',
    );

    expect(clubRelationshipFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'currentTeam', relationTo: 'teams' }),
        expect.objectContaining({
          name: 'currentSeason',
          relationTo: 'seasons',
        }),
        expect.objectContaining({
          name: 'currentLeague',
          relationTo: 'leagues',
        }),
        expect.objectContaining({ name: 'defaultVenue', relationTo: 'venues' }),
      ]),
    );
  });

  it('enables drafts for editorial collections', () => {
    [Albums, News, Previews, Reports].forEach((collection) => {
      expect(collection.versions).toMatchObject({ drafts: true });
    });
  });
});
