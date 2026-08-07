import { describe, expect, it } from 'vitest';
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
});
