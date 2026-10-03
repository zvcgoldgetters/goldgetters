import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-sqlite';

const lockedDocumentRelations = [
  ['players_id', 'players'],
  ['teams_id', 'teams'],
  ['venues_id', 'venues'],
  ['leagues_id', 'leagues'],
  ['seasons_id', 'seasons'],
  ['matches_id', 'matches'],
  ['team_events_id', 'team_events'],
  ['reports_id', 'reports'],
  ['previews_id', 'previews'],
  ['news_id', 'news'],
  ['albums_id', 'albums'],
  ['media_id', 'media'],
  ['bookings_id', 'bookings'],
  ['source_records_id', 'source_records'],
] as const;

export async function up({ db }: MigrateUpArgs): Promise<void> {
  const tableResult = await db.run(
    sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'payload_locked_documents_rels';`,
  );

  if (tableResult.rows.length === 0) {
    return;
  }

  const columnResult = await db.run(
    sql`PRAGMA table_info('payload_locked_documents_rels');`,
  );
  const existingColumns = new Set(
    columnResult.rows.map((row) =>
      String((row as unknown as { name: unknown }).name),
    ),
  );

  for (const [column, referencedTable] of lockedDocumentRelations) {
    if (existingColumns.has(column)) {
      continue;
    }

    await db.run(
      sql.raw(
        `ALTER TABLE \`payload_locked_documents_rels\` ADD \`${column}\` integer REFERENCES \`${referencedTable}\`(id);`,
      ),
    );
  }

  for (const [column] of lockedDocumentRelations) {
    await db.run(
      sql.raw(
        `CREATE INDEX IF NOT EXISTS \`payload_locked_documents_rels_${column}_idx\` ON \`payload_locked_documents_rels\` (\`${column}\`);`,
      ),
    );
  }
}

// This is a compatibility migration. It only adds missing columns and never
// removes relation data when a deployment rolls migrations back.
export async function down(_args: MigrateDownArgs): Promise<void> {}
