// @vitest-environment node

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import type { Migration } from 'payload';
import { migrations } from '../migrations';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const migrationTestTimeout = 30_000;
const releasedMigrationCount = 2;
const repairMigrationStatementCount = 30;
function migrationBatch(start: number, end?: number): Migration[] {
  // Payload's runtime Migration type uses unknown arguments while generated
  // SQLite migrations use the adapter-specific argument type.
  return migrations.slice(start, end) as unknown as Migration[];
}

describe('Payload migrations', () => {
  it(
    'applies the complete migration batch',
    () => {
      const directory = mkdtempSync(join(tmpdir(), 'goldgetters-payload-'));
      const databaseUri = `file:${join(directory, 'payload.db')}`;
      const environment = {
        ...process.env,
        ['DATABASE_URI']: databaseUri,
        ['PAYLOAD_SECRET']: 'test-secret',
      };

      try {
        const migrateOutput = execFileSync('npm', ['run', 'migrate'], {
          cwd: repositoryRoot,
          env: environment,
          encoding: 'utf8',
          stdio: 'pipe',
        });

        migrations.forEach(({ name }) => {
          expect(migrateOutput).toContain(`Migrated:  ${name}`);
        });
      } finally {
        rmSync(directory, { force: true, recursive: true });
      }
    },
    migrationTestTimeout,
  );

  it(
    'upgrades a database that already has the released migrations and preserves user roles',
    async () => {
      const directory = mkdtempSync(
        join(tmpdir(), 'goldgetters-payload-upgrade-'),
      );
      const databaseUri = `file:${join(directory, 'payload.db')}`;

      vi.stubEnv('DATABASE_URI', databaseUri);
      vi.stubEnv('PAYLOAD_SECRET', 'test-secret');
      vi.stubEnv('PAYLOAD_MIGRATING', 'true');
      vi.resetModules();

      try {
        const { getPayload } = await import('payload');
        const { default: config } = await import('../payload.config');
        const payload = await getPayload({ config, key: directory });

        await payload.db.migrate({
          migrations: migrationBatch(0, releasedMigrationCount),
        });

        const { sql } = await import('@payloadcms/db-sqlite');
        const drizzleDb = (
          payload.db as unknown as {
            drizzle: {
              all: <Row extends Record<string, unknown>>(
                query: unknown,
              ) => Promise<Row[]>;
              run: (query: unknown) => Promise<unknown>;
            };
          }
        ).drizzle;
        await drizzleDb.run(
          sql`INSERT INTO \`users\` (\`email\`, \`role\`) VALUES
            ('legacy-admin@example.test', 'administrator'),
            ('legacy-finance@example.test', 'finance'),
            ('legacy-organizer@example.test', 'organizer');`,
        );

        await payload.db.migrate({
          migrations: migrationBatch(releasedMigrationCount),
        });

        const legacyJoinTables = await drizzleDb.all<{ name: string }>(
          sql`SELECT \`name\` FROM \`sqlite_master\` WHERE \`type\` = 'table' AND \`name\` = 'users_roles';`,
        );
        expect(legacyJoinTables).toEqual([]);

        const migratedAdmin = await payload.find({
          collection: 'users',
          where: { email: { equals: 'legacy-admin@example.test' } },
        });
        const migratedFinance = await payload.find({
          collection: 'users',
          where: { email: { equals: 'legacy-finance@example.test' } },
        });
        const migratedOrganizer = await payload.find({
          collection: 'users',
          where: { email: { equals: 'legacy-organizer@example.test' } },
        });
        expect(migratedAdmin.docs[0]?.roles).toEqual(['administrator']);
        expect(migratedFinance.docs[0]?.roles).toEqual(['treasurer']);
        expect(migratedOrganizer.docs[0]?.roles).toEqual(['team-manager']);

        await payload.db.destroy?.();
      } finally {
        vi.unstubAllEnvs();
        rmSync(directory, { force: true, recursive: true });
      }
    },
    migrationTestTimeout,
  );

  it(
    'adds missing lock relationship columns and indexes without assuming a pristine database',
    async () => {
      const db = {
        run: vi
          .fn()
          .mockResolvedValueOnce({
            rows: [{ name: 'payload_locked_documents_rels' }],
          })
          .mockResolvedValueOnce({
            rows: [
              { name: 'id' },
              { name: 'order' },
              { name: 'parent_id' },
              { name: 'path' },
              { name: 'users_id' },
            ],
          })
          .mockResolvedValue({ rows: [] }),
      };
      const repairMigration = migrations.find(
        ({ name }) =>
          name === '20260921_090000_repair_locked_document_relationships',
      );

      await repairMigration?.up({
        db,
        payload: {} as never,
        req: {} as never,
      } as never);

      expect(db.run).toHaveBeenCalledTimes(repairMigrationStatementCount);
    },
    migrationTestTimeout,
  );

  it(
    'preserves administrator regardless of role order and rolls back unsupported roles safely',
    async () => {
      const directory = mkdtempSync(
        join(tmpdir(), 'goldgetters-payload-rollback-'),
      );
      const databaseUri = `file:${join(directory, 'payload.db')}`;
      const jsonColumnMigration = migrations.find(
        ({ name }) => name === '20261127_170000_users_roles_json_column',
      );
      const multiRoleMigration = migrations.find(
        ({ name }) => name === '20261126_223642_users_multiple_roles',
      );

      vi.stubEnv('DATABASE_URI', databaseUri);
      vi.stubEnv('PAYLOAD_SECRET', 'test-secret');
      vi.stubEnv('PAYLOAD_MIGRATING', 'true');
      vi.resetModules();

      try {
        const { getPayload } = await import('payload');
        const { default: config } = await import('../payload.config');
        const payload = await getPayload({ config, key: directory });

        await payload.db.migrate({
          migrations: migrationBatch(0),
        });

        const testUsers = [
          {
            email: 'rollback-member-admin@example.test',
            expectedRole: 'administrator',
            roles: ['member', 'administrator'],
          },
          {
            email: 'rollback-director-admin@example.test',
            expectedRole: 'administrator',
            roles: ['director', 'administrator'],
          },
          {
            email: 'rollback-member-treasurer@example.test',
            expectedRole: 'finance',
            roles: ['member', 'treasurer'],
          },
          {
            email: 'rollback-member-manager@example.test',
            expectedRole: 'organizer',
            roles: ['member', 'team-manager'],
          },
          {
            email: 'rollback-director-editor@example.test',
            expectedRole: 'editor',
            roles: ['director', 'editor'],
          },
          {
            email: 'rollback-director-only@example.test',
            expectedRole: 'member',
            roles: ['director'],
          },
        ] as const;

        await testUsers.reduce(async (previous, entry) => {
          await previous;
          await payload.create({
            collection: 'users',
            data: {
              email: entry.email,
              password: 'TestPassword123!',
              roles: [...entry.roles],
            },
            overrideAccess: true,
          });
        }, Promise.resolve());

        const drizzleDb = (
          payload.db as unknown as {
            drizzle: {
              all: (
                query: unknown,
              ) => Promise<{ email: string; role: string }[]>;
            };
          }
        ).drizzle;

        if (!jsonColumnMigration || !multiRoleMigration) {
          throw new Error('Missing role migrations');
        }
        await jsonColumnMigration.down({
          db: drizzleDb as never,
          payload,
          req: {} as never,
        });
        await multiRoleMigration.down({
          db: drizzleDb as never,
          payload,
          req: {} as never,
        });

        const { sql } = await import('@payloadcms/db-sqlite');
        const rolledBackRows = await drizzleDb.all(
          sql`SELECT \`email\`, \`role\` FROM \`users\`;`,
        );
        const roleByEmail = new Map(
          rolledBackRows.map((row) => [row.email, row.role]),
        );

        testUsers.forEach((entry) => {
          expect(roleByEmail.get(entry.email), entry.email).toBe(
            entry.expectedRole,
          );
        });

        await payload.db.destroy?.();
      } finally {
        vi.unstubAllEnvs();
        rmSync(directory, { force: true, recursive: true });
      }
    },
    migrationTestTimeout,
  );

  type SqliteDrizzleClient = {
    all: <Row extends Record<string, unknown>>(
      query: unknown,
    ) => Promise<Row[]>;
    run: (query: unknown) => Promise<unknown>;
  };

  async function assertOwnerForeignKeysSetNull(
    drizzleDb: SqliteDrizzleClient,
  ): Promise<void> {
    const { sql } = await import('@payloadcms/db-sqlite');
    const checks = [
      {
        column: 'uploaded_by_id',
        rows: await drizzleDb.all<{ from: string; onDelete: string }>(
          sql`SELECT "from", on_delete AS onDelete FROM pragma_foreign_key_list('media');`,
        ),
        table: 'media',
      },
      {
        column: 'owner_id',
        rows: await drizzleDb.all<{ from: string; onDelete: string }>(
          sql`SELECT "from", on_delete AS onDelete FROM pragma_foreign_key_list('reports');`,
        ),
        table: 'reports',
      },
      {
        column: 'version_owner_id',
        rows: await drizzleDb.all<{ from: string; onDelete: string }>(
          sql`SELECT "from", on_delete AS onDelete FROM pragma_foreign_key_list('_reports_v');`,
        ),
        table: '_reports_v',
      },
      {
        column: 'owner_id',
        rows: await drizzleDb.all<{ from: string; onDelete: string }>(
          sql`SELECT "from", on_delete AS onDelete FROM pragma_foreign_key_list('previews');`,
        ),
        table: 'previews',
      },
      {
        column: 'version_owner_id',
        rows: await drizzleDb.all<{ from: string; onDelete: string }>(
          sql`SELECT "from", on_delete AS onDelete FROM pragma_foreign_key_list('_previews_v');`,
        ),
        table: '_previews_v',
      },
      {
        column: 'owner_id',
        rows: await drizzleDb.all<{ from: string; onDelete: string }>(
          sql`SELECT "from", on_delete AS onDelete FROM pragma_foreign_key_list('news');`,
        ),
        table: 'news',
      },
      {
        column: 'version_owner_id',
        rows: await drizzleDb.all<{ from: string; onDelete: string }>(
          sql`SELECT "from", on_delete AS onDelete FROM pragma_foreign_key_list('_news_v');`,
        ),
        table: '_news_v',
      },
      {
        column: 'owner_id',
        rows: await drizzleDb.all<{ from: string; onDelete: string }>(
          sql`SELECT "from", on_delete AS onDelete FROM pragma_foreign_key_list('albums');`,
        ),
        table: 'albums',
      },
      {
        column: 'version_owner_id',
        rows: await drizzleDb.all<{ from: string; onDelete: string }>(
          sql`SELECT "from", on_delete AS onDelete FROM pragma_foreign_key_list('_albums_v');`,
        ),
        table: '_albums_v',
      },
    ];

    checks.forEach(({ column, rows, table }) => {
      expect(
        rows.find((row) => row.from === column)?.onDelete,
        `${table}.${column}`,
      ).toBe('SET NULL');
    });
  }

  it(
    'backfills a single owner across versions with SET NULL foreign keys so owner deletion succeeds',
    async () => {
      const directory = mkdtempSync(
        join(tmpdir(), 'goldgetters-payload-owner-fk-'),
      );
      const databaseUri = `file:${join(directory, 'payload.db')}`;
      const ownerMigrationIndex = migrations.findIndex(
        ({ name }) => name === '20261127_135702_editorial_immutable_owner',
      );
      const latestFlag = 1;
      const staleFlag = 0;

      vi.stubEnv('DATABASE_URI', databaseUri);
      vi.stubEnv('PAYLOAD_SECRET', 'test-secret');
      vi.stubEnv('PAYLOAD_MIGRATING', 'true');
      vi.resetModules();

      try {
        const { getPayload } = await import('payload');
        const { default: config } = await import('../payload.config');
        const payload = await getPayload({ config, key: directory });

        await payload.db.migrate({
          migrations: migrationBatch(0, ownerMigrationIndex),
        });

        const { sql } = await import('@payloadcms/db-sqlite');
        const drizzleDb = (
          payload.db as unknown as {
            drizzle: SqliteDrizzleClient;
          }
        ).drizzle;

        await drizzleDb.run(sql`PRAGMA foreign_keys = ON;`);

        const insertedUsers = await drizzleDb.all<{ id: number }>(
          sql`INSERT INTO \`users\` (\`email\`) VALUES
            ('owner-a@example.test'),
            ('owner-b@example.test')
            RETURNING \`id\`;`,
        );
        const editorAId = insertedUsers[0].id;
        const editorBId = insertedUsers[1].id;

        const insertedNews = await drizzleDb.all<{ id: number }>(
          sql`INSERT INTO \`news\` (\`title\`, \`author_id\`, \`_status\`) VALUES
            ('Reassigned Draft News', ${editorAId}, 'published'),
            ('Cleared Draft News', ${editorAId}, 'published')
            RETURNING \`id\`;`,
        );
        const reassignedNewsId = insertedNews[0].id;
        const clearedNewsId = insertedNews[1].id;

        await drizzleDb.run(
          sql`INSERT INTO \`_news_v\` (\`parent_id\`, \`version_author_id\`, \`latest\`, \`updated_at\`) VALUES
            (${reassignedNewsId}, ${editorAId}, ${staleFlag}, '2026-01-01T00:00:00.000Z'),
            (${reassignedNewsId}, ${editorBId}, ${latestFlag}, '2026-01-02T00:00:00.000Z'),
            (${clearedNewsId}, ${editorAId}, ${staleFlag}, '2026-01-01T00:00:00.000Z'),
            (${clearedNewsId}, NULL, ${latestFlag}, '2026-01-02T00:00:00.000Z');`,
        );

        const insertedAlbums = await drizzleDb.all<{ id: number }>(
          sql`INSERT INTO \`albums\` (\`title\`, \`photographer_id\`, \`_status\`) VALUES
            ('Fallback Album', ${editorAId}, 'draft')
            RETURNING \`id\`;`,
        );
        const unversionedAlbumId = insertedAlbums[0].id;

        const insertedMedia = await drizzleDb.all<{ id: number }>(
          sql`INSERT INTO \`media\` (\`alt\`, \`uploaded_by_id\`) VALUES
            ('FK Media', ${editorBId})
            RETURNING \`id\`;`,
        );
        const uploadedMediaId = insertedMedia[0].id;

        await payload.db.migrate({
          migrations: migrationBatch(
            ownerMigrationIndex,
            ownerMigrationIndex + 1,
          ),
        });

        const newsRows = await drizzleDb.all<{
          id: number;
          ownerId: number | null;
        }>(
          sql`SELECT \`id\`, \`owner_id\` AS \`ownerId\` FROM \`news\` ORDER BY \`id\` ASC;`,
        );
        expect(newsRows).toEqual([
          { id: reassignedNewsId, ownerId: editorBId },
          { id: clearedNewsId, ownerId: null },
        ]);

        const versionRows = await drizzleDb.all<{
          parentId: number | null;
          versionOwnerId: number | null;
        }>(
          sql`SELECT \`parent_id\` AS \`parentId\`, \`version_owner_id\` AS \`versionOwnerId\` FROM \`_news_v\` ORDER BY \`id\` ASC;`,
        );
        expect(versionRows).toEqual([
          { parentId: reassignedNewsId, versionOwnerId: editorBId },
          { parentId: reassignedNewsId, versionOwnerId: editorBId },
          { parentId: clearedNewsId, versionOwnerId: null },
          { parentId: clearedNewsId, versionOwnerId: null },
        ]);

        const albumRows = await drizzleDb.all<{
          id: number;
          ownerId: number | null;
        }>(
          sql`SELECT \`id\`, \`owner_id\` AS \`ownerId\` FROM \`albums\` WHERE \`id\` = ${unversionedAlbumId};`,
        );
        expect(albumRows[0].ownerId).toBe(editorAId);

        await assertOwnerForeignKeysSetNull(drizzleDb);

        await drizzleDb.run(
          sql`DELETE FROM \`users\` WHERE \`id\` IN (${editorAId}, ${editorBId});`,
        );

        const deletedNewsOwners = await drizzleDb.all<{
          ownerId: number | null;
        }>(sql`SELECT \`owner_id\` AS \`ownerId\` FROM \`news\`;`);
        const deletedVersionOwners = await drizzleDb.all<{
          versionOwnerId: number | null;
        }>(
          sql`SELECT \`version_owner_id\` AS \`versionOwnerId\` FROM \`_news_v\`;`,
        );
        const deletedAlbumOwners = await drizzleDb.all<{
          ownerId: number | null;
        }>(
          sql`SELECT \`owner_id\` AS \`ownerId\` FROM \`albums\` WHERE \`id\` = ${unversionedAlbumId};`,
        );
        const deletedMediaOwners = await drizzleDb.all<{
          uploadedById: number | null;
        }>(
          sql`SELECT \`uploaded_by_id\` AS \`uploadedById\` FROM \`media\` WHERE \`id\` = ${uploadedMediaId};`,
        );

        expect(deletedNewsOwners.every((row) => row.ownerId === null)).toBe(
          true,
        );
        expect(
          deletedVersionOwners.every((row) => row.versionOwnerId === null),
        ).toBe(true);
        expect(deletedAlbumOwners[0].ownerId).toBeNull();
        expect(deletedMediaOwners[0].uploadedById).toBeNull();

        await payload.db.destroy?.();
      } finally {
        vi.unstubAllEnvs();
        rmSync(directory, { force: true, recursive: true });
      }
    },
    migrationTestTimeout,
  );

  it(
    'upgrades databases from users_roles join table to the atomic users.roles JSON column idempotently',
    async () => {
      const directory = mkdtempSync(
        join(tmpdir(), 'goldgetters-payload-json-roles-upgrade-'),
      );
      const databaseUri = `file:${join(directory, 'payload.db')}`;
      const jsonColumnMigrationIndex = migrations.findIndex(
        ({ name }) => name === '20261127_170000_users_roles_json_column',
      );
      const jsonColumnMigration = migrations.find(
        ({ name }) => name === '20261127_170000_users_roles_json_column',
      );
      const secondOrder = 2;

      vi.stubEnv('DATABASE_URI', databaseUri);
      vi.stubEnv('PAYLOAD_SECRET', 'test-secret');
      vi.stubEnv('PAYLOAD_MIGRATING', 'true');
      vi.resetModules();

      try {
        const { getPayload } = await import('payload');
        const { default: config } = await import('../payload.config');
        const payload = await getPayload({ config, key: directory });

        await payload.db.migrate({
          migrations: migrationBatch(0, jsonColumnMigrationIndex),
        });

        const { sql } = await import('@payloadcms/db-sqlite');
        const drizzleDb = (
          payload.db as unknown as {
            drizzle: SqliteDrizzleClient;
          }
        ).drizzle;

        const [adminRow, treasurerRow, emptyRow, unrecognizedRow, mixedRow] =
          await drizzleDb.all<{
            id: number;
          }>(
            sql`INSERT INTO \`users\` (\`email\`) VALUES
            ('join-admin@example.test'),
            ('join-treasurer@example.test'),
            ('join-empty@example.test'),
            ('join-unrecognized@example.test'),
            ('join-mixed@example.test')
            RETURNING \`id\`;`,
          );

        await drizzleDb.run(
          sql`INSERT INTO \`users_roles\` (\`order\`, \`parent_id\`, \`value\`) VALUES
            (1, ${adminRow.id}, 'member'),
            (${secondOrder}, ${adminRow.id}, 'administrator'),
            (1, ${treasurerRow.id}, 'member'),
            (${secondOrder}, ${treasurerRow.id}, 'treasurer'),
            (1, ${unrecognizedRow.id}, 'administrator '),
            (${secondOrder}, ${unrecognizedRow.id}, 'unknown'),
            (1, ${mixedRow.id}, 'administrator '),
            (${secondOrder}, ${mixedRow.id}, 'editor');`,
        );

        await payload.db.migrate({
          migrations: migrationBatch(jsonColumnMigrationIndex),
        });

        const remainingJoinTables = await drizzleDb.all<{ name: string }>(
          sql`SELECT \`name\` FROM \`sqlite_master\` WHERE \`type\` = 'table' AND \`name\` = 'users_roles';`,
        );
        expect(remainingJoinTables).toEqual([]);

        const upgradedUsers = await payload.find({
          collection: 'users',
          overrideAccess: true,
          sort: 'id',
        });
        expect(upgradedUsers.docs).toEqual([
          expect.objectContaining({
            email: 'join-admin@example.test',
            roles: ['member', 'administrator'],
          }),
          expect.objectContaining({
            email: 'join-treasurer@example.test',
            roles: ['member', 'treasurer'],
          }),
          expect.objectContaining({
            email: 'join-empty@example.test',
            roles: [],
          }),
          expect.objectContaining({
            email: 'join-unrecognized@example.test',
            roles: [],
          }),
          expect.objectContaining({
            email: 'join-mixed@example.test',
            roles: ['editor'],
          }),
        ]);

        const persistedEmpty = await payload.findByID({
          collection: 'users',
          id: emptyRow.id,
          overrideAccess: true,
        });
        const persistedUnrecognized = await payload.findByID({
          collection: 'users',
          id: unrecognizedRow.id,
          overrideAccess: true,
        });

        await expect(
          payload.find({
            collection: 'users',
            overrideAccess: false,
            user: persistedEmpty,
          }),
        ).rejects.toThrow();
        await expect(
          payload.find({
            collection: 'users',
            overrideAccess: false,
            user: persistedUnrecognized,
          }),
        ).rejects.toThrow();

        if (!jsonColumnMigration) {
          throw new Error('Missing JSON roles column migration');
        }
        await jsonColumnMigration.up({
          db: drizzleDb as never,
          payload,
          req: {} as never,
        });

        const usersAfterSecondRun = await payload.find({
          collection: 'users',
          overrideAccess: true,
          sort: 'id',
        });
        expect(usersAfterSecondRun.docs).toEqual([
          expect.objectContaining({ roles: ['member', 'administrator'] }),
          expect.objectContaining({ roles: ['member', 'treasurer'] }),
          expect.objectContaining({ roles: [] }),
          expect.objectContaining({ roles: [] }),
          expect.objectContaining({ roles: ['editor'] }),
        ]);

        await payload.db.destroy?.();
      } finally {
        vi.unstubAllEnvs();
        rmSync(directory, { force: true, recursive: true });
      }
    },
    migrationTestTimeout,
  );

  it(
    'backfills domain source metadata into source_records, drops legacy columns, and restores both cross-type mappings on rollback',
    async () => {
      const directory = mkdtempSync(
        join(tmpdir(), 'goldgetters-payload-drop-domain-sources-'),
      );
      const databaseUri = `file:${join(directory, 'payload.db')}`;
      const removeSourceFieldsIndex = migrations.findIndex(
        ({ name }) => name === '20261127_182949_remove_domain_source_fields',
      );
      const removeSourceFieldsMigration = migrations.find(
        ({ name }) => name === '20261127_182949_remove_domain_source_fields',
      );
      const compositeUniqueMigration = migrations.find(
        ({ name }) =>
          name === '20261128_114500_source_records_composite_unique',
      );
      const domainTables = [
        'users',
        'players',
        'teams',
        'venues',
        'leagues',
        'seasons',
        'matches',
        'team_events',
        'reports',
        'previews',
        'news',
        'albums',
        'media',
        'bookings',
      ];
      const versionTables = [
        '_reports_v',
        '_previews_v',
        '_news_v',
        '_albums_v',
      ];

      vi.stubEnv('DATABASE_URI', databaseUri);
      vi.stubEnv('PAYLOAD_SECRET', 'test-secret');
      vi.stubEnv('PAYLOAD_MIGRATING', 'true');
      vi.resetModules();

      try {
        const { getPayload } = await import('payload');
        const { default: config } = await import('../payload.config');
        const payload = await getPayload({ config, key: directory });

        await payload.db.migrate({
          migrations: migrationBatch(0, removeSourceFieldsIndex),
        });

        const { sql } = await import('@payloadcms/db-sqlite');
        const drizzleDb = (
          payload.db as unknown as {
            drizzle: SqliteDrizzleClient;
          }
        ).drizzle;

        await drizzleDb.run(
          sql`INSERT INTO \`source_records\` (\`source_id\`, \`source_type\`, \`target_collection\`, \`target_id\`, \`import_run\`) VALUES
            ('existing-1', 'custom', 'teams', '999', 'pre-upgrade-run');`,
        );

        const [seededLeague, nativeLeague] = await drizzleDb.all<{
          id: number;
        }>(
          sql`INSERT INTO \`leagues\` (\`name\`, \`slug\`, \`source_id\`, \`source_type\`, \`source_updated_at\`) VALUES
            ('Seeded League', 'seeded-league', '42', 'liga', '2026-01-01 00:00:00'),
            ('Native League', 'native-league', NULL, NULL, NULL)
            RETURNING \`id\`;`,
        );
        const [seededUser] = await drizzleDb.all<{ id: number }>(
          sql`INSERT INTO \`users\` (\`email\`, \`source_id\`, \`source_type\`, \`source_updated_at\`) VALUES
            ('legacy-source-user@example.test', '1', 'user', '2026-01-02 00:00:00')
            RETURNING \`id\`;`,
        );
        const [seededMedia] = await drizzleDb.all<{ id: number }>(
          sql`INSERT INTO \`media\` (\`alt\`, \`source_id\`, \`source_type\`, \`source_updated_at\`) VALUES
            ('Legacy Media', '1', 'file', '2026-01-03 00:00:00')
            RETURNING \`id\`;`,
        );
        const [seededEvent] = await drizzleDb.all<{ id: number }>(
          sql`INSERT INTO \`team_events\` (\`title\`, \`date\`, \`type\`, \`source_id\`, \`source_type\`, \`source_updated_at\`) VALUES
            ('Seeded Event', '2026-02-01T19:00:00.000Z', 'training', '77', 'event', NULL)
            RETURNING \`id\`;`,
        );
        const [seededNews] = await drizzleDb.all<{ id: number }>(
          sql`INSERT INTO \`news\` (\`title\`, \`_status\`, \`source_id\`, \`source_type\`, \`source_updated_at\`) VALUES
            ('Versioned News', 'published', '99', 'article', '2026-01-04 00:00:00')
            RETURNING \`id\`;`,
        );
        const staleFlag = 0;
        const latestFlag = 1;
        await drizzleDb.run(
          sql`INSERT INTO \`_news_v\` (\`parent_id\`, \`version_title\`, \`version_source_id\`, \`version_source_type\`, \`version_source_updated_at\`, \`latest\`, \`updated_at\`) VALUES
            (${seededNews.id}, 'Versioned News', '99', 'article', '2026-01-04 00:00:00', ${staleFlag}, '2026-01-04T00:00:00.000Z'),
            (${seededNews.id}, 'Versioned News Draft', '99', 'article', '2026-02-02 00:00:00', ${latestFlag}, '2026-02-02T00:00:00.000Z');`,
        );

        await payload.db.migrate({
          migrations: migrationBatch(removeSourceFieldsIndex),
        });

        const columnNames = async (tableName: string): Promise<string[]> => {
          const rows = await drizzleDb.all<{ name: string }>(
            sql.raw(`PRAGMA table_info('${tableName}');`),
          );
          return rows.map((row) => row.name);
        };

        await domainTables.reduce(async (previous, tableName) => {
          await previous;
          const cols = await columnNames(tableName);
          expect(cols, tableName).not.toContain('source_id');
          expect(cols, tableName).not.toContain('source_type');
          expect(cols, tableName).not.toContain('source_updated_at');
        }, Promise.resolve());

        await versionTables.reduce(async (previous, tableName) => {
          await previous;
          const cols = await columnNames(tableName);
          expect(cols, tableName).not.toContain('version_source_id');
          expect(cols, tableName).not.toContain('version_source_type');
          expect(cols, tableName).not.toContain('version_source_updated_at');
        }, Promise.resolve());

        const sourceRecordCols = await columnNames('source_records');
        expect(sourceRecordCols).toEqual(
          expect.arrayContaining([
            'source_id',
            'source_type',
            'source_updated_at',
          ]),
        );

        const sourceRecordIndexes = await drizzleDb.all<{ name: string }>(
          sql`PRAGMA index_list('source_records');`,
        );
        const sourceRecordIndexNames = sourceRecordIndexes.map(
          (row) => row.name,
        );
        expect(sourceRecordIndexNames).toContain('sourceType_sourceId_idx');
        expect(sourceRecordIndexNames).not.toContain(
          'source_records_source_id_idx',
        );

        const backfilled = await payload.find({
          collection: 'source-records',
          overrideAccess: true,
          sort: 'id',
        });
        expect(backfilled.docs).toEqual([
          expect.objectContaining({
            importRun: 'pre-upgrade-run',
            sourceId: 'existing-1',
            sourceType: 'custom',
            targetCollection: 'teams',
            targetId: '999',
          }),
          expect.objectContaining({
            importRun: null,
            sourceId: '1',
            sourceType: 'user',
            sourceUpdatedAt: '2026-01-02 00:00:00',
            targetCollection: 'users',
            targetId: String(seededUser.id),
          }),
          expect.objectContaining({
            importRun: null,
            sourceId: '42',
            sourceType: 'liga',
            sourceUpdatedAt: '2026-01-01 00:00:00',
            targetCollection: 'leagues',
            targetId: String(seededLeague.id),
          }),
          expect.objectContaining({
            importRun: null,
            sourceId: '77',
            sourceType: 'event',
            sourceUpdatedAt: null,
            targetCollection: 'team-events',
            targetId: String(seededEvent.id),
          }),
          expect.objectContaining({
            importRun: null,
            sourceId: '99',
            sourceType: 'article',
            sourceUpdatedAt: '2026-02-02 00:00:00',
            targetCollection: 'news',
            targetId: String(seededNews.id),
          }),
          expect.objectContaining({
            importRun: null,
            sourceId: '1',
            sourceType: 'file',
            sourceUpdatedAt: '2026-01-03 00:00:00',
            targetCollection: 'media',
            targetId: String(seededMedia.id),
          }),
        ]);

        // Subsequent importer updates to importRun must not break backfill rollback.
        await drizzleDb.run(
          sql`UPDATE \`source_records\` SET \`import_run\` = 'subsequent-import-run' WHERE \`source_id\` = '1';`,
        );

        if (!removeSourceFieldsMigration || !compositeUniqueMigration) {
          throw new Error('Missing source-record migrations');
        }

        await compositeUniqueMigration.down({
          db: drizzleDb as never,
          payload,
          req: {} as never,
        });
        await compositeUniqueMigration.down({
          db: drizzleDb as never,
          payload,
          req: {} as never,
        });
        const indexesAfterFollowupDown = await drizzleDb.all<{ name: string }>(
          sql`PRAGMA index_list('source_records');`,
        );
        expect(indexesAfterFollowupDown.map((row) => row.name)).toContain(
          'sourceType_sourceId_idx',
        );

        await removeSourceFieldsMigration.down({
          db: drizzleDb as never,
          payload,
          req: {} as never,
        });

        const trackingTablesAfterDown = await drizzleDb.all<{ name: string }>(
          sql`SELECT \`name\` FROM \`sqlite_master\` WHERE \`type\` = 'table' AND \`name\` = '_migration_source_records_backfill';`,
        );
        expect(trackingTablesAfterDown).toEqual([]);

        const restoredLeagues = await drizzleDb.all<{
          id: number;
          sourceId: string | null;
          sourceType: string | null;
          sourceUpdatedAt: string | null;
        }>(
          sql`SELECT \`id\`, \`source_id\` AS \`sourceId\`, \`source_type\` AS \`sourceType\`, \`source_updated_at\` AS \`sourceUpdatedAt\` FROM \`leagues\` ORDER BY \`id\` ASC;`,
        );
        expect(restoredLeagues).toEqual([
          {
            id: seededLeague.id,
            sourceId: '42',
            sourceType: 'liga',
            sourceUpdatedAt: '2026-01-01 00:00:00',
          },
          {
            id: nativeLeague.id,
            sourceId: null,
            sourceType: null,
            sourceUpdatedAt: null,
          },
        ]);

        const restoredUsers = await drizzleDb.all<{
          sourceId: string | null;
          sourceType: string | null;
          sourceUpdatedAt: string | null;
        }>(
          sql`SELECT \`source_id\` AS \`sourceId\`, \`source_type\` AS \`sourceType\`, \`source_updated_at\` AS \`sourceUpdatedAt\` FROM \`users\` WHERE \`id\` = ${seededUser.id};`,
        );
        expect(restoredUsers).toEqual([
          {
            sourceId: '1',
            sourceType: 'user',
            sourceUpdatedAt: '2026-01-02 00:00:00',
          },
        ]);

        const restoredMedia = await drizzleDb.all<{
          sourceId: string | null;
          sourceType: string | null;
          sourceUpdatedAt: string | null;
        }>(
          sql`SELECT \`source_id\` AS \`sourceId\`, \`source_type\` AS \`sourceType\`, \`source_updated_at\` AS \`sourceUpdatedAt\` FROM \`media\` WHERE \`id\` = ${seededMedia.id};`,
        );
        expect(restoredMedia).toEqual([
          {
            sourceId: '1',
            sourceType: 'file',
            sourceUpdatedAt: '2026-01-03 00:00:00',
          },
        ]);

        const restoredEvents = await drizzleDb.all<{
          sourceId: string | null;
          sourceType: string | null;
          sourceUpdatedAt: string | null;
        }>(
          sql`SELECT \`source_id\` AS \`sourceId\`, \`source_type\` AS \`sourceType\`, \`source_updated_at\` AS \`sourceUpdatedAt\` FROM \`team_events\` WHERE \`id\` = ${seededEvent.id};`,
        );
        expect(restoredEvents).toEqual([
          {
            sourceId: '77',
            sourceType: 'event',
            sourceUpdatedAt: null,
          },
        ]);

        const restoredNews = await drizzleDb.all<{
          sourceId: string | null;
          sourceType: string | null;
          sourceUpdatedAt: string | null;
        }>(
          sql`SELECT \`source_id\` AS \`sourceId\`, \`source_type\` AS \`sourceType\`, \`source_updated_at\` AS \`sourceUpdatedAt\` FROM \`news\` WHERE \`id\` = ${seededNews.id};`,
        );
        expect(restoredNews).toEqual([
          {
            sourceId: '99',
            sourceType: 'article',
            sourceUpdatedAt: '2026-02-02 00:00:00',
          },
        ]);

        const restoredNewsVersions = await drizzleDb.all<{
          versionSourceId: string | null;
          versionSourceType: string | null;
          versionSourceUpdatedAt: string | null;
        }>(
          sql`SELECT \`version_source_id\` AS \`versionSourceId\`, \`version_source_type\` AS \`versionSourceType\`, \`version_source_updated_at\` AS \`versionSourceUpdatedAt\` FROM \`_news_v\` WHERE \`parent_id\` = ${seededNews.id};`,
        );
        expect(restoredNewsVersions).toEqual([
          {
            versionSourceId: '99',
            versionSourceType: 'article',
            versionSourceUpdatedAt: '2026-02-02 00:00:00',
          },
          {
            versionSourceId: '99',
            versionSourceType: 'article',
            versionSourceUpdatedAt: '2026-02-02 00:00:00',
          },
        ]);

        const remainingSourceRecords = await payload.find({
          collection: 'source-records',
          overrideAccess: true,
        });
        expect(remainingSourceRecords.docs).toEqual([
          expect.objectContaining({
            importRun: 'pre-upgrade-run',
            sourceId: 'existing-1',
            sourceType: 'custom',
            targetCollection: 'teams',
            targetId: '999',
          }),
        ]);

        const rolledBackIndexes = await drizzleDb.all<{ name: string }>(
          sql`PRAGMA index_list('source_records');`,
        );
        const rolledBackIndexNames = rolledBackIndexes.map((row) => row.name);
        expect(rolledBackIndexNames).toContain('source_records_source_id_idx');
        expect(rolledBackIndexNames).not.toContain('sourceType_sourceId_idx');

        await payload.db.destroy?.();
      } finally {
        vi.unstubAllEnvs();
        rmSync(directory, { force: true, recursive: true });
      }
    },
    migrationTestTimeout,
  );

  it(
    'upgrades databases that already recorded remove_domain_source_fields to composite source_records uniqueness',
    async () => {
      const directory = mkdtempSync(
        join(tmpdir(), 'goldgetters-payload-composite-followup-'),
      );
      const databaseUri = `file:${join(directory, 'payload.db')}`;
      const removeSourceFieldsIndex = migrations.findIndex(
        ({ name }) => name === '20261127_182949_remove_domain_source_fields',
      );
      const removeSourceFieldsMigration = migrations.find(
        ({ name }) => name === '20261127_182949_remove_domain_source_fields',
      );
      const compositeUniqueMigration = migrations.find(
        ({ name }) =>
          name === '20261128_114500_source_records_composite_unique',
      );

      vi.stubEnv('DATABASE_URI', databaseUri);
      vi.stubEnv('PAYLOAD_SECRET', 'test-secret');
      vi.stubEnv('PAYLOAD_MIGRATING', 'true');
      vi.resetModules();

      try {
        const { getPayload } = await import('payload');
        const { default: config } = await import('../payload.config');
        const payload = await getPayload({ config, key: directory });

        await payload.db.migrate({
          migrations: migrationBatch(0, removeSourceFieldsIndex),
        });

        const { sql } = await import('@payloadcms/db-sqlite');
        const drizzleDb = (
          payload.db as unknown as {
            drizzle: SqliteDrizzleClient;
          }
        ).drizzle;

        if (!removeSourceFieldsMigration) {
          throw new Error('Missing remove_domain_source_fields migration');
        }
        await removeSourceFieldsMigration.up({
          db: drizzleDb as never,
          payload,
          req: {} as never,
        });

        // Simulate a database that ran the earlier revision before the
        // composite index existed and already recorded remove_domain_source_fields.
        await drizzleDb.run(
          sql`DROP INDEX IF EXISTS \`sourceType_sourceId_idx\`;`,
        );
        await drizzleDb.run(
          sql`CREATE UNIQUE INDEX \`source_records_source_id_idx\` ON \`source_records\` (\`source_id\`);`,
        );
        const appliedBatch = 1;
        await drizzleDb.run(
          sql`INSERT INTO \`payload_migrations\` (\`name\`, \`batch\`) VALUES ('20261127_182949_remove_domain_source_fields', ${appliedBatch});`,
        );

        await payload.db.migrate({
          migrations: migrationBatch(0),
        });

        const indexes = await drizzleDb.all<{ name: string }>(
          sql`PRAGMA index_list('source_records');`,
        );
        const indexNames = indexes.map((row) => row.name);
        expect(indexNames).toContain('sourceType_sourceId_idx');
        expect(indexNames).not.toContain('source_records_source_id_idx');

        const userMapping = await payload.create({
          collection: 'source-records',
          data: {
            sourceId: '1',
            sourceType: 'user',
            targetCollection: 'users',
            targetId: '1',
          },
          overrideAccess: true,
        });
        const fileMapping = await payload.create({
          collection: 'source-records',
          data: {
            sourceId: '1',
            sourceType: 'file',
            targetCollection: 'media',
            targetId: '1',
          },
          overrideAccess: true,
        });
        expect(userMapping.sourceId).toBe('1');
        expect(fileMapping.sourceId).toBe('1');

        if (!compositeUniqueMigration) {
          throw new Error('Missing composite unique migration');
        }
        await expect(
          compositeUniqueMigration.down({
            db: drizzleDb as never,
            payload,
            req: {} as never,
          }),
        ).rejects.toThrow(/backup/i);

        await payload.delete({
          collection: 'source-records',
          id: fileMapping.id,
          overrideAccess: true,
        });
        await compositeUniqueMigration.down({
          db: drizzleDb as never,
          payload,
          req: {} as never,
        });
        await compositeUniqueMigration.down({
          db: drizzleDb as never,
          payload,
          req: {} as never,
        });
        const rolledBackIndexes = await drizzleDb.all<{ name: string }>(
          sql`PRAGMA index_list('source_records');`,
        );
        expect(rolledBackIndexes.map((row) => row.name)).toContain(
          'source_records_source_id_idx',
        );
        expect(rolledBackIndexes.map((row) => row.name)).not.toContain(
          'sourceType_sourceId_idx',
        );

        await payload.db.destroy?.();
      } finally {
        vi.unstubAllEnvs();
        rmSync(directory, { force: true, recursive: true });
      }
    },
    migrationTestTimeout,
  );

  it(
    'resumes an interrupted remove_domain_source_fields upgrade cleanly after partial column drops',
    async () => {
      const directory = mkdtempSync(
        join(tmpdir(), 'goldgetters-payload-resume-drop-'),
      );
      const databaseUri = `file:${join(directory, 'payload.db')}`;
      const removeSourceFieldsIndex = migrations.findIndex(
        ({ name }) => name === '20261127_182949_remove_domain_source_fields',
      );
      const removeSourceFieldsMigration = migrations.find(
        ({ name }) => name === '20261127_182949_remove_domain_source_fields',
      );

      vi.stubEnv('DATABASE_URI', databaseUri);
      vi.stubEnv('PAYLOAD_SECRET', 'test-secret');
      vi.stubEnv('PAYLOAD_MIGRATING', 'true');
      vi.resetModules();

      try {
        const { getPayload } = await import('payload');
        const { default: config } = await import('../payload.config');
        const payload = await getPayload({ config, key: directory });

        await payload.db.migrate({
          migrations: migrationBatch(0, removeSourceFieldsIndex),
        });

        const { sql } = await import('@payloadcms/db-sqlite');
        const drizzleDb = (
          payload.db as unknown as {
            drizzle: SqliteDrizzleClient;
          }
        ).drizzle;

        const [seededUser] = await drizzleDb.all<{
          createdAt: string;
          id: number;
        }>(
          sql`INSERT INTO \`users\` (\`email\`, \`source_id\`, \`source_type\`, \`source_updated_at\`) VALUES
            ('resumed-user@example.test', '1', 'user', '2026-01-02 00:00:00')
            RETURNING \`id\`, \`created_at\` AS \`createdAt\`;`,
        );
        const [seededLeague] = await drizzleDb.all<{ id: number }>(
          sql`INSERT INTO \`leagues\` (\`name\`, \`slug\`, \`source_id\`, \`source_type\`, \`source_updated_at\`) VALUES
            ('Resumed League', 'resumed-league', '42', 'liga', '2026-01-01 00:00:00')
            RETURNING \`id\`;`,
        );

        // Simulate an interrupted drop after backfill completed and users.source_id was dropped.
        const [insertedBackfill] = await drizzleDb.all<{
          createdAt: string;
          id: number;
        }>(
          sql`INSERT INTO \`source_records\` (\`source_id\`, \`source_type\`, \`source_updated_at\`, \`target_collection\`, \`target_id\`, \`created_at\`, \`updated_at\`) VALUES
            ('1', 'user', '2026-01-02 00:00:00', 'users', ${String(seededUser.id)}, '2026-01-02T00:00:00.000Z', '2026-01-02T00:00:00.000Z')
            RETURNING \`id\`, \`created_at\` AS \`createdAt\`;`,
        );
        await drizzleDb.run(
          sql`CREATE TABLE IF NOT EXISTS \`_migration_source_records_backfill\` (
            \`source_record_id\` integer PRIMARY KEY NOT NULL,
            \`source_type\` text NOT NULL,
            \`source_id\` text NOT NULL,
            \`target_collection\` text NOT NULL,
            \`target_id\` text NOT NULL,
            \`source_created_at\` text NOT NULL,
            \`target_created_at\` text,
            \`target_deleted\` integer NOT NULL DEFAULT 0,
            \`is_backfill\` integer NOT NULL DEFAULT 1
          );`,
        );
        await drizzleDb.run(
          sql`INSERT INTO \`_migration_source_records_backfill\` (\`source_record_id\`, \`source_type\`, \`source_id\`, \`target_collection\`, \`target_id\`, \`source_created_at\`, \`target_created_at\`, \`target_deleted\`, \`is_backfill\`) VALUES
            (${insertedBackfill.id}, 'user', '1', 'users', ${String(seededUser.id)}, ${insertedBackfill.createdAt}, ${seededUser.createdAt}, 0, 1);`,
        );
        await drizzleDb.run(sql`DROP INDEX \`users_source_id_idx\`;`);
        await drizzleDb.run(
          sql`ALTER TABLE \`users\` DROP COLUMN \`source_id\`;`,
        );

        if (!removeSourceFieldsMigration) {
          throw new Error('Missing remove_domain_source_fields migration');
        }
        await removeSourceFieldsMigration.up({
          db: drizzleDb as never,
          payload,
          req: {} as never,
        });

        const userCols = await drizzleDb.all<{ name: string }>(
          sql`PRAGMA table_info('users');`,
        );
        const leagueCols = await drizzleDb.all<{ name: string }>(
          sql`PRAGMA table_info('leagues');`,
        );
        expect(userCols.map((row) => row.name)).not.toContain('source_type');
        expect(userCols.map((row) => row.name)).not.toContain(
          'source_updated_at',
        );
        expect(leagueCols.map((row) => row.name)).not.toContain('source_id');

        const recoveredRecords = await payload.find({
          collection: 'source-records',
          overrideAccess: true,
          sort: 'id',
        });
        expect(recoveredRecords.docs).toEqual([
          expect.objectContaining({
            sourceId: '1',
            sourceType: 'user',
            targetCollection: 'users',
            targetId: String(seededUser.id),
          }),
          expect.objectContaining({
            sourceId: '42',
            sourceType: 'liga',
            targetCollection: 'leagues',
            targetId: String(seededLeague.id),
          }),
        ]);

        await payload.db.destroy?.();
      } finally {
        vi.unstubAllEnvs();
        rmSync(directory, { force: true, recursive: true });
      }
    },
    migrationTestTimeout,
  );

  it(
    'rejects rollback when post-upgrade non-backfill source_records share source_id across types',
    async () => {
      const directory = mkdtempSync(
        join(tmpdir(), 'goldgetters-payload-rollback-collision-'),
      );
      const databaseUri = `file:${join(directory, 'payload.db')}`;
      const removeSourceFieldsMigration = migrations.find(
        ({ name }) => name === '20261127_182949_remove_domain_source_fields',
      );

      vi.stubEnv('DATABASE_URI', databaseUri);
      vi.stubEnv('PAYLOAD_SECRET', 'test-secret');
      vi.stubEnv('PAYLOAD_MIGRATING', 'true');
      vi.resetModules();

      try {
        const { getPayload } = await import('payload');
        const { default: config } = await import('../payload.config');
        const payload = await getPayload({ config, key: directory });

        await payload.db.migrate({
          migrations: migrationBatch(0),
        });

        await payload.create({
          collection: 'source-records',
          data: {
            importRun: 'post-upgrade',
            sourceId: '9',
            sourceType: 'user',
            targetCollection: 'users',
            targetId: '1',
          },
          overrideAccess: true,
        });
        await payload.create({
          collection: 'source-records',
          data: {
            importRun: 'post-upgrade',
            sourceId: '9',
            sourceType: 'file',
            targetCollection: 'media',
            targetId: '2',
          },
          overrideAccess: true,
        });

        const drizzleDb = (
          payload.db as unknown as {
            drizzle: SqliteDrizzleClient;
          }
        ).drizzle;

        if (!removeSourceFieldsMigration) {
          throw new Error('Missing source-record migration');
        }

        await expect(
          removeSourceFieldsMigration.down({
            db: drizzleDb as never,
            payload,
            req: {} as never,
          }),
        ).rejects.toThrow(/backup/i);

        await payload.db.destroy?.();
      } finally {
        vi.unstubAllEnvs();
        rmSync(directory, { force: true, recursive: true });
      }
    },
    migrationTestTimeout,
  );

  it(
    'preserves existing composite uniqueness when rolling back only source_records_composite_unique',
    async () => {
      const directory = mkdtempSync(
        join(tmpdir(), 'goldgetters-payload-preserve-composite-'),
      );
      const databaseUri = `file:${join(directory, 'payload.db')}`;
      const compositeUniqueMigration = migrations.find(
        ({ name }) =>
          name === '20261128_114500_source_records_composite_unique',
      );

      vi.stubEnv('DATABASE_URI', databaseUri);
      vi.stubEnv('PAYLOAD_SECRET', 'test-secret');
      vi.stubEnv('PAYLOAD_MIGRATING', 'true');
      vi.resetModules();

      try {
        const { getPayload } = await import('payload');
        const { default: config } = await import('../payload.config');
        const payload = await getPayload({ config, key: directory });

        await payload.db.migrate({
          migrations: migrationBatch(0),
        });

        const { sql } = await import('@payloadcms/db-sqlite');
        const drizzleDb = (
          payload.db as unknown as {
            drizzle: SqliteDrizzleClient;
          }
        ).drizzle;

        if (!compositeUniqueMigration) {
          throw new Error('Missing composite unique migration');
        }
        await compositeUniqueMigration.down({
          db: drizzleDb as never,
          payload,
          req: {} as never,
        });
        await compositeUniqueMigration.down({
          db: drizzleDb as never,
          payload,
          req: {} as never,
        });

        const indexes = await drizzleDb.all<{ name: string }>(
          sql`PRAGMA index_list('source_records');`,
        );
        expect(indexes.map((row) => row.name)).toContain(
          'sourceType_sourceId_idx',
        );

        const userMapping = await payload.create({
          collection: 'source-records',
          data: {
            sourceId: '1',
            sourceType: 'user',
            targetCollection: 'users',
            targetId: '1',
          },
          overrideAccess: true,
        });
        const fileMapping = await payload.create({
          collection: 'source-records',
          data: {
            sourceId: '1',
            sourceType: 'file',
            targetCollection: 'media',
            targetId: '1',
          },
          overrideAccess: true,
        });
        expect(userMapping.sourceId).toBe('1');
        expect(fileMapping.sourceId).toBe('1');

        await payload.db.destroy?.();
      } finally {
        vi.unstubAllEnvs();
        rmSync(directory, { force: true, recursive: true });
      }
    },
    migrationTestTimeout,
  );

  it(
    'aborts rollback before mutating tables when orphaned backfilled targets collide on source_id',
    async () => {
      const directory = mkdtempSync(
        join(tmpdir(), 'goldgetters-payload-orphaned-rollback-'),
      );
      const databaseUri = `file:${join(directory, 'payload.db')}`;
      const removeSourceFieldsIndex = migrations.findIndex(
        ({ name }) => name === '20261127_182949_remove_domain_source_fields',
      );
      const removeSourceFieldsMigration = migrations.find(
        ({ name }) => name === '20261127_182949_remove_domain_source_fields',
      );

      vi.stubEnv('DATABASE_URI', databaseUri);
      vi.stubEnv('PAYLOAD_SECRET', 'test-secret');
      vi.stubEnv('PAYLOAD_MIGRATING', 'true');
      vi.resetModules();

      try {
        const { getPayload } = await import('payload');
        const { default: config } = await import('../payload.config');
        const payload = await getPayload({ config, key: directory });

        await payload.db.migrate({
          migrations: migrationBatch(0, removeSourceFieldsIndex),
        });

        const { sql } = await import('@payloadcms/db-sqlite');
        const drizzleDb = (
          payload.db as unknown as {
            drizzle: SqliteDrizzleClient;
          }
        ).drizzle;

        const [seededUser] = await drizzleDb.all<{ id: number }>(
          sql`INSERT INTO \`users\` (\`email\`, \`source_id\`, \`source_type\`) VALUES
            ('orphan-user@example.test', '1', 'user')
            RETURNING \`id\`;`,
        );
        const [seededMedia] = await drizzleDb.all<{ id: number }>(
          sql`INSERT INTO \`media\` (\`alt\`, \`source_id\`, \`source_type\`) VALUES
            ('Orphan Media', '1', 'file')
            RETURNING \`id\`;`,
        );
        const [seededLeague] = await drizzleDb.all<{ id: number }>(
          sql`INSERT INTO \`leagues\` (\`name\`, \`slug\`, \`source_id\`, \`source_type\`) VALUES
            ('Surviving League', 'surviving-league', '42', 'liga')
            RETURNING \`id\`;`,
        );

        await payload.db.migrate({
          migrations: migrationBatch(removeSourceFieldsIndex),
        });

        await drizzleDb.run(
          sql`DELETE FROM \`users\` WHERE \`id\` = ${seededUser.id};`,
        );
        await drizzleDb.run(
          sql`DELETE FROM \`media\` WHERE \`id\` = ${seededMedia.id};`,
        );

        if (!removeSourceFieldsMigration) {
          throw new Error('Missing remove_domain_source_fields migration');
        }
        await expect(
          removeSourceFieldsMigration.down({
            db: drizzleDb as never,
            payload,
            req: {} as never,
          }),
        ).rejects.toThrow(/backup/i);

        // Verify no partial column additions or source_records deletions happened.
        const leagueCols = await drizzleDb.all<{ name: string }>(
          sql`PRAGMA table_info('leagues');`,
        );
        expect(leagueCols.map((row) => row.name)).not.toContain('source_id');

        const remainingRecords = await payload.find({
          collection: 'source-records',
          overrideAccess: true,
          sort: 'id',
        });
        expect(remainingRecords.docs).toEqual([
          expect.objectContaining({
            sourceId: '1',
            sourceType: 'user',
            targetCollection: 'users',
            targetId: String(seededUser.id),
          }),
          expect.objectContaining({
            sourceId: '42',
            sourceType: 'liga',
            targetCollection: 'leagues',
            targetId: String(seededLeague.id),
          }),
          expect.objectContaining({
            sourceId: '1',
            sourceType: 'file',
            targetCollection: 'media',
            targetId: String(seededMedia.id),
          }),
        ]);

        const indexes = await drizzleDb.all<{ name: string }>(
          sql`PRAGMA index_list('source_records');`,
        );
        expect(indexes.map((row) => row.name)).toContain(
          'sourceType_sourceId_idx',
        );

        await payload.db.destroy?.();
      } finally {
        vi.unstubAllEnvs();
        rmSync(directory, { force: true, recursive: true });
      }
    },
    migrationTestTimeout,
  );

  it(
    'rejects diverging source_updated_at timestamps before dropping columns and succeeds after reconciliation',
    async () => {
      const directory = mkdtempSync(
        join(tmpdir(), 'goldgetters-payload-timestamp-conflict-'),
      );
      const databaseUri = `file:${join(directory, 'payload.db')}`;
      const removeSourceFieldsIndex = migrations.findIndex(
        ({ name }) => name === '20261127_182949_remove_domain_source_fields',
      );
      const removeSourceFieldsMigration = migrations.find(
        ({ name }) => name === '20261127_182949_remove_domain_source_fields',
      );

      vi.stubEnv('DATABASE_URI', databaseUri);
      vi.stubEnv('PAYLOAD_SECRET', 'test-secret');
      vi.stubEnv('PAYLOAD_MIGRATING', 'true');
      vi.resetModules();

      try {
        const { getPayload } = await import('payload');
        const { default: config } = await import('../payload.config');
        const payload = await getPayload({ config, key: directory });

        await payload.db.migrate({
          migrations: migrationBatch(0, removeSourceFieldsIndex),
        });

        const { sql } = await import('@payloadcms/db-sqlite');
        const drizzleDb = (
          payload.db as unknown as {
            drizzle: SqliteDrizzleClient;
          }
        ).drizzle;

        const [seededLeague] = await drizzleDb.all<{ id: number }>(
          sql`INSERT INTO \`leagues\` (\`name\`, \`slug\`, \`source_id\`, \`source_type\`, \`source_updated_at\`) VALUES
            ('Timestamp League', 'timestamp-league', '42', 'liga', '2026-01-01 00:00:00')
            RETURNING \`id\`;`,
        );
        await drizzleDb.run(
          sql`INSERT INTO \`source_records\` (\`source_id\`, \`source_type\`, \`source_updated_at\`, \`target_collection\`, \`target_id\`) VALUES
            ('42', 'liga', '2025-01-01 00:00:00', 'leagues', ${String(seededLeague.id)});`,
        );

        if (!removeSourceFieldsMigration) {
          throw new Error('Missing remove_domain_source_fields migration');
        }
        await expect(
          removeSourceFieldsMigration.up({
            db: drizzleDb as never,
            payload,
            req: {} as never,
          }),
        ).rejects.toThrow(/source_updated_at/i);

        const leagueBeforeReconcile = await drizzleDb.all<{
          sourceUpdatedAt: string | null;
        }>(
          sql`SELECT \`source_updated_at\` AS \`sourceUpdatedAt\` FROM \`leagues\` WHERE \`id\` = ${seededLeague.id};`,
        );
        expect(leagueBeforeReconcile).toEqual([
          { sourceUpdatedAt: '2026-01-01 00:00:00' },
        ]);

        const sourceRecordBeforeReconcile = await payload.find({
          collection: 'source-records',
          overrideAccess: true,
        });
        expect(sourceRecordBeforeReconcile.docs).toEqual([
          expect.objectContaining({
            sourceId: '42',
            sourceType: 'liga',
            sourceUpdatedAt: '2025-01-01 00:00:00',
          }),
        ]);

        await drizzleDb.run(
          sql`UPDATE \`source_records\` SET \`source_updated_at\` = '2026-01-01 00:00:00' WHERE \`source_type\` = 'liga' AND \`source_id\` = '42';`,
        );

        await removeSourceFieldsMigration.up({
          db: drizzleDb as never,
          payload,
          req: {} as never,
        });

        const leagueColsAfter = await drizzleDb.all<{ name: string }>(
          sql`PRAGMA table_info('leagues');`,
        );
        expect(leagueColsAfter.map((row) => row.name)).not.toContain(
          'source_updated_at',
        );

        const reconciled = await payload.find({
          collection: 'source-records',
          overrideAccess: true,
        });
        expect(reconciled.docs).toEqual([
          expect.objectContaining({
            sourceId: '42',
            sourceType: 'liga',
            sourceUpdatedAt: '2026-01-01 00:00:00',
            targetCollection: 'leagues',
            targetId: String(seededLeague.id),
          }),
        ]);

        await payload.db.destroy?.();
      } finally {
        vi.unstubAllEnvs();
        rmSync(directory, { force: true, recursive: true });
      }
    },
    migrationTestTimeout,
  );

  it(
    'preserves post-upgrade source_records that reuse a deleted backfill row ID',
    async () => {
      const directory = mkdtempSync(
        join(tmpdir(), 'goldgetters-payload-rowid-reuse-'),
      );
      const databaseUri = `file:${join(directory, 'payload.db')}`;
      const removeSourceFieldsIndex = migrations.findIndex(
        ({ name }) => name === '20261127_182949_remove_domain_source_fields',
      );
      const removeSourceFieldsMigration = migrations.find(
        ({ name }) => name === '20261127_182949_remove_domain_source_fields',
      );
      const compositeUniqueMigration = migrations.find(
        ({ name }) =>
          name === '20261128_114500_source_records_composite_unique',
      );

      vi.stubEnv('DATABASE_URI', databaseUri);
      vi.stubEnv('PAYLOAD_SECRET', 'test-secret');
      vi.stubEnv('PAYLOAD_MIGRATING', 'true');
      vi.resetModules();

      try {
        const { getPayload } = await import('payload');
        const { default: config } = await import('../payload.config');
        const payload = await getPayload({ config, key: directory });

        await payload.db.migrate({
          migrations: migrationBatch(0, removeSourceFieldsIndex),
        });

        const { sql } = await import('@payloadcms/db-sqlite');
        const drizzleDb = (
          payload.db as unknown as {
            drizzle: SqliteDrizzleClient;
          }
        ).drizzle;

        const [seededUser] = await drizzleDb.all<{ id: number }>(
          sql`INSERT INTO \`users\` (\`email\`, \`source_id\`, \`source_type\`) VALUES
            ('rowid-user@example.test', '1', 'user')
            RETURNING \`id\`;`,
        );
        const [seededLeague] = await drizzleDb.all<{ id: number }>(
          sql`INSERT INTO \`leagues\` (\`name\`, \`slug\`, \`source_id\`, \`source_type\`) VALUES
            ('Rowid League', 'rowid-league', '42', 'liga')
            RETURNING \`id\`;`,
        );

        await payload.db.migrate({
          migrations: migrationBatch(removeSourceFieldsIndex),
        });

        const [deletedTarget] = await drizzleDb.all<{ id: number }>(
          sql`SELECT \`id\` FROM \`source_records\` WHERE \`source_type\` = 'liga' AND \`source_id\` = '42';`,
        );
        await drizzleDb.run(
          sql`DELETE FROM \`source_records\` WHERE \`id\` = ${deletedTarget.id};`,
        );

        // Insert a new post-upgrade mapping explicitly reusing the deleted row ID.
        await drizzleDb.run(
          sql`INSERT INTO \`source_records\` (\`id\`, \`source_id\`, \`source_type\`, \`target_collection\`, \`target_id\`, \`import_run\`) VALUES
            (${deletedTarget.id}, '88', 'sponsor', 'leagues', ${String(seededLeague.id)}, 'post-upgrade-run');`,
        );

        if (!removeSourceFieldsMigration || !compositeUniqueMigration) {
          throw new Error('Missing source-record migrations');
        }
        await compositeUniqueMigration.down({
          db: drizzleDb as never,
          payload,
          req: {} as never,
        });
        await removeSourceFieldsMigration.down({
          db: drizzleDb as never,
          payload,
          req: {} as never,
        });

        const remaining = await payload.find({
          collection: 'source-records',
          overrideAccess: true,
        });
        expect(remaining.docs).toEqual([
          expect.objectContaining({
            id: deletedTarget.id,
            importRun: 'post-upgrade-run',
            sourceId: '88',
            sourceType: 'sponsor',
            targetCollection: 'leagues',
            targetId: String(seededLeague.id),
          }),
        ]);

        const restoredUsers = await drizzleDb.all<{ sourceId: string | null }>(
          sql`SELECT \`source_id\` AS \`sourceId\` FROM \`users\` WHERE \`id\` = ${seededUser.id};`,
        );
        expect(restoredUsers).toEqual([{ sourceId: '1' }]);

        await payload.db.destroy?.();
      } finally {
        vi.unstubAllEnvs();
        rmSync(directory, { force: true, recursive: true });
      }
    },
    migrationTestTimeout,
  );

  it(
    'commits backfilled mapping and provenance atomically so interrupted inserts leave no untracked rows',
    async () => {
      const directory = mkdtempSync(
        join(tmpdir(), 'goldgetters-payload-atomic-backfill-'),
      );
      const databaseUri = `file:${join(directory, 'payload.db')}`;
      const removeSourceFieldsIndex = migrations.findIndex(
        ({ name }) => name === '20261127_182949_remove_domain_source_fields',
      );
      const removeSourceFieldsMigration = migrations.find(
        ({ name }) => name === '20261127_182949_remove_domain_source_fields',
      );

      vi.stubEnv('DATABASE_URI', databaseUri);
      vi.stubEnv('PAYLOAD_SECRET', 'test-secret');
      vi.stubEnv('PAYLOAD_MIGRATING', 'true');
      vi.resetModules();

      try {
        const { getPayload } = await import('payload');
        const { default: config } = await import('../payload.config');
        const payload = await getPayload({ config, key: directory });

        await payload.db.migrate({
          migrations: migrationBatch(0, removeSourceFieldsIndex),
        });

        const { sql } = await import('@payloadcms/db-sqlite');
        const drizzleDb = (
          payload.db as unknown as {
            drizzle: SqliteDrizzleClient;
          }
        ).drizzle;

        const [seededUser] = await drizzleDb.all<{ id: number }>(
          sql`INSERT INTO \`users\` (\`email\`, \`source_id\`, \`source_type\`) VALUES
            ('atomic-user@example.test', '1', 'user')
            RETURNING \`id\`;`,
        );
        const [seededLeague] = await drizzleDb.all<{ id: number }>(
          sql`INSERT INTO \`leagues\` (\`name\`, \`slug\`, \`source_id\`, \`source_type\`) VALUES
            ('Atomic League', 'atomic-league', '42', 'liga')
            RETURNING \`id\`;`,
        );

        await drizzleDb.run(
          sql`CREATE TABLE \`_migration_source_records_backfill\` (
            \`source_record_id\` integer PRIMARY KEY NOT NULL,
            \`source_type\` text NOT NULL,
            \`source_id\` text NOT NULL,
            \`target_collection\` text NOT NULL,
            \`target_id\` text NOT NULL,
            \`source_created_at\` text NOT NULL,
            \`target_created_at\` text,
            \`target_deleted\` integer NOT NULL DEFAULT 0,
            \`is_backfill\` integer NOT NULL DEFAULT 1
          );`,
        );
        await drizzleDb.run(
          sql`CREATE TRIGGER \`test_abort_provenance\`
            BEFORE INSERT ON \`_migration_source_records_backfill\`
            WHEN NEW.\`source_id\` = '42'
            BEGIN
              SELECT RAISE(ABORT, 'simulated provenance failure');
            END;`,
        );

        const transactionSpy = vi.spyOn(
          drizzleDb as unknown as {
            transaction: (...args: unknown[]) => Promise<unknown>;
          },
          'transaction',
        );
        const originalRun = drizzleDb.run.bind(drizzleDb);
        vi.spyOn(drizzleDb, 'run').mockImplementation((query) => {
          const serialized = JSON.stringify(query);
          if (
            /\b(SAVEPOINT|RELEASE\s+SAVEPOINT|ROLLBACK\s+TO\s+SAVEPOINT)\b/i.test(
              serialized,
            )
          ) {
            return Promise.reject(
              new Error(
                'Top-level SQL savepoint statements are unsupported across libSQL HTTP streams.',
              ),
            );
          }
          return originalRun(query);
        });

        if (!removeSourceFieldsMigration) {
          throw new Error('Missing remove_domain_source_fields migration');
        }
        const caughtError = await removeSourceFieldsMigration
          .up({
            db: drizzleDb as never,
            payload,
            req: {} as never,
          })
          .then(
            () => null,
            (error: unknown) => error,
          );
        expect(caughtError).toBeInstanceOf(Error);
        const errorText =
          caughtError instanceof Error
            ? `${caughtError.message} ${caughtError.cause instanceof Error ? caughtError.cause.message : ''}`
            : '';
        expect(errorText).toMatch(/simulated provenance failure/);
        expect(transactionSpy).toHaveBeenCalled();

        const partialLeague = await drizzleDb.all<{ id: number }>(
          sql`SELECT \`id\` FROM \`source_records\` WHERE \`source_type\` = 'liga' AND \`source_id\` = '42';`,
        );
        expect(partialLeague).toEqual([]);

        const insertTriggers = await drizzleDb.all<{ name: string }>(
          sql`SELECT \`name\` FROM \`sqlite_master\` WHERE \`type\` = 'trigger' AND \`name\` = '_migration_source_records_backfill_ai';`,
        );
        expect(insertTriggers).toEqual([]);

        await drizzleDb.run(sql`DROP TRIGGER \`test_abort_provenance\`;`);

        await removeSourceFieldsMigration.up({
          db: drizzleDb as never,
          payload,
          req: {} as never,
        });

        const remainingTriggers = await drizzleDb.all<{ name: string }>(
          sql`SELECT \`name\` FROM \`sqlite_master\` WHERE \`type\` = 'trigger' AND \`tbl_name\` = 'source_records';`,
        );
        expect(remainingTriggers.map((row) => row.name)).toEqual([
          '_migration_source_records_backfill_ad',
        ]);

        await removeSourceFieldsMigration.down({
          db: drizzleDb as never,
          payload,
          req: {} as never,
        });

        vi.restoreAllMocks();

        const remainingTargetTriggers = await drizzleDb.all<{ name: string }>(
          sql`SELECT \`name\` FROM \`sqlite_master\` WHERE \`type\` = 'trigger' AND \`name\` LIKE '_migration_source_records_%';`,
        );
        expect(remainingTargetTriggers).toEqual([]);

        const remainingRecords = await payload.find({
          collection: 'source-records',
          overrideAccess: true,
        });
        expect(remainingRecords.docs).toEqual([]);

        const restoredUser = await drizzleDb.all<{ sourceId: string | null }>(
          sql`SELECT \`source_id\` AS \`sourceId\` FROM \`users\` WHERE \`id\` = ${seededUser.id};`,
        );
        const restoredLeague = await drizzleDb.all<{ sourceId: string | null }>(
          sql`SELECT \`source_id\` AS \`sourceId\` FROM \`leagues\` WHERE \`id\` = ${seededLeague.id};`,
        );
        expect(restoredUser).toEqual([{ sourceId: '1' }]);
        expect(restoredLeague).toEqual([{ sourceId: '42' }]);

        await payload.db.destroy?.();
      } finally {
        vi.unstubAllEnvs();
        rmSync(directory, { force: true, recursive: true });
      }
    },
    migrationTestTimeout,
  );

  it(
    'supports rolling back databases upgraded on the legacy import_run backfill tag',
    async () => {
      const directory = mkdtempSync(
        join(tmpdir(), 'goldgetters-payload-legacy-08741ed-rollback-'),
      );
      const databaseUri = `file:${join(directory, 'payload.db')}`;
      const removeSourceFieldsIndex = migrations.findIndex(
        ({ name }) => name === '20261127_182949_remove_domain_source_fields',
      );
      const removeSourceFieldsMigration = migrations.find(
        ({ name }) => name === '20261127_182949_remove_domain_source_fields',
      );
      const compositeUniqueMigration = migrations.find(
        ({ name }) =>
          name === '20261128_114500_source_records_composite_unique',
      );

      vi.stubEnv('DATABASE_URI', databaseUri);
      vi.stubEnv('PAYLOAD_SECRET', 'test-secret');
      vi.stubEnv('PAYLOAD_MIGRATING', 'true');
      vi.resetModules();

      try {
        const { getPayload } = await import('payload');
        const { default: config } = await import('../payload.config');
        const payload = await getPayload({ config, key: directory });

        await payload.db.migrate({
          migrations: migrationBatch(0, removeSourceFieldsIndex),
        });

        const { sql } = await import('@payloadcms/db-sqlite');
        const drizzleDb = (
          payload.db as unknown as {
            drizzle: SqliteDrizzleClient;
          }
        ).drizzle;

        const [seededUser] = await drizzleDb.all<{ id: number }>(
          sql`INSERT INTO \`users\` (\`email\`, \`source_id\`, \`source_type\`) VALUES
            ('legacy-tag-user@example.test', '1', 'user')
            RETURNING \`id\`;`,
        );
        const [seededMedia] = await drizzleDb.all<{ id: number }>(
          sql`INSERT INTO \`media\` (\`alt\`, \`source_id\`, \`source_type\`) VALUES
            ('Legacy Tag Media', '1', 'file')
            RETURNING \`id\`;`,
        );
        const [seededLeague] = await drizzleDb.all<{ id: number }>(
          sql`INSERT INTO \`leagues\` (\`name\`, \`slug\`, \`source_id\`, \`source_type\`) VALUES
            ('Legacy Tag League', 'legacy-tag-league', '42', 'liga')
            RETURNING \`id\`;`,
        );

        await payload.db.migrate({
          migrations: migrationBatch(removeSourceFieldsIndex),
        });

        // Simulate 08741ed state: import_run sentinel without private bookkeeping tables.
        await drizzleDb.run(
          sql`UPDATE \`source_records\` SET \`import_run\` = 'migration:20261127_182949_remove_domain_source_fields';`,
        );
        await drizzleDb.run(
          sql`DROP TRIGGER IF EXISTS \`_migration_source_records_backfill_ad\`;`,
        );
        await drizzleDb.run(
          sql`DROP TABLE IF EXISTS \`_migration_source_records_backfill\`;`,
        );
        await drizzleDb.run(
          sql`DROP TABLE IF EXISTS \`_migration_source_records_state\`;`,
        );

        if (!removeSourceFieldsMigration || !compositeUniqueMigration) {
          throw new Error('Missing source-record migrations');
        }
        await compositeUniqueMigration.down({
          db: drizzleDb as never,
          payload,
          req: {} as never,
        });
        await removeSourceFieldsMigration.down({
          db: drizzleDb as never,
          payload,
          req: {} as never,
        });

        const restoredUser = await drizzleDb.all<{ sourceId: string | null }>(
          sql`SELECT \`source_id\` AS \`sourceId\` FROM \`users\` WHERE \`id\` = ${seededUser.id};`,
        );
        const restoredMedia = await drizzleDb.all<{ sourceId: string | null }>(
          sql`SELECT \`source_id\` AS \`sourceId\` FROM \`media\` WHERE \`id\` = ${seededMedia.id};`,
        );
        const restoredLeague = await drizzleDb.all<{ sourceId: string | null }>(
          sql`SELECT \`source_id\` AS \`sourceId\` FROM \`leagues\` WHERE \`id\` = ${seededLeague.id};`,
        );
        expect(restoredUser).toEqual([{ sourceId: '1' }]);
        expect(restoredMedia).toEqual([{ sourceId: '1' }]);
        expect(restoredLeague).toEqual([{ sourceId: '42' }]);

        const indexes = await drizzleDb.all<{ name: string }>(
          sql`PRAGMA index_list('source_records');`,
        );
        expect(indexes.map((row) => row.name)).toContain(
          'source_records_source_id_idx',
        );

        await payload.db.destroy?.();
      } finally {
        vi.unstubAllEnvs();
        rmSync(directory, { force: true, recursive: true });
      }
    },
    migrationTestTimeout,
  );

  it(
    'supports rolling back databases upgraded on 068c0fa tracking table layouts',
    async () => {
      const directory = mkdtempSync(
        join(tmpdir(), 'goldgetters-payload-legacy-068c0fa-rollback-'),
      );
      const databaseUri = `file:${join(directory, 'payload.db')}`;
      const removeSourceFieldsIndex = migrations.findIndex(
        ({ name }) => name === '20261127_182949_remove_domain_source_fields',
      );
      const removeSourceFieldsMigration = migrations.find(
        ({ name }) => name === '20261127_182949_remove_domain_source_fields',
      );
      const compositeUniqueMigration = migrations.find(
        ({ name }) =>
          name === '20261128_114500_source_records_composite_unique',
      );

      vi.stubEnv('DATABASE_URI', databaseUri);
      vi.stubEnv('PAYLOAD_SECRET', 'test-secret');
      vi.stubEnv('PAYLOAD_MIGRATING', 'true');
      vi.resetModules();

      try {
        const { getPayload } = await import('payload');
        const { default: config } = await import('../payload.config');
        const payload = await getPayload({ config, key: directory });

        await payload.db.migrate({
          migrations: migrationBatch(0, removeSourceFieldsIndex),
        });

        const { sql } = await import('@payloadcms/db-sqlite');
        const drizzleDb = (
          payload.db as unknown as {
            drizzle: SqliteDrizzleClient;
          }
        ).drizzle;

        const [seededUser] = await drizzleDb.all<{ id: number }>(
          sql`INSERT INTO \`users\` (\`email\`, \`source_id\`, \`source_type\`) VALUES
            ('legacy-068-user@example.test', '1', 'user')
            RETURNING \`id\`;`,
        );
        const [seededLeague] = await drizzleDb.all<{ id: number }>(
          sql`INSERT INTO \`leagues\` (\`name\`, \`slug\`, \`source_id\`, \`source_type\`) VALUES
            ('Legacy 068 League', 'legacy-068-league', '42', 'liga')
            RETURNING \`id\`;`,
        );

        await payload.db.migrate({
          migrations: migrationBatch(removeSourceFieldsIndex),
        });

        // Replace tracking tables with the minimal 068c0fa column layouts, then delete
        // the league backfill mapping and insert a replacement reusing its SQLite row ID.
        const backfilledRows = await drizzleDb.all<{
          id: number;
          targetCollection: string;
        }>(
          sql`SELECT \`id\`, \`target_collection\` AS \`targetCollection\` FROM \`source_records\` ORDER BY \`id\` ASC;`,
        );
        await drizzleDb.run(
          sql`DROP TABLE \`_migration_source_records_backfill\`;`,
        );
        await drizzleDb.run(
          sql`CREATE TABLE \`_migration_source_records_backfill\` (
            \`source_record_id\` integer PRIMARY KEY NOT NULL
          );`,
        );
        await backfilledRows.reduce(async (previous, row) => {
          await previous;
          await drizzleDb.run(
            sql`INSERT INTO \`_migration_source_records_backfill\` (\`source_record_id\`) VALUES (${row.id});`,
          );
        }, Promise.resolve());

        const deletedLeagueBackfill = backfilledRows.find(
          (row) => row.targetCollection === 'leagues',
        );
        if (!deletedLeagueBackfill) {
          throw new Error('Missing league backfill row for 068c0fa test');
        }
        await drizzleDb.run(
          sql`DELETE FROM \`source_records\` WHERE \`id\` = ${deletedLeagueBackfill.id};`,
        );
        await drizzleDb.run(
          sql`INSERT INTO \`source_records\` (\`id\`, \`source_id\`, \`source_type\`, \`target_collection\`, \`target_id\`, \`import_run\`) VALUES
            (${deletedLeagueBackfill.id}, '88', 'sponsor', 'leagues', ${String(seededLeague.id)}, 'post-upgrade-run');`,
        );

        await drizzleDb.run(
          sql`DROP TABLE \`_migration_source_records_state\`;`,
        );
        await drizzleDb.run(
          sql`CREATE TABLE \`_migration_source_records_state\` (
            \`migration_name\` text PRIMARY KEY NOT NULL,
            \`had_legacy_source_id_idx\` integer NOT NULL,
            \`had_composite_idx\` integer NOT NULL
          );`,
        );
        await drizzleDb.run(
          sql`INSERT INTO \`_migration_source_records_state\` (
            \`migration_name\`,
            \`had_legacy_source_id_idx\`,
            \`had_composite_idx\`
          ) VALUES ('20261128_114500_source_records_composite_unique', 0, 1);`,
        );

        if (!removeSourceFieldsMigration || !compositeUniqueMigration) {
          throw new Error('Missing source-record migrations');
        }
        await compositeUniqueMigration.down({
          db: drizzleDb as never,
          payload,
          req: {} as never,
        });
        await compositeUniqueMigration.down({
          db: drizzleDb as never,
          payload,
          req: {} as never,
        });

        const compositeIndexesAfterRetry = await drizzleDb.all<{
          name: string;
        }>(sql`PRAGMA index_list('source_records');`);
        expect(compositeIndexesAfterRetry.map((row) => row.name)).toContain(
          'sourceType_sourceId_idx',
        );

        await removeSourceFieldsMigration.down({
          db: drizzleDb as never,
          payload,
          req: {} as never,
        });

        const restoredUser = await drizzleDb.all<{ sourceId: string | null }>(
          sql`SELECT \`source_id\` AS \`sourceId\` FROM \`users\` WHERE \`id\` = ${seededUser.id};`,
        );
        const restoredLeague = await drizzleDb.all<{ sourceId: string | null }>(
          sql`SELECT \`source_id\` AS \`sourceId\` FROM \`leagues\` WHERE \`id\` = ${seededLeague.id};`,
        );
        expect(restoredUser).toEqual([{ sourceId: null }]);
        expect(restoredLeague).toEqual([{ sourceId: null }]);

        const remainingRecords = await payload.find({
          collection: 'source-records',
          overrideAccess: true,
          sort: 'id',
        });
        expect(remainingRecords.docs).toEqual([
          expect.objectContaining({
            sourceId: '1',
            sourceType: 'user',
            targetCollection: 'users',
            targetId: String(seededUser.id),
          }),
          expect.objectContaining({
            id: deletedLeagueBackfill.id,
            importRun: 'post-upgrade-run',
            sourceId: '88',
            sourceType: 'sponsor',
            targetCollection: 'leagues',
            targetId: String(seededLeague.id),
          }),
        ]);

        const indexesAfterRemoveDown = await drizzleDb.all<{ name: string }>(
          sql`PRAGMA index_list('source_records');`,
        );
        expect(indexesAfterRemoveDown.map((row) => row.name)).toContain(
          'source_records_source_id_idx',
        );

        await payload.db.destroy?.();
      } finally {
        vi.unstubAllEnvs();
        rmSync(directory, { force: true, recursive: true });
      }
    },
    migrationTestTimeout,
  );

  it(
    'does not attach deleted domain metadata to a replacement record reusing the same SQLite id',
    async () => {
      const directory = mkdtempSync(
        join(tmpdir(), 'goldgetters-payload-replacement-target-'),
      );
      const databaseUri = `file:${join(directory, 'payload.db')}`;
      const removeSourceFieldsIndex = migrations.findIndex(
        ({ name }) => name === '20261127_182949_remove_domain_source_fields',
      );
      const removeSourceFieldsMigration = migrations.find(
        ({ name }) => name === '20261127_182949_remove_domain_source_fields',
      );

      vi.stubEnv('DATABASE_URI', databaseUri);
      vi.stubEnv('PAYLOAD_SECRET', 'test-secret');
      vi.stubEnv('PAYLOAD_MIGRATING', 'true');
      vi.resetModules();

      try {
        const { getPayload } = await import('payload');
        const { default: config } = await import('../payload.config');
        const payload = await getPayload({ config, key: directory });

        await payload.db.migrate({
          migrations: migrationBatch(0, removeSourceFieldsIndex),
        });

        const { sql } = await import('@payloadcms/db-sqlite');
        const drizzleDb = (
          payload.db as unknown as {
            drizzle: SqliteDrizzleClient;
          }
        ).drizzle;

        const [seededTeam] = await drizzleDb.all<{
          createdAt: string;
          id: number;
        }>(
          sql`INSERT INTO \`teams\` (\`name\`, \`slug\`, \`source_id\`, \`source_type\`) VALUES
            ('Original Team', 'original-team', 'team-1', 'ploeg')
            RETURNING \`id\`, \`created_at\` AS \`createdAt\`;`,
        );

        await payload.db.migrate({
          migrations: migrationBatch(removeSourceFieldsIndex),
        });

        // Delete the original team and insert a replacement reusing its SQLite ID
        // and even the exact created_at timestamp to verify trigger + timestamp guards.
        await drizzleDb.run(
          sql`DELETE FROM \`teams\` WHERE \`id\` = ${seededTeam.id};`,
        );
        await drizzleDb.run(
          sql`INSERT INTO \`teams\` (\`id\`, \`name\`, \`slug\`, \`created_at\`, \`updated_at\`) VALUES
            (${seededTeam.id}, 'Replacement Team', 'replacement-team', ${seededTeam.createdAt}, ${seededTeam.createdAt});`,
        );

        if (!removeSourceFieldsMigration) {
          throw new Error('Missing remove_domain_source_fields migration');
        }
        await removeSourceFieldsMigration.down({
          db: drizzleDb as never,
          payload,
          req: {} as never,
        });

        const replacementTeam = await drizzleDb.all<{
          name: string;
          sourceId: string | null;
          sourceType: string | null;
        }>(
          sql`SELECT \`name\`, \`source_id\` AS \`sourceId\`, \`source_type\` AS \`sourceType\`
            FROM \`teams\`
            WHERE \`id\` = ${seededTeam.id};`,
        );
        expect(replacementTeam).toEqual([
          {
            name: 'Replacement Team',
            sourceId: null,
            sourceType: null,
          },
        ]);

        const preservedMappings = await drizzleDb.all<{
          sourceId: string;
          sourceType: string;
          targetCollection: string;
          targetId: string;
        }>(
          sql`SELECT \`source_id\` AS \`sourceId\`, \`source_type\` AS \`sourceType\`, \`target_collection\` AS \`targetCollection\`, \`target_id\` AS \`targetId\`
            FROM \`source_records\`;`,
        );
        expect(preservedMappings).toEqual([
          {
            sourceId: 'team-1',
            sourceType: 'ploeg',
            targetCollection: 'teams',
            targetId: String(seededTeam.id),
          },
        ]);

        await payload.db.destroy?.();
      } finally {
        vi.unstubAllEnvs();
        rmSync(directory, { force: true, recursive: true });
      }
    },
    migrationTestTimeout,
  );

  it(
    'recovers source metadata held only on older editorial versions before dropping version columns',
    async () => {
      const directory = mkdtempSync(
        join(tmpdir(), 'goldgetters-payload-older-version-source-'),
      );
      const databaseUri = `file:${join(directory, 'payload.db')}`;
      const removeSourceFieldsIndex = migrations.findIndex(
        ({ name }) => name === '20261127_182949_remove_domain_source_fields',
      );

      vi.stubEnv('DATABASE_URI', databaseUri);
      vi.stubEnv('PAYLOAD_SECRET', 'test-secret');
      vi.stubEnv('PAYLOAD_MIGRATING', 'true');
      vi.resetModules();

      try {
        const { getPayload } = await import('payload');
        const { default: config } = await import('../payload.config');
        const payload = await getPayload({ config, key: directory });

        await payload.db.migrate({
          migrations: migrationBatch(0, removeSourceFieldsIndex),
        });

        const { sql } = await import('@payloadcms/db-sqlite');
        const drizzleDb = (
          payload.db as unknown as {
            drizzle: SqliteDrizzleClient;
          }
        ).drizzle;

        const [seededNews] = await drizzleDb.all<{ id: number }>(
          sql`INSERT INTO \`news\` (\`title\`, \`slug\`) VALUES
            ('Historical News', 'historical-news')
            RETURNING \`id\`;`,
        );
        await drizzleDb.run(
          sql`INSERT INTO \`_news_v\` (
            \`parent_id\`,
            \`version_title\`,
            \`version_slug\`,
            \`version_source_id\`,
            \`version_source_type\`,
            \`version_source_updated_at\`,
            \`latest\`
          ) VALUES (
            ${seededNews.id},
            'Historical News',
            'historical-news',
            '99',
            'nieuws',
            '2025-12-01 10:00:00',
            0
          );`,
        );
        await drizzleDb.run(
          sql`INSERT INTO \`_news_v\` (
            \`parent_id\`,
            \`version_title\`,
            \`version_slug\`,
            \`latest\`
          ) VALUES (
            ${seededNews.id},
            'Historical News Edited',
            'historical-news',
            1
          );`,
        );

        await payload.db.migrate({
          migrations: migrationBatch(removeSourceFieldsIndex),
        });

        const recoveredMappings = await drizzleDb.all<{
          sourceId: string;
          sourceType: string;
          sourceUpdatedAt: string | null;
          targetCollection: string;
          targetId: string;
        }>(
          sql`SELECT \`source_id\` AS \`sourceId\`, \`source_type\` AS \`sourceType\`, \`source_updated_at\` AS \`sourceUpdatedAt\`, \`target_collection\` AS \`targetCollection\`, \`target_id\` AS \`targetId\`
            FROM \`source_records\`;`,
        );
        expect(recoveredMappings).toEqual([
          {
            sourceId: '99',
            sourceType: 'nieuws',
            sourceUpdatedAt: '2025-12-01 10:00:00',
            targetCollection: 'news',
            targetId: String(seededNews.id),
          },
        ]);

        const versionColumns = await drizzleDb.all<{ name: string }>(
          sql`PRAGMA table_info('_news_v');`,
        );
        expect(versionColumns.map((row) => row.name)).not.toContain(
          'version_source_id',
        );

        await payload.db.destroy?.();
      } finally {
        vi.unstubAllEnvs();
        rmSync(directory, { force: true, recursive: true });
      }
    },
    migrationTestTimeout,
  );

  it(
    'aborts before dropping columns when editorial versions contain conflicting source identifiers',
    async () => {
      const directory = mkdtempSync(
        join(tmpdir(), 'goldgetters-payload-version-conflict-'),
      );
      const databaseUri = `file:${join(directory, 'payload.db')}`;
      const removeSourceFieldsIndex = migrations.findIndex(
        ({ name }) => name === '20261127_182949_remove_domain_source_fields',
      );
      const removeSourceFieldsMigration = migrations.find(
        ({ name }) => name === '20261127_182949_remove_domain_source_fields',
      );

      vi.stubEnv('DATABASE_URI', databaseUri);
      vi.stubEnv('PAYLOAD_SECRET', 'test-secret');
      vi.stubEnv('PAYLOAD_MIGRATING', 'true');
      vi.resetModules();

      try {
        const { getPayload } = await import('payload');
        const { default: config } = await import('../payload.config');
        const payload = await getPayload({ config, key: directory });

        await payload.db.migrate({
          migrations: migrationBatch(0, removeSourceFieldsIndex),
        });

        const { sql } = await import('@payloadcms/db-sqlite');
        const drizzleDb = (
          payload.db as unknown as {
            drizzle: SqliteDrizzleClient;
          }
        ).drizzle;

        const [seededNews] = await drizzleDb.all<{ id: number }>(
          sql`INSERT INTO \`news\` (\`title\`, \`slug\`, \`source_id\`, \`source_type\`) VALUES
            ('Conflicting News', 'conflicting-news', '99', 'nieuws')
            RETURNING \`id\`;`,
        );
        await drizzleDb.run(
          sql`INSERT INTO \`_news_v\` (
            \`parent_id\`,
            \`version_title\`,
            \`version_slug\`,
            \`version_source_id\`,
            \`version_source_type\`,
            \`latest\`
          ) VALUES (
            ${seededNews.id},
            'Conflicting News Revision',
            'conflicting-news',
            '100',
            'nieuws',
            0
          );`,
        );

        if (!removeSourceFieldsMigration) {
          throw new Error('Missing remove_domain_source_fields migration');
        }
        await expect(
          removeSourceFieldsMigration.up({
            db: drizzleDb as never,
            payload,
            req: {} as never,
          }),
        ).rejects.toThrow(/Conflicting domain source_id values/);

        const newsColumns = await drizzleDb.all<{ name: string }>(
          sql`PRAGMA table_info('news');`,
        );
        const versionColumns = await drizzleDb.all<{ name: string }>(
          sql`PRAGMA table_info('_news_v');`,
        );
        expect(newsColumns.map((row) => row.name)).toContain('source_id');
        expect(versionColumns.map((row) => row.name)).toContain(
          'version_source_id',
        );

        await payload.db.destroy?.();
      } finally {
        vi.unstubAllEnvs();
        rmSync(directory, { force: true, recursive: true });
      }
    },
    migrationTestTimeout,
  );

  it(
    'resumes an interrupted editorial upgrade after news.source_id is dropped even when older revisions have a different timestamp',
    async () => {
      const directory = mkdtempSync(
        join(tmpdir(), 'goldgetters-payload-resume-editorial-version-'),
      );
      const databaseUri = `file:${join(directory, 'payload.db')}`;
      const removeSourceFieldsIndex = migrations.findIndex(
        ({ name }) => name === '20261127_182949_remove_domain_source_fields',
      );
      const removeSourceFieldsMigration = migrations.find(
        ({ name }) => name === '20261127_182949_remove_domain_source_fields',
      );

      vi.stubEnv('DATABASE_URI', databaseUri);
      vi.stubEnv('PAYLOAD_SECRET', 'test-secret');
      vi.stubEnv('PAYLOAD_MIGRATING', 'true');
      vi.resetModules();

      try {
        const { getPayload } = await import('payload');
        const { default: config } = await import('../payload.config');
        const payload = await getPayload({ config, key: directory });

        await payload.db.migrate({
          migrations: migrationBatch(0, removeSourceFieldsIndex),
        });

        const { sql } = await import('@payloadcms/db-sqlite');
        const drizzleDb = (
          payload.db as unknown as {
            drizzle: SqliteDrizzleClient;
          }
        ).drizzle;

        const [seededNews] = await drizzleDb.all<{
          createdAt: string;
          id: number;
        }>(
          sql`INSERT INTO \`news\` (\`title\`, \`slug\`, \`source_id\`, \`source_type\`, \`source_updated_at\`) VALUES
            ('Resumed Editorial News', 'resumed-editorial-news', '99', 'article', '2026-02-02 00:00:00')
            RETURNING \`id\`, \`created_at\` AS \`createdAt\`;`,
        );
        await drizzleDb.run(
          sql`INSERT INTO \`_news_v\` (
            \`parent_id\`,
            \`version_title\`,
            \`version_slug\`,
            \`version_source_id\`,
            \`version_source_type\`,
            \`version_source_updated_at\`,
            \`latest\`
          ) VALUES (
            ${seededNews.id},
            'Older Revision',
            'resumed-editorial-news',
            '99',
            'article',
            '2025-12-01 00:00:00',
            0
          );`,
        );
        await drizzleDb.run(
          sql`INSERT INTO \`_news_v\` (
            \`parent_id\`,
            \`version_title\`,
            \`version_slug\`,
            \`latest\`
          ) VALUES (
            ${seededNews.id},
            'Latest Revision',
            'resumed-editorial-news',
            1
          );`,
        );

        // Simulate Phases 1-3 completing and Phase 4 stopping after dropping news.source_id.
        const [insertedBackfill] = await drizzleDb.all<{
          createdAt: string;
          id: number;
        }>(
          sql`INSERT INTO \`source_records\` (\`source_id\`, \`source_type\`, \`source_updated_at\`, \`target_collection\`, \`target_id\`, \`created_at\`, \`updated_at\`) VALUES
            ('99', 'article', '2026-02-02 00:00:00', 'news', ${String(seededNews.id)}, '2026-02-02T00:00:00.000Z', '2026-02-02T00:00:00.000Z')
            RETURNING \`id\`, \`created_at\` AS \`createdAt\`;`,
        );
        await drizzleDb.run(
          sql`CREATE TABLE \`_migration_source_records_backfill\` (
            \`source_record_id\` integer PRIMARY KEY NOT NULL,
            \`source_type\` text NOT NULL,
            \`source_id\` text NOT NULL,
            \`target_collection\` text NOT NULL,
            \`target_id\` text NOT NULL,
            \`source_created_at\` text NOT NULL,
            \`target_created_at\` text,
            \`target_deleted\` integer NOT NULL DEFAULT 0,
            \`is_backfill\` integer NOT NULL DEFAULT 1
          );`,
        );
        await drizzleDb.run(
          sql`INSERT INTO \`_migration_source_records_backfill\` (
            \`source_record_id\`,
            \`source_type\`,
            \`source_id\`,
            \`target_collection\`,
            \`target_id\`,
            \`source_created_at\`,
            \`target_created_at\`,
            \`target_deleted\`,
            \`is_backfill\`
          ) VALUES (
            ${insertedBackfill.id},
            'article',
            '99',
            'news',
            ${String(seededNews.id)},
            ${insertedBackfill.createdAt},
            ${seededNews.createdAt},
            0,
            1
          );`,
        );
        await drizzleDb.run(sql`DROP INDEX \`news_source_id_idx\`;`);
        await drizzleDb.run(
          sql`ALTER TABLE \`news\` DROP COLUMN \`source_id\`;`,
        );

        if (!removeSourceFieldsMigration) {
          throw new Error('Missing remove_domain_source_fields migration');
        }
        await removeSourceFieldsMigration.up({
          db: drizzleDb as never,
          payload,
          req: {} as never,
        });

        const migratedMappings = await drizzleDb.all<{
          sourceId: string;
          sourceType: string;
          sourceUpdatedAt: string | null;
          targetCollection: string;
          targetId: string;
        }>(
          sql`SELECT \`source_id\` AS \`sourceId\`, \`source_type\` AS \`sourceType\`, \`source_updated_at\` AS \`sourceUpdatedAt\`, \`target_collection\` AS \`targetCollection\`, \`target_id\` AS \`targetId\`
            FROM \`source_records\`;`,
        );
        expect(migratedMappings).toEqual([
          {
            sourceId: '99',
            sourceType: 'article',
            sourceUpdatedAt: '2026-02-02 00:00:00',
            targetCollection: 'news',
            targetId: String(seededNews.id),
          },
        ]);

        const newsColumns = await drizzleDb.all<{ name: string }>(
          sql`PRAGMA table_info('news');`,
        );
        const versionColumns = await drizzleDb.all<{ name: string }>(
          sql`PRAGMA table_info('_news_v');`,
        );
        expect(newsColumns.map((row) => row.name)).not.toContain('source_id');
        expect(newsColumns.map((row) => row.name)).not.toContain(
          'source_updated_at',
        );
        expect(versionColumns.map((row) => row.name)).not.toContain(
          'version_source_id',
        );

        await removeSourceFieldsMigration.down({
          db: drizzleDb as never,
          payload,
          req: {} as never,
        });

        const restoredNews = await drizzleDb.all<{
          sourceId: string | null;
          sourceType: string | null;
          sourceUpdatedAt: string | null;
        }>(
          sql`SELECT \`source_id\` AS \`sourceId\`, \`source_type\` AS \`sourceType\`, \`source_updated_at\` AS \`sourceUpdatedAt\`
            FROM \`news\`
            WHERE \`id\` = ${seededNews.id};`,
        );
        expect(restoredNews).toEqual([
          {
            sourceId: '99',
            sourceType: 'article',
            sourceUpdatedAt: '2026-02-02 00:00:00',
          },
        ]);

        const remainingSourceRecords = await payload.find({
          collection: 'source-records',
          overrideAccess: true,
        });
        expect(remainingSourceRecords.docs).toEqual([]);

        await payload.db.destroy?.();
      } finally {
        vi.unstubAllEnvs();
        rmSync(directory, { force: true, recursive: true });
      }
    },
    migrationTestTimeout,
  );

  it(
    'leaves untracked post-upgrade mappings in source_records without copying them to replacement domain targets',
    async () => {
      const directory = mkdtempSync(
        join(tmpdir(), 'goldgetters-payload-untracked-replacement-'),
      );
      const databaseUri = `file:${join(directory, 'payload.db')}`;
      const removeSourceFieldsMigration = migrations.find(
        ({ name }) => name === '20261127_182949_remove_domain_source_fields',
      );

      vi.stubEnv('DATABASE_URI', databaseUri);
      vi.stubEnv('PAYLOAD_SECRET', 'test-secret');
      vi.stubEnv('PAYLOAD_MIGRATING', 'true');
      vi.resetModules();

      try {
        const { getPayload } = await import('payload');
        const { default: config } = await import('../payload.config');
        const payload = await getPayload({ config, key: directory });

        await payload.db.migrate({
          migrations: migrationBatch(0),
        });

        const { sql } = await import('@payloadcms/db-sqlite');
        const drizzleDb = (
          payload.db as unknown as {
            drizzle: SqliteDrizzleClient;
          }
        ).drizzle;

        const [postUpgradeTeam] = await drizzleDb.all<{ id: number }>(
          sql`INSERT INTO \`teams\` (\`name\`, \`slug\`) VALUES
            ('Post Upgrade Team', 'post-upgrade-team')
            RETURNING \`id\`;`,
        );

        await payload.create({
          collection: 'source-records',
          data: {
            importRun: 'post-upgrade-import',
            sourceId: 'post-team-1',
            sourceType: 'ploeg',
            targetCollection: 'teams',
            targetId: String(postUpgradeTeam.id),
          },
          overrideAccess: true,
        });

        await drizzleDb.run(
          sql`DELETE FROM \`teams\` WHERE \`id\` = ${postUpgradeTeam.id};`,
        );
        await drizzleDb.run(
          sql`INSERT INTO \`teams\` (\`id\`, \`name\`, \`slug\`) VALUES
            (${postUpgradeTeam.id}, 'Replacement Post Team', 'replacement-post-team');`,
        );

        if (!removeSourceFieldsMigration) {
          throw new Error('Missing remove_domain_source_fields migration');
        }
        await removeSourceFieldsMigration.down({
          db: drizzleDb as never,
          payload,
          req: {} as never,
        });

        const replacementTeam = await drizzleDb.all<{
          name: string;
          sourceId: string | null;
          sourceType: string | null;
          sourceUpdatedAt: string | null;
        }>(
          sql`SELECT \`name\`, \`source_id\` AS \`sourceId\`, \`source_type\` AS \`sourceType\`, \`source_updated_at\` AS \`sourceUpdatedAt\`
            FROM \`teams\`
            WHERE \`id\` = ${postUpgradeTeam.id};`,
        );
        expect(replacementTeam).toEqual([
          {
            name: 'Replacement Post Team',
            sourceId: null,
            sourceType: null,
            sourceUpdatedAt: null,
          },
        ]);

        const remainingRecords = await payload.find({
          collection: 'source-records',
          overrideAccess: true,
        });
        expect(remainingRecords.docs).toEqual([
          expect.objectContaining({
            importRun: 'post-upgrade-import',
            sourceId: 'post-team-1',
            sourceType: 'ploeg',
            targetCollection: 'teams',
            targetId: String(postUpgradeTeam.id),
          }),
        ]);

        await payload.db.destroy?.();
      } finally {
        vi.unstubAllEnvs();
        rmSync(directory, { force: true, recursive: true });
      }
    },
    migrationTestTimeout,
  );
});
