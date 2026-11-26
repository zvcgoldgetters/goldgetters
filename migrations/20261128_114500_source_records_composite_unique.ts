import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-sqlite';
import { legacyBackfillImportRun } from './20261127_182949_remove_domain_source_fields';

const indexStateTable = '_migration_source_records_state';
const migrationName = '20261128_114500_source_records_composite_unique';

async function tableExists(
  db: MigrateUpArgs['db'],
  tableName: string,
): Promise<boolean> {
  const result = await db.run(
    sql`SELECT \`name\` FROM \`sqlite_master\` WHERE \`type\` = 'table' AND \`name\` = ${tableName};`,
  );
  return result.rows.length > 0;
}

async function getTableColumnNames(
  db: MigrateUpArgs['db'],
  tableName: string,
): Promise<Set<string>> {
  const result = await db.run(sql.raw(`PRAGMA table_info('${tableName}');`));
  return new Set(
    result.rows.map((row) => String((row as { name?: unknown }).name ?? '')),
  );
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
  const indexesResult = await db.run(sql`PRAGMA index_list('source_records');`);
  const indexNames = new Set(
    indexesResult.rows.map((row) =>
      String((row as { name?: unknown }).name ?? ''),
    ),
  );
  const hadLegacySourceIdIdx = indexNames.has('source_records_source_id_idx')
    ? 1
    : 0;
  const hadCompositeIdx = indexNames.has('sourceType_sourceId_idx') ? 1 : 0;

  await db.run(
    sql.raw(`
      CREATE TABLE IF NOT EXISTS \`${indexStateTable}\` (
        \`migration_name\` text PRIMARY KEY NOT NULL,
        \`had_legacy_source_id_idx\` integer NOT NULL,
        \`had_composite_idx\` integer NOT NULL,
        \`rolled_back\` integer NOT NULL DEFAULT 0
      );
    `),
  );

  const stateColumns = await getTableColumnNames(db, indexStateTable);
  if (!stateColumns.has('rolled_back')) {
    await db.run(
      sql.raw(
        `ALTER TABLE \`${indexStateTable}\` ADD \`rolled_back\` integer NOT NULL DEFAULT 0;`,
      ),
    );
  }

  const existingStateResult = await db.run(
    sql`SELECT \`rolled_back\`
      FROM ${sql.raw(`\`${indexStateTable}\``)}
      WHERE \`migration_name\` = ${migrationName};`,
  );
  const isFreshOrReapply =
    existingStateResult.rows.length === 0 ||
    Number(
      (existingStateResult.rows[0] as { rolled_back?: unknown }).rolled_back,
    ) === 1;

  if (isFreshOrReapply) {
    const activeFlag = 0;
    await db.run(
      sql`INSERT OR REPLACE INTO ${sql.raw(`\`${indexStateTable}\``)} (
          \`migration_name\`,
          \`had_legacy_source_id_idx\`,
          \`had_composite_idx\`,
          \`rolled_back\`
        ) VALUES (${migrationName}, ${hadLegacySourceIdIdx}, ${hadCompositeIdx}, ${activeFlag});`,
    );
  }

  await db.run(sql`DROP INDEX IF EXISTS \`source_records_source_id_idx\`;`);
  await db.run(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS \`sourceType_sourceId_idx\` ON \`source_records\` (\`source_type\`,\`source_id\`);`,
  );
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  if (await tableExists(db, indexStateTable)) {
    const stateColumns = await getTableColumnNames(db, indexStateTable);
    if (!stateColumns.has('rolled_back')) {
      // Backfill the rolled_back column for databases upgraded on 068c0fa
      // whose _migration_source_records_state table only had three columns.
      await db.run(
        sql.raw(
          `ALTER TABLE \`${indexStateTable}\` ADD \`rolled_back\` integer NOT NULL DEFAULT 0;`,
        ),
      );
    }

    const stateResult = await db.run(
      sql`SELECT \`had_legacy_source_id_idx\`, \`had_composite_idx\`
        FROM ${sql.raw(`\`${indexStateTable}\``)}
        WHERE \`migration_name\` = ${migrationName};`,
    );
    if (stateResult.rows.length > 0) {
      const state = stateResult.rows[0] as {
        had_composite_idx?: unknown;
        had_legacy_source_id_idx?: unknown;
      };
      const rolledBackFlag = 1;

      if (
        Number(state.had_composite_idx) === 1 &&
        Number(state.had_legacy_source_id_idx) === 0
      ) {
        // Composite uniqueness already existed before this migration. Keep the
        // saved state row marked rolled_back so retrying down remains idempotent.
        await db.run(
          sql`UPDATE ${sql.raw(`\`${indexStateTable}\``)}
            SET \`rolled_back\` = ${rolledBackFlag}
            WHERE \`migration_name\` = ${migrationName};`,
        );
        return;
      }

      const duplicateSourceIdResult = await db.run(
        sql`SELECT \`source_id\`
          FROM \`source_records\`
          GROUP BY \`source_id\`
          HAVING COUNT(*) > 1;`,
      );
      if (duplicateSourceIdResult.rows.length > 0) {
        const duplicateIds = duplicateSourceIdResult.rows
          .map((row) =>
            String((row as { source_id?: unknown }).source_id ?? ''),
          )
          .join(', ');
        throw new Error(
          `Cannot roll back source_records composite uniqueness while colliding source_id values exist (${duplicateIds}); restore from a pre-upgrade SQLite backup instead.`,
        );
      }

      await db.run(sql`DROP INDEX IF EXISTS \`sourceType_sourceId_idx\`;`);
      await db.run(
        sql`CREATE UNIQUE INDEX IF NOT EXISTS \`source_records_source_id_idx\` ON \`source_records\` (\`source_id\`);`,
      );
      await db.run(
        sql`UPDATE ${sql.raw(`\`${indexStateTable}\``)}
          SET \`rolled_back\` = ${rolledBackFlag}
          WHERE \`migration_name\` = ${migrationName};`,
      );
      return;
    }
  }

  // Compatibility path for databases upgraded on an earlier revision that
  // tagged backfills via import_run without writing _migration_source_records_state.
  const duplicateNonLegacyResult = await db.run(
    sql`SELECT \`source_id\`
      FROM \`source_records\`
      WHERE \`import_run\` IS NULL OR \`import_run\` != ${legacyBackfillImportRun}
      GROUP BY \`source_id\`
      HAVING COUNT(*) > 1;`,
  );
  if (duplicateNonLegacyResult.rows.length > 0) {
    const duplicateIds = duplicateNonLegacyResult.rows
      .map((row) => String((row as { source_id?: unknown }).source_id ?? ''))
      .join(', ');
    throw new Error(
      `Cannot roll back source_records composite uniqueness while colliding source_id values exist (${duplicateIds}); restore from a pre-upgrade SQLite backup instead.`,
    );
  }

  const allDuplicateResult = await db.run(
    sql`SELECT \`source_id\`
      FROM \`source_records\`
      GROUP BY \`source_id\`
      HAVING COUNT(*) > 1;`,
  );
  if (allDuplicateResult.rows.length > 0) {
    return;
  }

  await db.run(sql`DROP INDEX IF EXISTS \`sourceType_sourceId_idx\`;`);
  await db.run(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS \`source_records_source_id_idx\` ON \`source_records\` (\`source_id\`);`,
  );
}
