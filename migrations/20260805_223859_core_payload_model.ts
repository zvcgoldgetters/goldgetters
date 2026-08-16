import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`players\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`source_id\` text NOT NULL,
  	\`source_type\` text NOT NULL,
  	\`source_updated_at\` text,
  	\`name\` text NOT NULL,
  	\`user_id\` integer,
  	\`team_id\` integer,
  	\`status\` text DEFAULT 'active' NOT NULL,
  	\`shirt_number\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`team_id\`) REFERENCES \`teams\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(
    sql`CREATE UNIQUE INDEX \`players_source_id_idx\` ON \`players\` (\`source_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`players_user_idx\` ON \`players\` (\`user_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`players_team_idx\` ON \`players\` (\`team_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`players_updated_at_idx\` ON \`players\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`players_created_at_idx\` ON \`players\` (\`created_at\`);`,
  );
  await db.run(sql`CREATE TABLE \`teams\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`source_id\` text NOT NULL,
  	\`source_type\` text NOT NULL,
  	\`source_updated_at\` text,
  	\`name\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`league_id\` integer,
  	\`contact_email\` text,
  	\`contact_phone\` text,
  	\`website\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`league_id\`) REFERENCES \`leagues\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(
    sql`CREATE UNIQUE INDEX \`teams_source_id_idx\` ON \`teams\` (\`source_id\`);`,
  );
  await db.run(
    sql`CREATE UNIQUE INDEX \`teams_slug_idx\` ON \`teams\` (\`slug\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`teams_league_idx\` ON \`teams\` (\`league_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`teams_updated_at_idx\` ON \`teams\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`teams_created_at_idx\` ON \`teams\` (\`created_at\`);`,
  );
  await db.run(sql`CREATE TABLE \`teams_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`players_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`teams\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`players_id\`) REFERENCES \`players\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`teams_rels_order_idx\` ON \`teams_rels\` (\`order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`teams_rels_parent_idx\` ON \`teams_rels\` (\`parent_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`teams_rels_path_idx\` ON \`teams_rels\` (\`path\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`teams_rels_players_id_idx\` ON \`teams_rels\` (\`players_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`venues\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`source_id\` text NOT NULL,
  	\`source_type\` text NOT NULL,
  	\`source_updated_at\` text,
  	\`name\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`address\` text,
  	\`map_url\` text,
  	\`legacy_venue_id\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `);
  await db.run(
    sql`CREATE UNIQUE INDEX \`venues_source_id_idx\` ON \`venues\` (\`source_id\`);`,
  );
  await db.run(
    sql`CREATE UNIQUE INDEX \`venues_slug_idx\` ON \`venues\` (\`slug\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`venues_updated_at_idx\` ON \`venues\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`venues_created_at_idx\` ON \`venues\` (\`created_at\`);`,
  );
  await db.run(sql`CREATE TABLE \`leagues\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`source_id\` text NOT NULL,
  	\`source_type\` text NOT NULL,
  	\`source_updated_at\` text,
  	\`name\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`type\` text,
  	\`website\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `);
  await db.run(
    sql`CREATE UNIQUE INDEX \`leagues_source_id_idx\` ON \`leagues\` (\`source_id\`);`,
  );
  await db.run(
    sql`CREATE UNIQUE INDEX \`leagues_slug_idx\` ON \`leagues\` (\`slug\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`leagues_updated_at_idx\` ON \`leagues\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`leagues_created_at_idx\` ON \`leagues\` (\`created_at\`);`,
  );
  await db.run(sql`CREATE TABLE \`seasons\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`source_id\` text NOT NULL,
  	\`source_type\` text NOT NULL,
  	\`source_updated_at\` text,
  	\`name\` text NOT NULL,
  	\`period\` text,
  	\`series\` text,
  	\`ranking_url\` text,
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
  await db.run(sql`CREATE TABLE \`seasons_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`teams_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`seasons\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`teams_id\`) REFERENCES \`teams\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`seasons_rels_order_idx\` ON \`seasons_rels\` (\`order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`seasons_rels_parent_idx\` ON \`seasons_rels\` (\`parent_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`seasons_rels_path_idx\` ON \`seasons_rels\` (\`path\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`seasons_rels_teams_id_idx\` ON \`seasons_rels\` (\`teams_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`matches\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`source_id\` text NOT NULL,
  	\`source_type\` text NOT NULL,
  	\`source_updated_at\` text,
  	\`title\` text NOT NULL,
  	\`date\` text NOT NULL,
  	\`season_id\` integer,
  	\`league_id\` integer,
  	\`home_team_id\` integer,
  	\`away_team_id\` integer,
  	\`venue_id\` integer,
  	\`home_score\` numeric,
  	\`away_score\` numeric,
  	\`status\` text DEFAULT 'scheduled',
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`season_id\`) REFERENCES \`seasons\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`league_id\`) REFERENCES \`leagues\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`home_team_id\`) REFERENCES \`teams\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`away_team_id\`) REFERENCES \`teams\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`venue_id\`) REFERENCES \`venues\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(
    sql`CREATE UNIQUE INDEX \`matches_source_id_idx\` ON \`matches\` (\`source_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`matches_season_idx\` ON \`matches\` (\`season_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`matches_league_idx\` ON \`matches\` (\`league_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`matches_home_team_idx\` ON \`matches\` (\`home_team_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`matches_away_team_idx\` ON \`matches\` (\`away_team_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`matches_venue_idx\` ON \`matches\` (\`venue_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`matches_updated_at_idx\` ON \`matches\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`matches_created_at_idx\` ON \`matches\` (\`created_at\`);`,
  );
  await db.run(sql`CREATE TABLE \`team_events\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`source_id\` text NOT NULL,
  	\`source_type\` text NOT NULL,
  	\`source_updated_at\` text,
  	\`title\` text NOT NULL,
  	\`date\` text NOT NULL,
  	\`type\` text NOT NULL,
  	\`team_id\` integer,
  	\`venue_id\` integer,
  	\`description\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`team_id\`) REFERENCES \`teams\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`venue_id\`) REFERENCES \`venues\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(
    sql`CREATE UNIQUE INDEX \`team_events_source_id_idx\` ON \`team_events\` (\`source_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`team_events_team_idx\` ON \`team_events\` (\`team_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`team_events_venue_idx\` ON \`team_events\` (\`venue_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`team_events_updated_at_idx\` ON \`team_events\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`team_events_created_at_idx\` ON \`team_events\` (\`created_at\`);`,
  );
  await db.run(sql`CREATE TABLE \`reports\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`source_id\` text NOT NULL,
  	\`source_type\` text NOT NULL,
  	\`source_updated_at\` text,
  	\`title\` text NOT NULL,
  	\`match_id\` integer,
  	\`body\` text,
  	\`author_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`match_id\`) REFERENCES \`matches\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`author_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(
    sql`CREATE UNIQUE INDEX \`reports_source_id_idx\` ON \`reports\` (\`source_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`reports_match_idx\` ON \`reports\` (\`match_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`reports_author_idx\` ON \`reports\` (\`author_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`reports_updated_at_idx\` ON \`reports\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`reports_created_at_idx\` ON \`reports\` (\`created_at\`);`,
  );
  await db.run(sql`CREATE TABLE \`previews\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`source_id\` text NOT NULL,
  	\`source_type\` text NOT NULL,
  	\`source_updated_at\` text,
  	\`title\` text NOT NULL,
  	\`match_id\` integer,
  	\`body\` text,
  	\`author_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`match_id\`) REFERENCES \`matches\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`author_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(
    sql`CREATE UNIQUE INDEX \`previews_source_id_idx\` ON \`previews\` (\`source_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`previews_match_idx\` ON \`previews\` (\`match_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`previews_author_idx\` ON \`previews\` (\`author_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`previews_updated_at_idx\` ON \`previews\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`previews_created_at_idx\` ON \`previews\` (\`created_at\`);`,
  );
  await db.run(sql`CREATE TABLE \`news\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`source_id\` text NOT NULL,
  	\`source_type\` text NOT NULL,
  	\`source_updated_at\` text,
  	\`title\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`body\` text,
  	\`author_id\` integer,
  	\`image_id\` integer,
  	\`published_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`author_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(
    sql`CREATE UNIQUE INDEX \`news_source_id_idx\` ON \`news\` (\`source_id\`);`,
  );
  await db.run(
    sql`CREATE UNIQUE INDEX \`news_slug_idx\` ON \`news\` (\`slug\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`news_author_idx\` ON \`news\` (\`author_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`news_image_idx\` ON \`news\` (\`image_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`news_updated_at_idx\` ON \`news\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`news_created_at_idx\` ON \`news\` (\`created_at\`);`,
  );
  await db.run(sql`CREATE TABLE \`albums\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`source_id\` text NOT NULL,
  	\`source_type\` text NOT NULL,
  	\`source_updated_at\` text,
  	\`title\` text NOT NULL,
  	\`event_date\` text,
  	\`match_id\` integer,
  	\`photographer_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`match_id\`) REFERENCES \`matches\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`photographer_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(
    sql`CREATE UNIQUE INDEX \`albums_source_id_idx\` ON \`albums\` (\`source_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`albums_match_idx\` ON \`albums\` (\`match_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`albums_photographer_idx\` ON \`albums\` (\`photographer_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`albums_updated_at_idx\` ON \`albums\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`albums_created_at_idx\` ON \`albums\` (\`created_at\`);`,
  );
  await db.run(sql`CREATE TABLE \`albums_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`media_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`albums\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`albums_rels_order_idx\` ON \`albums_rels\` (\`order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`albums_rels_parent_idx\` ON \`albums_rels\` (\`parent_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`albums_rels_path_idx\` ON \`albums_rels\` (\`path\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`albums_rels_media_id_idx\` ON \`albums_rels\` (\`media_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`media\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`source_id\` text NOT NULL,
  	\`source_type\` text NOT NULL,
  	\`source_updated_at\` text,
  	\`alt\` text,
  	\`legacy_file_id\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`url\` text,
  	\`thumbnail_u_r_l\` text,
  	\`filename\` text,
  	\`mime_type\` text,
  	\`filesize\` numeric,
  	\`width\` numeric,
  	\`height\` numeric,
  	\`focal_x\` numeric,
  	\`focal_y\` numeric
  );
  `);
  await db.run(
    sql`CREATE UNIQUE INDEX \`media_source_id_idx\` ON \`media\` (\`source_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`media_updated_at_idx\` ON \`media\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`media_created_at_idx\` ON \`media\` (\`created_at\`);`,
  );
  await db.run(
    sql`CREATE UNIQUE INDEX \`media_filename_idx\` ON \`media\` (\`filename\`);`,
  );
  await db.run(sql`CREATE TABLE \`bookings\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`source_id\` text NOT NULL,
  	\`source_type\` text NOT NULL,
  	\`source_updated_at\` text,
  	\`date\` text NOT NULL,
  	\`category\` text,
  	\`amount\` numeric,
  	\`status\` text,
  	\`season_id\` integer,
  	\`player_id\` integer,
  	\`match_id\` integer,
  	\`note\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`season_id\`) REFERENCES \`seasons\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`player_id\`) REFERENCES \`players\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`match_id\`) REFERENCES \`matches\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(
    sql`CREATE UNIQUE INDEX \`bookings_source_id_idx\` ON \`bookings\` (\`source_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`bookings_season_idx\` ON \`bookings\` (\`season_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`bookings_player_idx\` ON \`bookings\` (\`player_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`bookings_match_idx\` ON \`bookings\` (\`match_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`bookings_updated_at_idx\` ON \`bookings\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`bookings_created_at_idx\` ON \`bookings\` (\`created_at\`);`,
  );
  await db.run(sql`CREATE TABLE \`source_records\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`source_id\` text NOT NULL,
  	\`source_type\` text NOT NULL,
  	\`source_updated_at\` text,
  	\`target_collection\` text NOT NULL,
  	\`target_id\` text NOT NULL,
  	\`import_run\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `);
  await db.run(
    sql`CREATE UNIQUE INDEX \`source_records_source_id_idx\` ON \`source_records\` (\`source_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`source_records_updated_at_idx\` ON \`source_records\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`source_records_created_at_idx\` ON \`source_records\` (\`created_at\`);`,
  );
  await db.run(sql`CREATE TABLE \`club_settings\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`club_name\` text DEFAULT 'Goldgetters' NOT NULL,
  	\`contact_email\` text,
  	\`default_venue\` text,
  	\`timezone\` text DEFAULT 'Europe/Brussels',
  	\`updated_at\` text,
  	\`created_at\` text
  );
  `);
  // Existing deployments can already contain users. Add these fields as nullable
  // so SQLite can apply the migration, then backfill deterministic source metadata.
  await db.run(sql`ALTER TABLE \`users\` ADD \`source_id\` text;`);
  await db.run(
    sql`UPDATE \`users\` SET \`source_id\` = 'legacy-user-' || \`id\` WHERE \`source_id\` IS NULL;`,
  );
  await db.run(sql`ALTER TABLE \`users\` ADD \`source_type\` text;`);
  await db.run(
    sql`UPDATE \`users\` SET \`source_type\` = 'legacy-user' WHERE \`source_type\` IS NULL;`,
  );
  await db.run(sql`ALTER TABLE \`users\` ADD \`source_updated_at\` text;`);
  await db.run(
    sql`ALTER TABLE \`users\` ADD \`role\` text DEFAULT 'member' NOT NULL;`,
  );
  await db.run(sql`ALTER TABLE \`users\` ADD \`display_name\` text;`);
  await db.run(
    sql`CREATE UNIQUE INDEX \`users_source_id_idx\` ON \`users\` (\`source_id\`);`,
  );
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`players_id\` integer REFERENCES players(id);`,
  );
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`teams_id\` integer REFERENCES teams(id);`,
  );
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`venues_id\` integer REFERENCES venues(id);`,
  );
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`leagues_id\` integer REFERENCES leagues(id);`,
  );
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`seasons_id\` integer REFERENCES seasons(id);`,
  );
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`matches_id\` integer REFERENCES matches(id);`,
  );
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`team_events_id\` integer REFERENCES team_events(id);`,
  );
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`reports_id\` integer REFERENCES reports(id);`,
  );
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`previews_id\` integer REFERENCES previews(id);`,
  );
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`news_id\` integer REFERENCES news(id);`,
  );
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`albums_id\` integer REFERENCES albums(id);`,
  );
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`media_id\` integer REFERENCES media(id);`,
  );
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`bookings_id\` integer REFERENCES bookings(id);`,
  );
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`source_records_id\` integer REFERENCES source_records(id);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_players_id_idx\` ON \`payload_locked_documents_rels\` (\`players_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_teams_id_idx\` ON \`payload_locked_documents_rels\` (\`teams_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_venues_id_idx\` ON \`payload_locked_documents_rels\` (\`venues_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_leagues_id_idx\` ON \`payload_locked_documents_rels\` (\`leagues_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_seasons_id_idx\` ON \`payload_locked_documents_rels\` (\`seasons_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_matches_id_idx\` ON \`payload_locked_documents_rels\` (\`matches_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_team_events_id_idx\` ON \`payload_locked_documents_rels\` (\`team_events_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_reports_id_idx\` ON \`payload_locked_documents_rels\` (\`reports_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_previews_id_idx\` ON \`payload_locked_documents_rels\` (\`previews_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_news_id_idx\` ON \`payload_locked_documents_rels\` (\`news_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_albums_id_idx\` ON \`payload_locked_documents_rels\` (\`albums_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_bookings_id_idx\` ON \`payload_locked_documents_rels\` (\`bookings_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_source_records_id_idx\` ON \`payload_locked_documents_rels\` (\`source_records_id\`);`,
  );
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`teams_rels\`;`);
  await db.run(sql`DROP TABLE \`players\`;`);
  await db.run(sql`DROP TABLE \`teams\`;`);
  await db.run(sql`DROP TABLE \`venues\`;`);
  await db.run(sql`DROP TABLE \`leagues\`;`);
  await db.run(sql`DROP TABLE \`seasons_rels\`;`);
  await db.run(sql`DROP TABLE \`seasons\`;`);
  await db.run(sql`DROP TABLE \`matches\`;`);
  await db.run(sql`DROP TABLE \`team_events\`;`);
  await db.run(sql`DROP TABLE \`reports\`;`);
  await db.run(sql`DROP TABLE \`previews\`;`);
  await db.run(sql`DROP TABLE \`news\`;`);
  await db.run(sql`DROP TABLE \`albums_rels\`;`);
  await db.run(sql`DROP TABLE \`albums\`;`);
  await db.run(sql`DROP TABLE \`media\`;`);
  await db.run(sql`DROP TABLE \`bookings\`;`);
  await db.run(sql`DROP TABLE \`source_records\`;`);
  await db.run(sql`DROP TABLE \`club_settings\`;`);
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
    sql`CREATE INDEX IF NOT EXISTS \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`,
  );
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`,
  );
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`,
  );
  await db.run(sql`DROP INDEX \`users_source_id_idx\`;`);
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`source_id\`;`);
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`source_type\`;`);
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`source_updated_at\`;`);
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`role\`;`);
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`display_name\`;`);
}
