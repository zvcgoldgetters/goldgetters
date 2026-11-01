// @vitest-environment node

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPayload } from 'payload';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { UserRole } from './access/roles';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const integrationTestTimeout = 30_000;
const testPrefix = randomUUID();
const testTimestamp = '2026-01-01T00:00:00.000Z';

type TestUser = {
  collection: 'users';
  createdAt: string;
  email: string;
  id: number;
  role: UserRole;
  sourceId: string;
  sourceType: string;
  updatedAt: string;
};

const payloadState = (async () => {
  const databaseDirectory = mkdtempSync(join(tmpdir(), 'goldgetters-payload-'));
  const databaseUri = `file:${join(databaseDirectory, 'payload.db')}`;
  vi.stubEnv('DATABASE_URI', databaseUri);
  vi.stubEnv('PAYLOAD_SECRET', 'test-secret');

  execFileSync('npm', ['run', 'migrate'], {
    cwd: repositoryRoot,
    env: process.env,
    stdio: 'pipe',
  });

  vi.stubEnv('PAYLOAD_MIGRATING', 'true');
  const { default: payloadConfig } = await import('../payload.config');
  const payload = await getPayload({ config: await payloadConfig });

  return { databaseDirectory, payload };
})();

function roleUser(role: UserRole): TestUser {
  return {
    id: 1,
    sourceId: `${testPrefix}-${role}`,
    sourceType: 'test',
    role,
    updatedAt: testTimestamp,
    createdAt: testTimestamp,
    email: `${role}@example.test`,
    collection: 'users',
  };
}

function sourceFields(suffix: string) {
  return {
    sourceId: `${testPrefix}-${suffix}`,
    sourceType: 'test',
  };
}

describe('Payload Local API access and data contracts', () => {
  beforeAll(async () => {
    await payloadState;
  });

  afterAll(async () => {
    const { databaseDirectory, payload } = await payloadState;
    await payload.destroy();
    vi.unstubAllEnvs();
    rmSync(databaseDirectory, { force: true, recursive: true });
  });

  it(
    'enforces representative role policies with access control enabled',
    async () => {
      const { payload } = await payloadState;
      const editor = roleUser('editor');
      const organizer = roleUser('organizer');
      const finance = roleUser('finance');
      const administrator = roleUser('administrator');
      const member = roleUser('member');

      await expect(
        payload.create({
          collection: 'teams',
          data: {
            ...sourceFields('member-team'),
            name: 'Member Team',
            slug: 'member-team',
          },
          overrideAccess: false,
          user: member,
        }),
      ).rejects.toThrow();

      const team = await payload.create({
        collection: 'teams',
        data: {
          ...sourceFields('editor-team'),
          generateSlug: true,
          name: 'Editor Team',
          slug: '',
        },
        overrideAccess: false,
        user: editor,
      });
      expect(team.slug).toBe('editor-team');
      const updatedTeam = await payload.update({
        collection: 'teams',
        data: { name: 'Updated Editor Team' },
        id: team.id,
        overrideAccess: false,
        user: editor,
      });
      expect(updatedTeam.name).toBe('Updated Editor Team');

      const draftNews = await payload.create({
        collection: 'news',
        data: {
          ...sourceFields('draft-news'),
          _status: 'draft',
          publishedAt: testTimestamp,
          slug: 'draft-news',
          title: 'Draft News',
        } as never,
        overrideAccess: false,
        user: editor,
      });
      expect(draftNews._status).toBe('draft');
      expect(
        (
          await payload.find({
            collection: 'news',
            draft: false,
            overrideAccess: false,
          })
        ).docs,
      ).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ id: draftNews.id })]),
      );

      const publishedNews = await payload.update({
        collection: 'news',
        data: { _status: 'published' } as never,
        id: draftNews.id,
        overrideAccess: false,
        user: editor,
      });
      expect(publishedNews._status).toBe('published');
      expect(
        (
          await payload.find({
            collection: 'news',
            draft: false,
            overrideAccess: false,
          })
        ).docs,
      ).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: draftNews.id })]),
      );
      await payload.delete({
        collection: 'news',
        id: draftNews.id,
        overrideAccess: false,
        user: editor,
      });

      await expect(
        payload.delete({
          collection: 'teams',
          id: team.id,
          overrideAccess: false,
          user: member,
        }),
      ).rejects.toThrow();
      await payload.delete({
        collection: 'teams',
        id: team.id,
        overrideAccess: false,
        user: editor,
      });

      const event = await payload.create({
        collection: 'team-events',
        data: {
          ...sourceFields('organizer-event'),
          date: testTimestamp,
          title: 'Organizer Event',
          type: 'training',
        },
        overrideAccess: false,
        user: organizer,
      });
      expect(event.title).toBe('Organizer Event');
      await payload.delete({
        collection: 'team-events',
        id: event.id,
        overrideAccess: false,
        user: organizer,
      });

      const booking = await payload.create({
        collection: 'bookings',
        data: {
          ...sourceFields('finance-booking'),
          date: testTimestamp,
          status: 'planned',
        },
        overrideAccess: false,
        user: finance,
      });
      expect(booking.status).toBe('planned');
      await expect(
        payload.find({
          collection: 'bookings',
          overrideAccess: false,
          user: member,
        }),
      ).rejects.toThrow();
      await payload.delete({
        collection: 'bookings',
        id: booking.id,
        overrideAccess: false,
        user: finance,
      });

      const sourceRecord = await payload.create({
        collection: 'source-records',
        data: {
          ...sourceFields('administrator-record'),
          targetCollection: 'teams',
          targetId: 'team-1',
        },
        overrideAccess: false,
        user: administrator,
      });
      expect(sourceRecord.targetCollection).toBe('teams');
      await payload.delete({
        collection: 'source-records',
        id: sourceRecord.id,
        overrideAccess: false,
        user: administrator,
      });
    },
    integrationTestTimeout,
  );

  it(
    'enforces required fields and applies collection defaults',
    async () => {
      const { payload } = await payloadState;
      const editor = roleUser('editor');
      const administrator = roleUser('administrator');

      await expect(
        payload.create({
          collection: 'players',
          data: sourceFields('invalid-player') as never,
          overrideAccess: false,
          user: administrator,
        }),
      ).rejects.toThrow();

      const playerData = {
        ...sourceFields('valid-player'),
        name: 'Valid Player',
        sourceUpdatedAt: '0000-00-00 00:00:00',
      } as never;
      await expect(
        payload.create({
          collection: 'players',
          data: playerData,
          overrideAccess: false,
          user: editor,
        }),
      ).rejects.toThrow();

      const player = await payload.create({
        collection: 'players',
        data: playerData,
        overrideAccess: false,
        user: administrator,
      });
      expect(player.status).toBe('active');
      expect(player.sourceUpdatedAt).toBe('0000-00-00 00:00:00');
      await expect(
        payload.update({
          collection: 'players',
          data: { name: 'Updated Player' },
          id: player.id,
          overrideAccess: false,
          user: editor,
        }),
      ).rejects.toThrow();
      await expect(
        payload.delete({
          collection: 'players',
          id: player.id,
          overrideAccess: false,
          user: editor,
        }),
      ).rejects.toThrow();
      await payload.delete({
        collection: 'players',
        id: player.id,
        overrideAccess: false,
        user: administrator,
      });
    },
    integrationTestTimeout,
  );
});
