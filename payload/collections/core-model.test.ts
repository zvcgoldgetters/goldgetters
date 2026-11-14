import { describe, expect, it } from 'vitest';
import { Albums } from './Albums';
import {
  isAdministrator,
  isEditorial,
  isFinance,
  isOrganizer,
} from '../access/roles';
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
import { clubSettings } from '../globals/ClubSettings';
import type { Field } from 'payload';

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

  it('defines explicit access and preserves role-specific write policies', () => {
    expect(
      collections.every((collection) =>
        ['read', 'create', 'update', 'delete'].every(
          (operation) =>
            typeof collection.access?.[
              operation as 'read' | 'create' | 'update' | 'delete'
            ] === 'function',
        ),
      ),
    ).toBe(true);

    const editorialCollections = [
      Albums,
      Leagues,
      Matches,
      Media,
      News,
      Previews,
      Reports,
      Seasons,
      Teams,
      Venues,
    ];
    const organizerCollections = [TeamEvents];
    const financeCollections = [Bookings];
    const administratorReadCollections = [Users, SourceRecords];
    const administratorWriteCollections = [Players, Users, SourceRecords];

    editorialCollections.forEach((collection) => {
      expect(collection.access?.create).toBe(isEditorial);
      expect(collection.access?.update).toBe(isEditorial);
      expect(collection.access?.delete).toBe(isEditorial);
    });
    organizerCollections.forEach((collection) => {
      expect(collection.access?.create).toBe(isOrganizer);
      expect(collection.access?.update).toBe(isOrganizer);
      expect(collection.access?.delete).toBe(isOrganizer);
    });
    financeCollections.forEach((collection) => {
      expect(collection.access?.read).toBe(isFinance);
      expect(collection.access?.create).toBe(isFinance);
      expect(collection.access?.update).toBe(isFinance);
      expect(collection.access?.delete).toBe(isFinance);
    });
    administratorReadCollections.forEach((collection) => {
      expect(collection.access?.read).toBe(isAdministrator);
    });
    administratorWriteCollections.forEach((collection) => {
      expect(collection.access?.create).toBe(isAdministrator);
      expect(collection.access?.update).toBe(isAdministrator);
      expect(collection.access?.delete).toBe(isAdministrator);
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

  it('requires stable source metadata on every collection', () => {
    expect(
      collections.every((collection) =>
        ['sourceId', 'sourceType'].every((name) =>
          collection.fields.some(
            (field) => 'name' in field && field.name === name,
          ),
        ),
      ),
    ).toBe(true);
  });

  it('preserves source timestamps without forcing legacy date parsing', () => {
    collections.forEach((collection) => {
      expect(
        collection.fields.find(
          (field) => 'name' in field && field.name === 'sourceUpdatedAt',
        ),
      ).toMatchObject({ type: 'text' });
    });
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
