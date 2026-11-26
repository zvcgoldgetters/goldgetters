// @vitest-environment node

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLocalReq, getPayload } from 'payload';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { userRoles, type UserRole } from './access/roles';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const integrationTestTimeout = 30_000;
const testPrefix = randomUUID();
const testTimestamp = '2026-01-01T00:00:00.000Z';

type TestUser = {
  collection: 'users';
  createdAt: string;
  email: string;
  id: number;
  roles: UserRole[];
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

  const users = await userRoles.reduce<Promise<Record<UserRole, TestUser>>>(
    async (accPromise, role) => {
      const acc = await accPromise;
      const created = await payload.create({
        collection: 'users',
        data: {
          displayName: `${role} user`,
          email: `${testPrefix}-seed-${role}@example.test`,
          password: 'TestPassword123!',
          roles: [role],
        },
        overrideAccess: true,
      });

      return {
        ...acc,
        [role]: {
          ...(created as unknown as Omit<TestUser, 'collection'>),
          collection: 'users',
        },
      };
    },
    Promise.resolve({} as Record<UserRole, TestUser>),
  );

  return { databaseDirectory, payload, users };
})();

function sourceFields(suffix: string) {
  return {
    sourceId: `${testPrefix}-${suffix}`,
    sourceType: 'test',
  };
}

type CreatedPlayerRecord = {
  id: number;
  name: string;
  status: string;
  user?: unknown;
};

