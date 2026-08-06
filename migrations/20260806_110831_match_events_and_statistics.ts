import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`seasons\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`source_id\` text,
  	\`source_type\` text,
  	\`name\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `);
  await db.run(
    sql`CREATE UNIQUE INDEX \`seasons_source_id_idx\` ON \`seasons\` (\`source_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`seasons_updated_at_idx\` ON \`seasons\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`seasons_created_at_idx\` ON \`seasons\` (\`created_at\`);`,
  );
  await db.run(sql`CREATE TABLE \`matches\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`source_id\` text,
  	\`source_type\` text,
  	\`title\` text NOT NULL,
  	\`date\` text,
  	\`season_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`season_id\`) REFERENCES \`seasons\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(
    sql`CREATE UNIQUE INDEX \`matches_source_id_idx\` ON \`matches\` (\`source_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`matches_season_idx\` ON \`matches\` (\`season_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`matches_updated_at_idx\` ON \`matches\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`matches_created_at_idx\` ON \`matches\` (\`created_at\`);`,
  );
  await db.run(sql`CREATE TABLE \`players\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`source_id\` text,
  	\`source_type\` text,
  	\`name\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `);
  await db.run(
    sql`CREATE UNIQUE INDEX \`players_source_id_idx\` ON \`players\` (\`source_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`players_updated_at_idx\` ON \`players\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`players_created_at_idx\` ON \`players\` (\`created_at\`);`,
  );
  await db.run(sql`CREATE TABLE \`match_events\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`source_id\` text,
  	\`source_type\` text,
  	\`match_id\` integer,
  	\`event_type\` text NOT NULL,
  	\`player_id\` integer,
  	\`assist_player_id\` integer,
  	\`own_goal\` text DEFAULT 'none',
  	\`minute\` numeric,
  	\`notes\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`match_id\`) REFERENCES \`matches\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`player_id\`) REFERENCES \`players\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`assist_player_id\`) REFERENCES \`players\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(
    sql`CREATE UNIQUE INDEX \`match_events_source_id_idx\` ON \`match_events\` (\`source_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`match_events_match_idx\` ON \`match_events\` (\`match_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`match_events_player_idx\` ON \`match_events\` (\`player_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`match_events_assist_player_idx\` ON \`match_events\` (\`assist_player_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`match_events_updated_at_idx\` ON \`match_events\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`match_events_created_at_idx\` ON \`match_events\` (\`created_at\`);`,
  );
  await db.run(sql`CREATE TABLE \`player_appearances\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`source_id\` text,
  	\`source_type\` text,
  	\`match_id\` integer,
  	\`player_id\` integer,
  	\`started\` integer DEFAULT false,
  	\`minutes\` numeric DEFAULT 0,
  	\`actual_attendance\` integer DEFAULT true,
  	\`notes\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`match_id\`) REFERENCES \`matches\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`player_id\`) REFERENCES \`players\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(
    sql`CREATE UNIQUE INDEX \`player_appearances_source_id_idx\` ON \`player_appearances\` (\`source_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`player_appearances_match_idx\` ON \`player_appearances\` (\`match_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`player_appearances_player_idx\` ON \`player_appearances\` (\`player_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`player_appearances_updated_at_idx\` ON \`player_appearances\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`player_appearances_created_at_idx\` ON \`player_appearances\` (\`created_at\`);`,
  );
  await db.run(
    sql`ALTER TABLE \`users\` ADD \`role\` text DEFAULT 'member' NOT NULL;`,
  );
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`seasons_id\` integer REFERENCES seasons(id);`,
  );
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`matches_id\` integer REFERENCES matches(id);`,
  );
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`players_id\` integer REFERENCES players(id);`,
  );
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`match_events_id\` integer REFERENCES match_events(id);`,
  );
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`player_appearances_id\` integer REFERENCES player_appearances(id);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_seasons_id_idx\` ON \`payload_locked_documents_rels\` (\`seasons_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_matches_id_idx\` ON \`payload_locked_documents_rels\` (\`matches_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_players_id_idx\` ON \`payload_locked_documents_rels\` (\`players_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_match_events_id_idx\` ON \`payload_locked_documents_rels\` (\`match_events_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_player_appearances_id_idx\` ON \`payload_locked_documents_rels\` (\`player_appearances_id\`);`,
  );
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`seasons\`;`);
  await db.run(sql`DROP TABLE \`matches\`;`);
  await db.run(sql`DROP TABLE \`players\`;`);
  await db.run(sql`DROP TABLE \`match_events\`;`);
  await db.run(sql`DROP TABLE \`player_appearances\`;`);
  await db.run(sql`PRAGMA foreign_keys=OFF;`);
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "users_id") SELECT "id", "order", "parent_id", "path", "users_id" FROM \`payload_locked_documents_rels\`;`,
  );
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`);
  await db.run(
    sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`,
  );
  await db.run(sql`PRAGMA foreign_keys=ON;`);
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`,
  );
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`role\`;`);
}
