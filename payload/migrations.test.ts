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
    'upgrades a database that already has the released migrations',
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
        const payload = await getPayload({ config });

        await payload.db.migrate({
          migrations: migrationBatch(0, releasedMigrationCount),
        });
        await payload.db.migrate({
          migrations: migrationBatch(releasedMigrationCount),
        });

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
      const repairMigration = migrations.at(-1);

      await repairMigration?.up({
        db,
        payload: {} as never,
        req: {} as never,
      } as never);

      expect(db.run).toHaveBeenCalledTimes(repairMigrationStatementCount);
    },
    migrationTestTimeout,
  );
});