async function createPlayerWithRawData(
  payload: Awaited<typeof payloadState>['payload'],
  data: Record<string, unknown>,
  user: unknown,
): Promise<CreatedPlayerRecord> {
  return (
    payload.create as unknown as (args: {
      collection: 'players';
      data: Record<string, unknown>;
      overrideAccess: false;
      user: unknown;
    }) => Promise<CreatedPlayerRecord>
  )({
    collection: 'players',
    data,
    overrideAccess: false,
    user,
  });
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
    'denies anonymous Local API reads across all collections and club settings',
    async () => {
      const { payload } = await payloadState;
      const collectionSlugs = [
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
      ] as const;

      await collectionSlugs.reduce(async (previous, collection) => {
        await previous;
        await expect(
          payload.find({
            collection,
            overrideAccess: false,
          }),
          collection,
        ).rejects.toThrow();
      }, Promise.resolve());

      await expect(
        payload.findGlobal({
          slug: 'club-settings',
          overrideAccess: false,
        }),
      ).rejects.toThrow();
    },
    integrationTestTimeout,
  );

  it(
    'enforces explicit role grants across director, team-manager, treasurer, editor, and draft isolation',
    async () => {
      const { payload, users } = await payloadState;
      const { administrator, director, editor, member, treasurer } = users;
      const teamManager = users['team-manager'];

      await expect(
        payload.create({
          collection: 'teams',
          data: {
            name: 'Editor Denied Team',
            slug: 'editor-denied-team',
          },
          overrideAccess: false,
          user: editor,
        }),
      ).rejects.toThrow();

      await expect(
        payload.find({
          collection: 'teams',
          overrideAccess: false,
          user: editor,
        }),
      ).rejects.toThrow();

      const team = await payload.create({
        collection: 'teams',
        data: {
          contactEmail: 'opponent@example.test',
          contactPhone: '+32 470 00 00 00',
          generateSlug: true,
          name: 'Manager Team',
          slug: '',
        },
        overrideAccess: false,
        user: teamManager,
      });
      expect(team.slug).toBe('manager-team');

      const updatedTeam = await payload.update({
        collection: 'teams',
        data: {
          name: 'Updated Manager Team',
        },
        id: team.id,
        overrideAccess: false,
        user: teamManager,
      });
      expect(updatedTeam.name).toBe('Updated Manager Team');

      const memberTeamView = await payload.findByID({
        collection: 'teams',
        id: team.id,
        overrideAccess: false,
        user: member,
      });
      expect(memberTeamView.name).toBe('Updated Manager Team');
      expect(memberTeamView.contactEmail).toBeUndefined();
      expect(memberTeamView.contactPhone).toBeUndefined();

      const directorTeamView = await payload.findByID({
        collection: 'teams',
        id: team.id,
        overrideAccess: false,
        user: director,
      });
      expect(directorTeamView.name).toBe('Updated Manager Team');
      expect(directorTeamView.contactEmail).toBeUndefined();
      expect(directorTeamView.contactPhone).toBeUndefined();

      const teamManagerView = await payload.findByID({
        collection: 'teams',
        id: team.id,
        overrideAccess: false,
        user: teamManager,
      });
      expect(teamManagerView.contactEmail).toBe('opponent@example.test');
      expect(teamManagerView.contactPhone).toBe('+32 470 00 00 00');

      const teamManagerVenue = await payload.create({
        collection: 'venues',
        data: {
          generateSlug: true,
          name: 'Manager Venue',
          slug: '',
        },
        overrideAccess: false,
        user: teamManager,
      });
      const updatedVenue = await payload.update({
        collection: 'venues',
        data: { name: 'Updated Manager Venue' },
        id: teamManagerVenue.id,
        overrideAccess: false,
        user: teamManager,
      });
      expect(updatedVenue.name).toBe('Updated Manager Venue');

      expect(
        (
          await payload.findByID({
            collection: 'venues',
            id: teamManagerVenue.id,
            overrideAccess: false,
            user: director,
          })
        ).name,
      ).toBe('Updated Manager Venue');

      const directorLeague = await payload.create({
        collection: 'leagues',
        data: {
          generateSlug: true,
          name: 'Director League',
          slug: '',
        },
        overrideAccess: false,
        user: director,
      });
      const updatedLeague = await payload.update({
        collection: 'leagues',
        data: { name: 'Updated Director League' },
        id: directorLeague.id,
        overrideAccess: false,
        user: director,
      });
      expect(updatedLeague.name).toBe('Updated Director League');

      const directorSeason = await payload.create({
        collection: 'seasons',
        data: { name: '2026-2027' },
        overrideAccess: false,
        user: director,
      });
      const updatedSeason = await payload.update({
        collection: 'seasons',
        data: { name: '2026-2027 Updated' },
        id: directorSeason.id,
        overrideAccess: false,
        user: director,
      });
      expect(updatedSeason.name).toBe('2026-2027 Updated');

      const directorPlayer = await createPlayerWithRawData(
        payload,
        {
          name: 'Director Player',
          user: member.id,
        },
        director,
      );
      expect(directorPlayer.name).toBe('Director Player');
      expect(directorPlayer.user).toBeTruthy();
      expect(
        (
          await payload.findByID({
            collection: 'players',
            id: directorPlayer.id,
            overrideAccess: false,
            user: member,
          })
        ).user,
      ).toBeUndefined();
      const updatedDirectorPlayer = await payload.update({
        collection: 'players',
        data: { name: 'Updated Director Player' },
        id: directorPlayer.id,
        overrideAccess: false,
        user: director,
      });
      expect(updatedDirectorPlayer.name).toBe('Updated Director Player');

      expect(
        (
          await payload.findByID({
            collection: 'leagues',
            id: directorLeague.id,
            overrideAccess: false,
            user: teamManager,
          })
        ).name,
      ).toBe('Updated Director League');
      expect(
        (
          await payload.findByID({
            collection: 'seasons',
            id: directorSeason.id,
            overrideAccess: false,
            user: teamManager,
          })
        ).name,
      ).toBe('2026-2027 Updated');

      await [director, editor, treasurer].reduce(
        async (previous, nonTeamManagerUser) => {
          await previous;
          await expect(
            payload.create({
              collection: 'venues',
              data: {
                generateSlug: true,
                name: 'Forbidden Venue',
                slug: '',
              },
              overrideAccess: false,
              user: nonTeamManagerUser,
            }),
            nonTeamManagerUser.roles.join(','),
          ).rejects.toThrow();
        },
        Promise.resolve(),
      );

      await [editor, teamManager, treasurer].reduce(
        async (previous, nonDirectorUser) => {
          await previous;
          await expect(
            payload.create({
              collection: 'leagues',
              data: {
                generateSlug: true,
                name: 'Forbidden League',
                slug: '',
              },
              overrideAccess: false,
              user: nonDirectorUser,
            }),
            nonDirectorUser.roles.join(','),
          ).rejects.toThrow();
          await expect(
            payload.create({
              collection: 'seasons',
              data: { name: 'Forbidden Season' },
              overrideAccess: false,
              user: nonDirectorUser,
            }),
            nonDirectorUser.roles.join(','),
          ).rejects.toThrow();
          await expect(
            createPlayerWithRawData(
              payload,
              { name: 'Forbidden Player' },
              nonDirectorUser,
            ),
            nonDirectorUser.roles.join(','),
          ).rejects.toThrow();
        },
        Promise.resolve(),
      );

      await payload.delete({
        collection: 'players',
        id: directorPlayer.id,
        overrideAccess: false,
        user: director,
      });
      await payload.delete({
        collection: 'seasons',
        id: directorSeason.id,
        overrideAccess: false,
        user: director,
      });
      await payload.delete({
        collection: 'leagues',
        id: directorLeague.id,
        overrideAccess: false,
        user: director,
      });
      await payload.delete({
        collection: 'venues',
        id: teamManagerVenue.id,
        overrideAccess: false,
        user: teamManager,
      });

      const teamManagerMatch = await payload.create({
        collection: 'matches',
        data: {
          date: testTimestamp,
          homeTeam: team.id,
          title: 'Manager Match',
        },
        overrideAccess: false,
        user: teamManager,
      });
      expect(teamManagerMatch.title).toBe('Manager Match');

      const updatedMatch = await payload.update({
        collection: 'matches',
        data: { title: 'Updated Manager Match' },
        id: teamManagerMatch.id,
        overrideAccess: false,
        user: teamManager,
      });
      expect(updatedMatch.title).toBe('Updated Manager Match');

      expect(
        (
          await payload.find({
            collection: 'matches',
            overrideAccess: false,
            user: editor,
          })
        ).docs,
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: teamManagerMatch.id }),
        ]),
      );

      await [director, editor, treasurer].reduce(
        async (previous, nonTeamManagerUser) => {
          await previous;
          await expect(
            payload.create({
              collection: 'matches',
              data: {
                date: testTimestamp,
                title: 'Forbidden Match',
              },
              overrideAccess: false,
              user: nonTeamManagerUser,
            }),
            nonTeamManagerUser.roles.join(','),
          ).rejects.toThrow();
        },
        Promise.resolve(),
      );

      await payload.delete({
        collection: 'matches',
        id: teamManagerMatch.id,
        overrideAccess: false,
        user: teamManager,
      });

      const draftNews = await payload.create({
        collection: 'news',
        data: {
          _status: 'draft',
          owner: administrator.id,
          publishedAt: testTimestamp,
          slug: 'draft-news',
          title: 'Draft News',
        },
        depth: 0,
        overrideAccess: false,
        user: editor,
      });
      expect(draftNews._status).toBe('draft');
      expect(draftNews.owner).toBe(editor.id);
      expect(draftNews.author).toBe(editor.id);

      const editorUpdatedNews = await payload.update({
        collection: 'news',
        data: {
          author: administrator.id,
          owner: administrator.id,
          title: 'Updated Draft News',
        },
        depth: 0,
        id: draftNews.id,
        overrideAccess: false,
        user: editor,
      });
      expect(editorUpdatedNews.title).toBe('Updated Draft News');
      expect(editorUpdatedNews.author).toBe(administrator.id);
      expect(editorUpdatedNews.owner).toBe(editor.id);

      const adminUpdatedNews = await payload.update({
        collection: 'news',
        data: {
          author: editor.id,
          owner: administrator.id,
        },
        depth: 0,
        id: draftNews.id,
        overrideAccess: false,
        user: administrator,
      });
      expect(adminUpdatedNews.author).toBe(editor.id);
      expect(adminUpdatedNews.owner).toBe(editor.id);

      await [director, member, treasurer, teamManager].reduce(
        async (previous, nonEditorialUser) => {
          await previous;
          await expect(
            payload.find({
              collection: 'news',
              draft: false,
              overrideAccess: false,
              user: nonEditorialUser,
            }),
            nonEditorialUser.roles.join(','),
          ).rejects.toThrow();
          await expect(
            payload.findVersions({
              collection: 'news',
              overrideAccess: false,
              user: nonEditorialUser,
            }),
            nonEditorialUser.roles.join(','),
          ).rejects.toThrow();
        },
        Promise.resolve(),
      );

      const editorVersions = await payload.findVersions({
        collection: 'news',
        overrideAccess: false,
        user: editor,
      });
      expect(editorVersions.docs.length).toBeGreaterThan(0);

      await expect(
        payload.delete({
          collection: 'news',
          id: draftNews.id,
          overrideAccess: false,
          user: director,
        }),
      ).rejects.toThrow();

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
      await expect(
        payload.delete({
          collection: 'teams',
          id: team.id,
          overrideAccess: false,
          user: director,
        }),
      ).rejects.toThrow();
      await payload.delete({
        collection: 'teams',
        id: team.id,
        overrideAccess: false,
        user: teamManager,
      });

      const event = await payload.create({
        collection: 'team-events',
        data: {
          date: testTimestamp,
          title: 'Manager Event',
          type: 'training',
        },
        overrideAccess: false,
        user: teamManager,
      });
      expect(event.title).toBe('Manager Event');
      expect(
        (
          await payload.find({
            collection: 'team-events',
            overrideAccess: false,
            user: member,
          })
        ).docs,
      ).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: event.id })]),
      );
      await [director, editor, treasurer].reduce(
        async (previous, forbiddenUser) => {
          await previous;
          await expect(
            payload.find({
              collection: 'team-events',
              overrideAccess: false,
              user: forbiddenUser,
            }),
            forbiddenUser.roles.join(','),
          ).rejects.toThrow();
        },
        Promise.resolve(),
      );
      await payload.delete({
        collection: 'team-events',
        id: event.id,
        overrideAccess: false,
        user: teamManager,
      });

      const booking = await payload.create({
        collection: 'bookings',
        data: {
          date: testTimestamp,
          status: 'planned',
        },
        overrideAccess: false,
        user: treasurer,
      });
      expect(booking.status).toBe('planned');
      await [director, editor, member, teamManager].reduce(
        async (previous, nonTreasurerUser) => {
          await previous;
          await expect(
            payload.find({
              collection: 'bookings',
              overrideAccess: false,
              user: nonTreasurerUser,
            }),
            nonTreasurerUser.roles.join(','),
          ).rejects.toThrow();
        },
        Promise.resolve(),
      );
      await payload.delete({
        collection: 'bookings',
        id: booking.id,
        overrideAccess: false,
        user: treasurer,
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
      await expect(
        payload.find({
          collection: 'source-records',
          overrideAccess: false,
          user: editor,
        }),
      ).rejects.toThrow();
      await payload.delete({
        collection: 'source-records',
        id: sourceRecord.id,
        overrideAccess: false,
        user: administrator,
      });

      await [editor, teamManager, treasurer, member].reduce(
        async (previous, nonDirectorUser) => {
          await previous;
          await expect(
            payload.findGlobal({
              slug: 'club-settings',
              overrideAccess: false,
              user: nonDirectorUser,
            }),
            nonDirectorUser.roles.join(','),
          ).rejects.toThrow();
          await expect(
            payload.updateGlobal({
              slug: 'club-settings',
              data: { clubName: 'Forbidden Update' },
              overrideAccess: false,
              user: nonDirectorUser,
            }),
            nonDirectorUser.roles.join(','),
          ).rejects.toThrow();
        },
        Promise.resolve(),
      );
      const directorClubSettings = await payload.updateGlobal({
        slug: 'club-settings',
        data: { clubName: 'Goldgetters Director' },
        overrideAccess: false,
        user: director,
      });
      expect(directorClubSettings.clubName).toBe('Goldgetters Director');
      const updatedClubSettings = await payload.updateGlobal({
        slug: 'club-settings',
        data: { clubName: 'Goldgetters Updated' },
        overrideAccess: false,
        user: administrator,
      });
      expect(updatedClubSettings.clubName).toBe('Goldgetters Updated');
    },
    integrationTestTimeout,
  );

  it(
    'scopes user reads, protects player user links, and enforces required fields',
    async () => {
      const { payload, users } = await payloadState;
      const bootstrapAdmin = users.administrator;

      const adminUser = await payload.create({
        collection: 'users',
        data: {
          displayName: 'Admin User',
          email: `${testPrefix}-admin@example.test`,
          password: 'TestPassword123!',
          roles: ['administrator'],
        },
        overrideAccess: false,
        user: bootstrapAdmin,
      });
      const editorUser = await payload.create({
        collection: 'users',
        data: {
          displayName: 'Editor User',
          email: `${testPrefix}-editor@example.test`,
          password: 'TestPassword123!',
          roles: ['editor'],
        },
        overrideAccess: false,
        user: bootstrapAdmin,
      });
      const memberUser = await payload.create({
        collection: 'users',
        data: {
          displayName: 'Member User',
          email: `${testPrefix}-member@example.test`,
          password: 'TestPassword123!',
          roles: ['member'],
        },
        overrideAccess: false,
        user: bootstrapAdmin,
      });

      const editorVisibleUsers = await payload.find({
        collection: 'users',
        overrideAccess: false,
        user: editorUser,
      });
      expect(editorVisibleUsers.docs.map((doc) => doc.id)).toEqual([
        editorUser.id,
      ]);
      expect(editorVisibleUsers.docs.map((doc) => doc.id)).not.toContain(
        adminUser.id,
      );
      expect(editorVisibleUsers.docs.map((doc) => doc.id)).not.toContain(
        memberUser.id,
      );

      const memberVisibleUsers = await payload.find({
        collection: 'users',
        overrideAccess: false,
        user: memberUser,
      });
      expect(memberVisibleUsers.docs.map((doc) => doc.id)).toEqual([
        memberUser.id,
      ]);

      const selfUpdatedMember = await payload.update({
        collection: 'users',
        data: {
          displayName: 'Self Updated Member',
          roles: ['administrator'],
        },
        id: memberUser.id,
        overrideAccess: false,
        user: memberUser,
      });
      expect(selfUpdatedMember.displayName).toBe('Self Updated Member');
      expect(selfUpdatedMember.roles).toEqual(['member']);

      const multiRoleUser = await payload.create({
        collection: 'users',
        data: {
          displayName: 'Multi Role User',
          email: `${testPrefix}-multi@example.test`,
          password: 'TestPassword123!',
          roles: ['editor', 'treasurer', 'member'],
        },
        overrideAccess: false,
        user: adminUser,
      });
      expect(multiRoleUser.roles).toEqual(['editor', 'treasurer', 'member']);

      const multiRoleNews = await payload.create({
        collection: 'news',
        data: {
          _status: 'draft',
          slug: 'multi-role-news',
          title: 'Multi Role News',
        },
        depth: 0,
        overrideAccess: false,
        user: multiRoleUser,
      });
      expect(multiRoleNews.author).toBe(multiRoleUser.id);
      const multiRoleBooking = await payload.create({
        collection: 'bookings',
        data: {
          date: testTimestamp,
          status: 'planned',
        },
        overrideAccess: false,
        user: multiRoleUser,
      });
      const multiRoleEvents = await payload.find({
        collection: 'team-events',
        overrideAccess: false,
        user: multiRoleUser,
      });
      expect(multiRoleEvents.docs).toEqual(expect.any(Array));

      await expect(
        payload.create({
          collection: 'matches',
          data: {
            date: testTimestamp,
            title: 'Multi Role Forbidden Match',
          },
          overrideAccess: false,
          user: multiRoleUser,
        }),
      ).rejects.toThrow();
      await expect(
        payload.findGlobal({
          slug: 'club-settings',
          overrideAccess: false,
          user: multiRoleUser,
        }),
      ).rejects.toThrow();

      await payload.delete({
        collection: 'bookings',
        id: multiRoleBooking.id,
        overrideAccess: false,
        user: multiRoleUser,
      });
      await payload.delete({
        collection: 'news',
        id: multiRoleNews.id,
        overrideAccess: false,
        user: multiRoleUser,
      });
      await payload.delete({
        collection: 'users',
        id: multiRoleUser.id,
        overrideAccess: false,
        user: adminUser,
      });

      await expect(
        payload.update({
          collection: 'users',
          data: { displayName: 'Tampered Editor' },
          id: editorUser.id,
          overrideAccess: false,
          user: memberUser,
        }),
      ).rejects.toThrow();

      await expect(
        createPlayerWithRawData(payload, {}, adminUser),
      ).rejects.toThrow();

      const playerData = {
        name: 'Valid Player',
        user: memberUser.id,
      };
      await expect(
        createPlayerWithRawData(payload, playerData, editorUser),
      ).rejects.toThrow();

      const player = await createPlayerWithRawData(
        payload,
        playerData,
        adminUser,
      );
      expect(player.status).toBe('active');
      expect(player.user).toBeTruthy();

      const memberPlayerView = await payload.findByID({
        collection: 'players',
        id: player.id,
        overrideAccess: false,
        user: memberUser,
      });
      expect(memberPlayerView.name).toBe('Valid Player');
      expect(memberPlayerView.user).toBeUndefined();

      await expect(
        payload.update({
          collection: 'players',
          data: { name: 'Updated Player' },
          id: player.id,
          overrideAccess: false,
          user: editorUser,
        }),
      ).rejects.toThrow();
      await expect(
        payload.delete({
          collection: 'players',
          id: player.id,
          overrideAccess: false,
          user: editorUser,
        }),
      ).rejects.toThrow();

      await payload.delete({
        collection: 'players',
        id: player.id,
        overrideAccess: false,
        user: adminUser,
      });
      await payload.delete({
        collection: 'users',
        id: memberUser.id,
        overrideAccess: false,
        user: adminUser,
      });
      await payload.delete({
        collection: 'users',
        id: editorUser.id,
        overrideAccess: false,
        user: adminUser,
      });
      await payload.delete({
        collection: 'users',
        id: adminUser.id,
        overrideAccess: false,
        user: bootstrapAdmin,
      });
    },
    integrationTestTimeout,
  );

  it(
    'keeps domain collections free of source fields and enforces source-records contracts',
    async () => {
      const { payload, users } = await payloadState;
      const { administrator } = users;
      const teamManager = users['team-manager'];

      const nativeLeague = await payload.create({
        collection: 'leagues',
        data: {
          generateSlug: true,
          name: 'Native League',
          slug: '',
        },
        overrideAccess: false,
        user: administrator,
      });
      const nativeTeam = await payload.create({
        collection: 'teams',
        data: {
          generateSlug: true,
          name: 'Native Team',
          slug: '',
        },
        overrideAccess: false,
        user: teamManager,
      });
      expect(nativeLeague.name).toBe('Native League');
      expect(nativeTeam.name).toBe('Native Team');

      const createRawSourceRecord = (data: Record<string, unknown>) =>
        (
          payload.create as unknown as (args: {
            collection: 'source-records';
            data: Record<string, unknown>;
            overrideAccess: false;
            user: unknown;
          }) => Promise<unknown>
        )({
          collection: 'source-records',
          data,
          overrideAccess: false,
          user: administrator,
        });

      await expect(
        createRawSourceRecord({
          targetCollection: 'leagues',
          targetId: String(nativeLeague.id),
        }),
      ).rejects.toThrow();

      await expect(
        createRawSourceRecord({
          sourceId: '   ',
          sourceType: 'liga',
          targetCollection: 'leagues',
          targetId: String(nativeLeague.id),
        }),
      ).rejects.toThrow();

      await expect(
        createRawSourceRecord({
          sourceId: `${testPrefix}-missing-type`,
          sourceType: '   ',
          targetCollection: 'leagues',
          targetId: String(nativeLeague.id),
        }),
      ).rejects.toThrow();

      const legacySourceRecord = await payload.create({
        collection: 'source-records',
        data: {
          ...sourceFields('migrated-league'),
          sourceUpdatedAt: '0000-00-00 00:00:00',
          targetCollection: 'leagues',
          targetId: String(nativeLeague.id),
        },
        overrideAccess: false,
        user: administrator,
      });
      expect(legacySourceRecord.sourceId).toBe(`${testPrefix}-migrated-league`);
      expect(legacySourceRecord.sourceType).toBe('test');
      expect(legacySourceRecord.sourceUpdatedAt).toBe('0000-00-00 00:00:00');

      const whitespaceTimestampRecord = await payload.create({
        collection: 'source-records',
        data: {
          ...sourceFields('migrated-team'),
          sourceUpdatedAt: '   ',
          targetCollection: 'teams',
          targetId: String(nativeTeam.id),
        },
        overrideAccess: false,
        user: administrator,
      });
      expect(whitespaceTimestampRecord.sourceUpdatedAt).toBeNull();

      await expect(
        payload.create({
          collection: 'source-records',
          data: {
            ...sourceFields('migrated-league'),
            targetCollection: 'leagues',
            targetId: String(nativeLeague.id),
          },
          overrideAccess: false,
          user: administrator,
        }),
      ).rejects.toThrow();

      const sameRawIdUser = await payload.create({
        collection: 'source-records',
        data: {
          sourceId: `${testPrefix}-shared-42`,
          sourceType: 'user',
          targetCollection: 'users',
          targetId: '1',
        },
        overrideAccess: false,
        user: administrator,
      });
      const sameRawIdFile = await payload.create({
        collection: 'source-records',
        data: {
          sourceId: `${testPrefix}-shared-42`,
          sourceType: 'file',
          targetCollection: 'media',
          targetId: '2',
        },
        overrideAccess: false,
        user: administrator,
      });
      expect(sameRawIdUser.sourceId).toBe(sameRawIdFile.sourceId);
      expect(sameRawIdUser.sourceType).toBe('user');
      expect(sameRawIdFile.sourceType).toBe('file');

      await payload.delete({
        collection: 'source-records',
        id: sameRawIdFile.id,
        overrideAccess: false,
        user: administrator,
      });
      await payload.delete({
        collection: 'source-records',
        id: sameRawIdUser.id,
        overrideAccess: false,
        user: administrator,
      });
      await payload.delete({
        collection: 'source-records',
        id: whitespaceTimestampRecord.id,
        overrideAccess: false,
        user: administrator,
      });
      await payload.delete({
        collection: 'source-records',
        id: legacySourceRecord.id,
        overrideAccess: false,
        user: administrator,
      });
      await payload.delete({
        collection: 'teams',
        id: nativeTeam.id,
        overrideAccess: false,
        user: teamManager,
      });
      await payload.delete({
        collection: 'leagues',
        id: nativeLeague.id,
        overrideAccess: false,
        user: administrator,
      });
    },
    integrationTestTimeout,
  );

  it(
    'restricts editor updates and deletes to own attributed editorial records',
    async () => {
      const { payload, users } = await payloadState;
      const { administrator, editor } = users;

      const secondEditor = await payload.create({
        collection: 'users',
        data: {
          displayName: 'Second Editor',
          email: `${testPrefix}-second-editor@example.test`,
          password: 'TestPassword123!',
          roles: ['editor'],
        },
        overrideAccess: false,
        user: administrator,
      });

      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64',
      );

      const ownedNews = await payload.create({
        collection: 'news',
        data: {
          _status: 'draft',
          generateSlug: true,
          owner: administrator.id,
          slug: '',
          title: 'Editor Owned News',
        },
        depth: 0,
        overrideAccess: false,
        user: editor,
      });
      const ownedReport = await payload.create({
        collection: 'reports',
        data: {
          _status: 'draft',
          owner: administrator.id,
          title: 'Editor Owned Report',
        },
        depth: 0,
        overrideAccess: false,
        user: editor,
      });
      const ownedPreview = await payload.create({
        collection: 'previews',
        data: {
          _status: 'draft',
          owner: administrator.id,
          title: 'Editor Owned Preview',
        },
        depth: 0,
        overrideAccess: false,
        user: editor,
      });
      const ownedAlbum = await payload.create({
        collection: 'albums',
        data: {
          _status: 'draft',
          owner: administrator.id,
          title: 'Editor Owned Album',
        },
        depth: 0,
        overrideAccess: false,
        user: editor,
      });
      const ownedMedia = await payload.create({
        collection: 'media',
        data: {
          alt: 'Editor Owned Media',
          uploadedBy: administrator.id,
        },
        depth: 0,
        file: {
          data: pngBuffer,
          mimetype: 'image/png',
          name: `${testPrefix}-owned.png`,
          size: pngBuffer.byteLength,
        },
        overrideAccess: false,
        user: editor,
      });

      expect(ownedNews.owner).toBe(editor.id);
      expect(ownedNews.author).toBe(editor.id);
      expect(ownedReport.owner).toBe(editor.id);
      expect(ownedReport.author).toBe(editor.id);
      expect(ownedPreview.owner).toBe(editor.id);
      expect(ownedPreview.author).toBe(editor.id);
      expect(ownedAlbum.owner).toBe(editor.id);
      expect(ownedAlbum.photographer).toBe(editor.id);
      expect(ownedMedia.uploadedBy).toBe(editor.id);

      const updatedReport = await payload.update({
        collection: 'reports',
        data: {
          author: administrator.id,
          owner: administrator.id,
          title: 'Editor Updated Own Report',
        },
        depth: 0,
        id: ownedReport.id,
        overrideAccess: false,
        user: editor,
      });
      expect(updatedReport.title).toBe('Editor Updated Own Report');
      expect(updatedReport.author).toBe(administrator.id);
      expect(updatedReport.owner).toBe(editor.id);

      const updatedMedia = await payload.update({
        collection: 'media',
        data: {
          alt: 'Updated Editor Media',
          uploadedBy: administrator.id,
        },
        depth: 0,
        id: ownedMedia.id,
        overrideAccess: false,
        user: editor,
      });
      expect(updatedMedia.alt).toBe('Updated Editor Media');
      expect(updatedMedia.uploadedBy).toBe(editor.id);

      const editorialTargets = [
        {
          collection: 'news',
          id: ownedNews.id,
          updateData: { title: 'Tampered News' },
        },
        {
          collection: 'reports',
          id: ownedReport.id,
          updateData: { title: 'Tampered Report' },
        },
        {
          collection: 'previews',
          id: ownedPreview.id,
          updateData: { title: 'Tampered Preview' },
        },
        {
          collection: 'albums',
          id: ownedAlbum.id,
          updateData: { title: 'Tampered Album' },
        },
        {
          collection: 'media',
          id: ownedMedia.id,
          updateData: { alt: 'Tampered Media' },
        },
      ] as const;

      await editorialTargets.reduce(async (previous, target) => {
        await previous;

        const visible = await payload.findByID({
          collection: target.collection,
          id: target.id,
          overrideAccess: false,
          user: secondEditor,
        });
        expect(visible.id).toBe(target.id);

        await expect(
          (
            payload.update as unknown as (args: {
              collection: string;
              data: Record<string, unknown>;
              id: number | string;
              overrideAccess: false;
              user: unknown;
            }) => Promise<unknown>
          )({
            collection: target.collection,
            data: target.updateData,
            id: target.id,
            overrideAccess: false,
            user: secondEditor,
          }),
          `${target.collection}.update`,
        ).rejects.toThrow();

        await expect(
          payload.delete({
            collection: target.collection,
            id: target.id,
            overrideAccess: false,
            user: secondEditor,
          }),
          `${target.collection}.delete`,
        ).rejects.toThrow();
      }, Promise.resolve());

      const adminNews = await payload.create({
        collection: 'news',
        data: {
          _status: 'draft',
          author: administrator.id,
          generateSlug: true,
          slug: '',
          title: 'Admin Owned News',
        },
        depth: 0,
        overrideAccess: false,
        user: administrator,
      });

      await expect(
        payload.update({
          collection: 'news',
          data: { title: 'Editor Cannot Edit Admin News' },
          id: adminNews.id,
          overrideAccess: false,
          user: editor,
        }),
      ).rejects.toThrow();
      await expect(
        payload.delete({
          collection: 'news',
          id: adminNews.id,
          overrideAccess: false,
          user: editor,
        }),
      ).rejects.toThrow();

      await payload.delete({
        collection: 'news',
        id: adminNews.id,
        overrideAccess: false,
        user: administrator,
      });

      await editorialTargets.reduce(async (previous, target) => {
        await previous;
        await payload.delete({
          collection: target.collection,
          id: target.id,
          overrideAccess: false,
          user: editor,
        });
      }, Promise.resolve());

      await payload.delete({
        collection: 'users',
        id: secondEditor.id,
        overrideAccess: false,
        user: administrator,
      });
    },
    integrationTestTimeout,
  );

  it(
    'grants active linked players read-only access to bookings without exposing bookings to reserve, inactive, historical, or unlinked members',
    async () => {
      const { payload, users } = await payloadState;
      const { administrator, director, member, treasurer } = users;

      const season = await payload.create({
        collection: 'seasons',
        data: { name: 'Finance Visibility Season' },
        overrideAccess: false,
        user: director,
      });

      const booking = await payload.create({
        collection: 'bookings',
        data: {
          amount: 100,
          category: 'Lidgeld',
          date: testTimestamp,
          season: season.id,
          status: 'paid',
        },
        depth: 0,
        overrideAccess: false,
        user: treasurer,
      });

      await expect(
        payload.find({
          collection: 'bookings',
          overrideAccess: false,
          user: member,
        }),
      ).rejects.toThrow();
      await expect(
        payload.find({
          collection: 'seasons',
          overrideAccess: false,
          user: member,
        }),
      ).rejects.toThrow();

      const linkedPlayer = await createPlayerWithRawData(
        payload,
        {
          name: 'Active Linked Player',
          status: 'active',
          user: member.id,
        },
        administrator,
      );

      const playerBookings = await payload.find({
        collection: 'bookings',
        overrideAccess: false,
        user: member,
      });
      expect(playerBookings.docs).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: booking.id })]),
      );

      const playerBookingById = await payload.findByID({
        collection: 'bookings',
        depth: 1,
        id: booking.id,
        overrideAccess: false,
        user: member,
      });
      expect(playerBookingById.id).toBe(booking.id);

      const playerSeasonView = await payload.findByID({
        collection: 'seasons',
        id: season.id,
        overrideAccess: false,
        user: member,
      });
      expect(playerSeasonView.name).toBe('Finance Visibility Season');

      await expect(
        payload.create({
          collection: 'bookings',
          data: { date: testTimestamp, status: 'planned' },
          overrideAccess: false,
          user: member,
        }),
      ).rejects.toThrow();
      await expect(
        payload.update({
          collection: 'bookings',
          data: { status: 'cancelled' },
          id: booking.id,
          overrideAccess: false,
          user: member,
        }),
      ).rejects.toThrow();
      await expect(
        payload.delete({
          collection: 'bookings',
          id: booking.id,
          overrideAccess: false,
          user: member,
        }),
      ).rejects.toThrow();

      await (['reserve', 'inactive', 'historical'] as const).reduce(
        async (previous, deniedStatus) => {
          await previous;
          await payload.update({
            collection: 'players',
            data: { status: deniedStatus },
            id: linkedPlayer.id,
            overrideAccess: false,
            user: director,
          });
          await expect(
            payload.find({
              collection: 'bookings',
              overrideAccess: false,
              user: member,
            }),
            deniedStatus,
          ).rejects.toThrow();
          await expect(
            payload.find({
              collection: 'seasons',
              overrideAccess: false,
              user: member,
            }),
            deniedStatus,
          ).rejects.toThrow();
        },
        Promise.resolve(),
      );

      await payload.update({
        collection: 'players',
        data: { status: 'active' },
        id: linkedPlayer.id,
        overrideAccess: false,
        user: director,
      });
      expect(
        (
          await payload.findByID({
            collection: 'bookings',
            id: booking.id,
            overrideAccess: false,
            user: member,
          })
        ).id,
      ).toBe(booking.id);

      await payload.delete({
        collection: 'bookings',
        id: booking.id,
        overrideAccess: false,
        user: treasurer,
      });
      await payload.delete({
        collection: 'players',
        id: linkedPlayer.id,
        overrideAccess: false,
        user: director,
      });
      await payload.delete({
        collection: 'seasons',
        id: season.id,
        overrideAccess: false,
        user: director,
      });
    },
    integrationTestTimeout,
  );

  it(
    'allows director to onboard non-admin users, update self, and link players while reserving other account changes for administrators',
    async () => {
      const { payload, users } = await payloadState;
      const { administrator, director } = users;

      const createdMemberEmail = `${testPrefix}-director-managed@example.test`;
      const createdMember = await payload.create({
        collection: 'users',
        data: {
          displayName: 'Director Managed Member',
          email: createdMemberEmail,
          password: 'TestPassword123!',
          roles: ['member', 'editor'],
        },
        overrideAccess: false,
        user: director,
      });
      expect(createdMember.roles).toEqual(['member', 'editor']);

      const visibleUsers = await payload.find({
        collection: 'users',
        overrideAccess: false,
        user: director,
      });
      expect(visibleUsers.docs.map((doc) => doc.id)).toEqual(
        expect.arrayContaining([createdMember.id, administrator.id]),
      );

      const updatedSelf = await payload.update({
        collection: 'users',
        data: { displayName: 'Director Updated Self' },
        id: director.id,
        overrideAccess: false,
        user: director,
      });
      expect(updatedSelf.displayName).toBe('Director Updated Self');

      const linkedPlayer = await createPlayerWithRawData(
        payload,
        {
          name: 'Director Linked Player',
          status: 'active',
          user: createdMember.id,
        },
        director,
      );
      expect(linkedPlayer.user).toBeTruthy();

      await expect(
        payload.create({
          collection: 'users',
          data: {
            displayName: 'Escalated Admin',
            email: `${testPrefix}-escalated-single@example.test`,
            password: 'TestPassword123!',
            roles: ['administrator'],
          },
          overrideAccess: false,
          user: director,
        }),
      ).rejects.toThrow();
      await expect(
        payload.create({
          collection: 'users',
          data: {
            displayName: 'Escalated Multi Admin',
            email: `${testPrefix}-escalated-multi@example.test`,
            password: 'TestPassword123!',
            roles: ['member', 'administrator'],
          },
          overrideAccess: false,
          user: director,
        }),
      ).rejects.toThrow();

      const selfEscalationAttempt = await payload.update({
        collection: 'users',
        data: { roles: ['director', 'administrator'] },
        id: director.id,
        overrideAccess: false,
        user: director,
      });
      expect(selfEscalationAttempt.roles).toEqual(['director']);

      const persistedDirector = await payload.findByID({
        collection: 'users',
        id: director.id,
        overrideAccess: false,
        user: administrator,
      });
      expect(persistedDirector.roles).toEqual(['director']);

      const multiRoleAdmin = await payload.create({
        collection: 'users',
        data: {
          displayName: 'Multi Role Admin',
          email: `${testPrefix}-multi-admin@example.test`,
          password: 'TestPassword123!',
          roles: ['administrator', 'member'],
        },
        overrideAccess: false,
        user: administrator,
      });

      await [createdMember.id, administrator.id, multiRoleAdmin.id].reduce(
        async (previous, otherUserId) => {
          await previous;
          await expect(
            payload.update({
              collection: 'users',
              data: { displayName: 'Director Tampered Account' },
              id: otherUserId,
              overrideAccess: false,
              user: director,
            }),
            `update:${otherUserId}`,
          ).rejects.toThrow();
          await expect(
            payload.update({
              collection: 'users',
              data: { roles: ['member'] },
              id: otherUserId,
              overrideAccess: false,
              user: director,
            }),
            `roles:${otherUserId}`,
          ).rejects.toThrow();
          await expect(
            payload.delete({
              collection: 'users',
              id: otherUserId,
              overrideAccess: false,
              user: director,
            }),
            `delete:${otherUserId}`,
          ).rejects.toThrow();
        },
        Promise.resolve(),
      );

      const unlockData = {
        email: createdMemberEmail,
        password: 'TestPassword123!',
      };
      await expect(
        payload.unlock({
          collection: 'users',
          data: unlockData,
          overrideAccess: false,
          req: await createLocalReq(
            { user: { ...director, collection: 'users' } },
            payload,
          ),
        }),
      ).rejects.toThrow();

      await payload.delete({
        collection: 'players',
        id: linkedPlayer.id,
        overrideAccess: false,
        user: director,
      });
      await payload.delete({
        collection: 'users',
        id: createdMember.id,
        overrideAccess: false,
        user: administrator,
      });
      await payload.delete({
        collection: 'users',
        id: multiRoleAdmin.id,
        overrideAccess: false,
        user: administrator,
      });
    },
    integrationTestTimeout,
  );

  it(
    'disables document locks, enforces immutable editorial owners independently of display credits, rejects remote media URLs, and handles forgotPassword uniformly',
    async () => {
      const { payload, users } = await payloadState;
      const { administrator, editor, member } = users;

      expect(
        payload.collections[
          'payload-locked-documents' as keyof typeof payload.collections
        ],
      ).toBeUndefined();

      const secondEditor = await payload.create({
        collection: 'users',
        data: {
          displayName: 'Second Editorial User',
          email: `${testPrefix}-second-lock-editor@example.test`,
          password: 'TestPassword123!',
          roles: ['editor'],
        },
        overrideAccess: false,
        user: administrator,
      });

      const publishedNews = await payload.create({
        collection: 'news',
        data: {
          _status: 'published',
          author: editor.id,
          generateSlug: true,
          slug: '',
          title: 'Published Ownership News',
        },
        depth: 0,
        overrideAccess: false,
        user: editor,
      });
      expect(publishedNews.owner).toBe(editor.id);

      const adminCreditDraft = await payload.update({
        collection: 'news',
        data: {
          _status: 'draft',
          author: secondEditor.id,
          owner: secondEditor.id,
          title: 'Admin Updated Credit Draft',
        },
        depth: 0,
        draft: true,
        id: publishedNews.id,
        overrideAccess: false,
        user: administrator,
      });
      expect(adminCreditDraft.owner).toBe(editor.id);
      expect(adminCreditDraft.author).toBe(secondEditor.id);

      await expect(
        payload.update({
          collection: 'news',
          data: { title: 'Credited Editor Draft Overwrite' },
          draft: true,
          id: publishedNews.id,
          overrideAccess: false,
          user: secondEditor,
        }),
      ).rejects.toThrow();

      await expect(
        payload.update({
          collection: 'news',
          data: {
            _status: 'published',
            title: 'Credited Editor Publish Overwrite',
          },
          draft: false,
          id: publishedNews.id,
          overrideAccess: false,
          user: secondEditor,
        }),
      ).rejects.toThrow();

      await expect(
        payload.delete({
          collection: 'news',
          id: publishedNews.id,
          overrideAccess: false,
          user: secondEditor,
        }),
      ).rejects.toThrow();

      const bulkUpdateResult = await payload.update({
        collection: 'news',
        data: { title: 'Bulk Credited Editor Overwrite' },
        overrideAccess: false,
        user: secondEditor,
        where: { id: { equals: publishedNews.id } },
      });
      expect(bulkUpdateResult.docs).toHaveLength(0);

      const bulkDeleteResult = await payload.delete({
        collection: 'news',
        overrideAccess: false,
        user: secondEditor,
        where: { id: { equals: publishedNews.id } },
      });
      expect(bulkDeleteResult.docs).toHaveLength(0);

      const latestDraft = await payload.findByID({
        collection: 'news',
        depth: 0,
        draft: true,
        id: publishedNews.id,
        overrideAccess: false,
        user: administrator,
      });
      expect(latestDraft.owner).toBe(editor.id);
      expect(latestDraft.author).toBe(secondEditor.id);
      expect(latestDraft.title).toBe('Admin Updated Credit Draft');

      const ownerEditorUpdate = await payload.update({
        collection: 'news',
        data: { title: 'Owner Still Controls Draft' },
        draft: true,
        id: publishedNews.id,
        overrideAccess: false,
        user: editor,
      });
      expect(ownerEditorUpdate.title).toBe('Owner Still Controls Draft');

      await payload.delete({
        collection: 'news',
        id: publishedNews.id,
        overrideAccess: false,
        user: editor,
      });
      await payload.delete({
        collection: 'users',
        id: secondEditor.id,
        overrideAccess: false,
        user: administrator,
      });

      await expect(
        payload.create({
          collection: 'media',
          data: {
            alt: 'Remote Media',
            filename: 'remote.png',
            url: 'https://example.com/remote.png',
          },
          overrideAccess: false,
          user: editor,
        }),
      ).rejects.toThrow('Uploading files from URLs is disabled');

      await expect(
        payload.forgotPassword({
          collection: 'users',
          data: { email: member.email },
          disableEmail: false,
        }),
      ).resolves.toEqual(expect.any(String));

      await expect(
        payload.forgotPassword({
          collection: 'users',
          data: { email: administrator.email },
          disableEmail: false,
          req: { user: member },
        }),
      ).resolves.toEqual(expect.any(String));

      await expect(
        payload.forgotPassword({
          collection: 'users',
          data: { email: `${testPrefix}-missing@example.test` },
          disableEmail: false,
          req: { user: member },
        }),
      ).resolves.toBeNull();
    },
    integrationTestTimeout,
  );

  it(
    'preserves immutable editorial ownership while allowing editable display credits across bulk publishes and draft version restores',
    async () => {
      const { payload, users } = await payloadState;
      const { administrator, editor } = users;

      const secondEditor = await payload.create({
        collection: 'users',
        data: {
          displayName: 'Second Attribution Editor',
          email: `${testPrefix}-attr-editor@example.test`,
          password: 'TestPassword123!',
          roles: ['editor'],
        },
        overrideAccess: false,
        user: administrator,
      });

      const newsDoc = await payload.create({
        collection: 'news',
        data: {
          _status: 'published',
          author: editor.id,
          generateSlug: true,
          slug: '',
          title: 'Initial Published Ownership',
        },
        depth: 0,
        overrideAccess: false,
        user: editor,
      });
      expect(newsDoc.owner).toBe(editor.id);

      const clearedCreditDraft = await payload.update({
        collection: 'news',
        data: {
          _status: 'draft',
          author: null,
          owner: secondEditor.id,
          title: 'Cleared Credit Draft',
        },
        depth: 0,
        draft: true,
        id: newsDoc.id,
        overrideAccess: false,
        user: administrator,
      });
      expect(clearedCreditDraft.owner).toBe(editor.id);
      expect(clearedCreditDraft.author).toBeFalsy();

      const ownerBulkPublished = await payload.update({
        collection: 'news',
        data: {
          _status: 'published',
          owner: secondEditor.id,
          title: 'Bulk Published By Owner Editor',
        },
        depth: 0,
        draft: false,
        overrideAccess: false,
        user: editor,
        where: { id: { equals: newsDoc.id } },
      });
      expect(ownerBulkPublished.docs).toHaveLength(1);
      expect(ownerBulkPublished.docs[0]?.owner).toBe(editor.id);
      expect(ownerBulkPublished.docs[0]?.author).toBeFalsy();

      const adminCreditDraft = await payload.update({
        collection: 'news',
        data: {
          _status: 'draft',
          author: secondEditor.id,
          owner: secondEditor.id,
          title: 'Second Editor Credit Draft',
        },
        depth: 0,
        draft: true,
        id: newsDoc.id,
        overrideAccess: false,
        user: administrator,
      });
      expect(adminCreditDraft.owner).toBe(editor.id);
      expect(adminCreditDraft.author).toBe(secondEditor.id);

      const adminBulkPublished = await payload.update({
        collection: 'news',
        data: {
          _status: 'published',
          owner: secondEditor.id,
          title: 'Admin Bulk Published Preserving Owner',
        },
        depth: 0,
        draft: false,
        overrideAccess: false,
        user: administrator,
        where: { id: { equals: newsDoc.id } },
      });
      expect(adminBulkPublished.docs).toHaveLength(1);
      expect(adminBulkPublished.docs[0]?.owner).toBe(editor.id);
      expect(adminBulkPublished.docs[0]?.author).toBe(secondEditor.id);

      const versions = await payload.findVersions({
        collection: 'news',
        depth: 0,
        overrideAccess: false,
        sort: 'createdAt',
        user: editor,
        where: { parent: { equals: newsDoc.id } },
      });
      const initialVersion = versions.docs.find(
        (versionDoc) =>
          versionDoc.version.title === 'Initial Published Ownership',
      );
      expect(initialVersion).toBeDefined();

      if (initialVersion) {
        const restoredDraft = await payload.restoreVersion({
          collection: 'news',
          depth: 0,
          draft: true,
          id: initialVersion.id,
          overrideAccess: false,
          user: editor,
        });
        expect(restoredDraft.owner).toBe(editor.id);
      }

      await expect(
        payload.update({
          collection: 'news',
          data: { title: 'Second Editor Blocked Despite Display Credit' },
          id: newsDoc.id,
          overrideAccess: false,
          user: secondEditor,
        }),
      ).rejects.toThrow();

      const editorUpdatedAfterRestore = await payload.update({
        collection: 'news',
        data: { title: 'Editor Editable After Restore' },
        draft: true,
        id: newsDoc.id,
        overrideAccess: false,
        user: editor,
      });
      expect(editorUpdatedAfterRestore.title).toBe(
        'Editor Editable After Restore',
      );

      await payload.delete({
        collection: 'news',
        id: newsDoc.id,
        overrideAccess: false,
        user: editor,
      });
      await payload.delete({
        collection: 'users',
        id: secondEditor.id,
        overrideAccess: false,
        user: administrator,
      });
    },
    integrationTestTimeout,
  );

  it(
    'preserves immutable owner across bulk publishes and restores',
    async () => {
      const { payload, users } = await payloadState;
      const { administrator, editor } = users;

      const newsDoc = await payload.create({
        collection: 'news',
        data: {
          _status: 'published',
          author: editor.id,
          generateSlug: true,
          owner: editor.id,
          slug: '',
          title: 'Initial Published News',
        },
        depth: 0,
        overrideAccess: false,
        user: administrator,
      });
      expect(newsDoc.owner).toBe(editor.id);

      await payload.update({
        collection: 'news',
        data: {
          _status: 'draft',
          owner: administrator.id,
          title: 'Admin Updated Owner Draft',
        },
        depth: 0,
        draft: true,
        id: newsDoc.id,
        overrideAccess: false,
        user: administrator,
      });

      const bulkPublished = await payload.update({
        collection: 'news',
        data: {
          _status: 'published',
          owner: administrator.id,
          title: 'Editor Bulk Published Preserving Owner',
        },
        depth: 0,
        draft: false,
        overrideAccess: false,
        user: editor,
        where: { id: { equals: newsDoc.id } },
      });
      expect(bulkPublished.docs).toHaveLength(1);
      expect(bulkPublished.docs[0]?.owner).toBe(editor.id);

      await payload.update({
        collection: 'news',
        data: { title: 'Editor Newer Draft' },
        draft: true,
        id: newsDoc.id,
        overrideAccess: false,
        user: editor,
      });

      const versions = await payload.findVersions({
        collection: 'news',
        depth: 0,
        overrideAccess: false,
        sort: 'createdAt',
        user: administrator,
        where: { parent: { equals: newsDoc.id } },
      });
      const initialVersion = versions.docs.find(
        (versionDoc) => versionDoc.version.title === 'Initial Published News',
      );
      expect(initialVersion).toBeDefined();

      if (initialVersion) {
        await payload.restoreVersion({
          collection: 'news',
          depth: 0,
          draft: true,
          id: initialVersion.id,
          overrideAccess: false,
          user: editor,
        });
      }

      const publishedAfterRestore = await payload.update({
        collection: 'news',
        data: {
          _status: 'published',
          title: 'Published After Editor Restore',
        },
        depth: 0,
        draft: false,
        id: newsDoc.id,
        overrideAccess: false,
        user: administrator,
      });
      expect(publishedAfterRestore.owner).toBe(editor.id);

      await payload.delete({
        collection: 'news',
        id: newsDoc.id,
        overrideAccess: false,
        user: administrator,
      });
    },
    integrationTestTimeout,
  );

  it(
    'blocks director credential changes and deletions after a member is promoted to administrator',
    async () => {
      const { payload, users } = await payloadState;
      const { administrator, director } = users;
      const originalPassword = 'OriginalPassword123!';
      const hijackedPassword = 'HijackedPassword123!';
      const targetEmail = `${testPrefix}-promoted-target@example.test`;

      const targetUser = await payload.create({
        collection: 'users',
        data: {
          displayName: 'Before Promotion',
          email: targetEmail,
          password: originalPassword,
          roles: ['member'],
        },
        overrideAccess: false,
        user: administrator,
      });

      await payload.update({
        collection: 'users',
        data: { roles: ['member', 'administrator'] },
        id: targetUser.id,
        overrideAccess: false,
        user: administrator,
      });

      await expect(
        payload.update({
          collection: 'users',
          data: {
            displayName: 'Director Hijack',
            password: hijackedPassword,
          },
          id: targetUser.id,
          overrideAccess: false,
          user: director,
        }),
      ).rejects.toThrow();

      await expect(
        payload.update({
          collection: 'users',
          data: { roles: ['member'] },
          id: targetUser.id,
          overrideAccess: false,
          user: director,
        }),
      ).rejects.toThrow();

      const persistedTarget = await payload.findByID({
        collection: 'users',
        id: targetUser.id,
        overrideAccess: false,
        user: administrator,
      });
      expect(persistedTarget.roles).toEqual(['member', 'administrator']);
      expect(persistedTarget.displayName).toBe('Before Promotion');

      await expect(
        payload.login({
          collection: 'users',
          data: {
            email: targetEmail,
            password: originalPassword,
          },
        }),
      ).resolves.toMatchObject({ user: { id: targetUser.id } });

      await expect(
        payload.login({
          collection: 'users',
          data: {
            email: targetEmail,
            password: hijackedPassword,
          },
        }),
      ).rejects.toThrow();

      await expect(
        payload.delete({
          collection: 'users',
          id: targetUser.id,
          overrideAccess: false,
          user: director,
        }),
      ).rejects.toThrow();

      await payload.delete({
        collection: 'users',
        id: targetUser.id,
        overrideAccess: false,
        user: administrator,
      });
    },
    integrationTestTimeout,
  );

  it(
    'keeps role writes out of profile, recovery, and login writes and allows deleting editorial owners',
    async () => {
      const { payload, users } = await payloadState;
      const { administrator } = users;
      const password = 'InitialPassword123!';
      const resetPasswordValue = 'ResetPassword123!';
      const targetEmail = `${testPrefix}-role-race@example.test`;

      const targetUser = await payload.create({
        collection: 'users',
        data: {
          displayName: 'Role Race Target',
          email: targetEmail,
          password,
          roles: ['member', 'administrator'],
        },
        overrideAccess: false,
        user: administrator,
      });

      const originalUpdateOne = payload.db.updateOne;
      const runWithConcurrentRevocation = async (
        operation: () => Promise<unknown>,
      ): Promise<void> => {
        await payload.update({
          collection: 'users',
          data: { roles: ['member', 'administrator'] },
          id: targetUser.id,
          overrideAccess: false,
          user: administrator,
        });

        const updateOneSpy = vi
          .spyOn(payload.db, 'updateOne')
          .mockImplementation(async (args) => {
            if (args.collection === 'users' && args.id === targetUser.id) {
              updateOneSpy.mockImplementation(originalUpdateOne);
              await payload.update({
                collection: 'users',
                data: { roles: ['member'] },
                id: targetUser.id,
                overrideAccess: false,
                user: administrator,
              });
            }

            const updatedDoc: unknown = await originalUpdateOne.call(
              payload.db,
              args,
            );
            return updatedDoc as Record<string, unknown>;
          });

        try {
          await operation();
        } finally {
          updateOneSpy.mockRestore();
        }

        const persisted = await payload.findByID({
          collection: 'users',
          id: targetUser.id,
          overrideAccess: false,
          user: administrator,
        });
        expect(persisted.roles).toEqual(['member']);
      };

      await runWithConcurrentRevocation(() =>
        payload.update({
          collection: 'users',
          data: { displayName: 'Concurrent Self Update' },
          id: targetUser.id,
          overrideAccess: false,
          user: targetUser,
        }),
      );

      await runWithConcurrentRevocation(() =>
        payload.update({
          collection: 'users',
          data: {
            displayName: 'Concurrent Non-Admin With Roles',
            roles: ['member', 'administrator'],
          },
          id: targetUser.id,
          overrideAccess: false,
          user: { ...targetUser, roles: ['member'] },
        }),
      );

      await runWithConcurrentRevocation(() =>
        payload.update({
          collection: 'users',
          data: { displayName: 'Concurrent Admin Profile Update' },
          id: targetUser.id,
          overrideAccess: false,
          user: administrator,
        }),
      );

      await runWithConcurrentRevocation(() =>
        payload.forgotPassword({
          collection: 'users',
          data: { email: targetEmail },
          disableEmail: true,
        }),
      );

      await Promise.all([
        payload.update({
          collection: 'users',
          data: { roles: ['member', 'editor'] },
          id: targetUser.id,
          overrideAccess: false,
          user: administrator,
        }),
        payload.update({
          collection: 'users',
          data: { roles: ['member', 'treasurer'] },
          id: targetUser.id,
          overrideAccess: false,
          user: administrator,
        }),
      ]);

      const overlappingPersisted = await payload.findByID({
        collection: 'users',
        id: targetUser.id,
        overrideAccess: false,
        user: administrator,
      });
      expect([
        ['member', 'editor'],
        ['member', 'treasurer'],
      ]).toContainEqual(overlappingPersisted.roles);

      const adminRoleUpdate = await payload.update({
        collection: 'users',
        data: { roles: ['member', 'editor'] },
        id: targetUser.id,
        overrideAccess: false,
        user: administrator,
      });
      expect(adminRoleUpdate.roles).toEqual(['member', 'editor']);

      await [
        [],
        ['unknown' as UserRole],
        ['member', 'member'] as UserRole[],
      ].reduce(async (previous, invalidRoles) => {
        await previous;
        await expect(
          payload.update({
            collection: 'users',
            data: { roles: invalidRoles },
            id: targetUser.id,
            overrideAccess: false,
            user: administrator,
          }),
          `invalid:${JSON.stringify(invalidRoles)}`,
        ).rejects.toThrow();
      }, Promise.resolve());

      const resetToken = await payload.forgotPassword({
        collection: 'users',
        data: { email: targetEmail },
        disableEmail: true,
      });
      await runWithConcurrentRevocation(() =>
        payload.resetPassword({
          collection: 'users',
          data: {
            password: resetPasswordValue,
            token: resetToken,
          },
          overrideAccess: false,
        }),
      );

      await runWithConcurrentRevocation(() =>
        payload.login({
          collection: 'users',
          data: {
            email: targetEmail,
            password: resetPasswordValue,
          },
        }),
      );

      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64',
      );
      const ownedNews = await payload.create({
        collection: 'news',
        data: {
          _status: 'published',
          author: targetUser.id,
          generateSlug: true,
          owner: targetUser.id,
          slug: '',
          title: 'Owner Deletion Reference News',
        },
        depth: 0,
        overrideAccess: false,
        user: administrator,
      });
      const ownedMedia = await payload.create({
        collection: 'media',
        data: {
          alt: 'Owner Deletion Reference Media',
          uploadedBy: targetUser.id,
        },
        depth: 0,
        file: {
          data: pngBuffer,
          mimetype: 'image/png',
          name: `${testPrefix}-owner-delete.png`,
          size: pngBuffer.byteLength,
        },
        overrideAccess: false,
        user: administrator,
      });

      await payload.delete({
        collection: 'users',
        id: targetUser.id,
        overrideAccess: false,
        user: administrator,
      });

      const newsAfterDelete = await payload.findByID({
        collection: 'news',
        depth: 0,
        id: ownedNews.id,
        overrideAccess: false,
        user: administrator,
      });
      const mediaAfterDelete = await payload.findByID({
        collection: 'media',
        depth: 0,
        id: ownedMedia.id,
        overrideAccess: false,
        user: administrator,
      });
      expect(newsAfterDelete.owner).toBeFalsy();
      expect(mediaAfterDelete.uploadedBy).toBeFalsy();

      await payload.delete({
        collection: 'news',
        id: ownedNews.id,
        overrideAccess: false,
        user: administrator,
      });
      await payload.delete({
        collection: 'media',
        id: ownedMedia.id,
        overrideAccess: false,
        user: administrator,
      });
    },
    integrationTestTimeout,
  );
});
