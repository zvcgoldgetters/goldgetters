import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`_reports_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_source_id\` text,
  	\`version_source_type\` text,
  	\`version_source_updated_at\` text,
  	\`version_title\` text,
  	\`version_match_id\` integer,
  	\`version_body\` text,
  	\`version_author_id\` integer,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`reports\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_match_id\`) REFERENCES \`matches\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_author_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(
    sql`CREATE INDEX \`_reports_v_parent_idx\` ON \`_reports_v\` (\`parent_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_reports_v_version_version_source_id_idx\` ON \`_reports_v\` (\`version_source_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_reports_v_version_version_match_idx\` ON \`_reports_v\` (\`version_match_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_reports_v_version_version_author_idx\` ON \`_reports_v\` (\`version_author_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_reports_v_version_version_updated_at_idx\` ON \`_reports_v\` (\`version_updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_reports_v_version_version_created_at_idx\` ON \`_reports_v\` (\`version_created_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_reports_v_version_version__status_idx\` ON \`_reports_v\` (\`version__status\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_reports_v_created_at_idx\` ON \`_reports_v\` (\`created_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_reports_v_updated_at_idx\` ON \`_reports_v\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_reports_v_latest_idx\` ON \`_reports_v\` (\`latest\`);`,
  );
  await db.run(sql`CREATE TABLE \`_previews_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_source_id\` text,
  	\`version_source_type\` text,
  	\`version_source_updated_at\` text,
  	\`version_title\` text,
  	\`version_match_id\` integer,
  	\`version_body\` text,
  	\`version_author_id\` integer,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`previews\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_match_id\`) REFERENCES \`matches\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_author_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(
    sql`CREATE INDEX \`_previews_v_parent_idx\` ON \`_previews_v\` (\`parent_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_previews_v_version_version_source_id_idx\` ON \`_previews_v\` (\`version_source_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_previews_v_version_version_match_idx\` ON \`_previews_v\` (\`version_match_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_previews_v_version_version_author_idx\` ON \`_previews_v\` (\`version_author_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_previews_v_version_version_updated_at_idx\` ON \`_previews_v\` (\`version_updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_previews_v_version_version_created_at_idx\` ON \`_previews_v\` (\`version_created_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_previews_v_version_version__status_idx\` ON \`_previews_v\` (\`version__status\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_previews_v_created_at_idx\` ON \`_previews_v\` (\`created_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_previews_v_updated_at_idx\` ON \`_previews_v\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_previews_v_latest_idx\` ON \`_previews_v\` (\`latest\`);`,
  );
  await db.run(sql`CREATE TABLE \`_news_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_source_id\` text,
  	\`version_source_type\` text,
  	\`version_source_updated_at\` text,
  	\`version_title\` text,
  	\`version_generate_slug\` integer DEFAULT true,
  	\`version_slug\` text,
  	\`version_body\` text,
  	\`version_author_id\` integer,
  	\`version_image_id\` integer,
  	\`version_published_at\` text,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`news\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_author_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(
    sql`CREATE INDEX \`_news_v_parent_idx\` ON \`_news_v\` (\`parent_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_news_v_version_version_source_id_idx\` ON \`_news_v\` (\`version_source_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_news_v_version_version_slug_idx\` ON \`_news_v\` (\`version_slug\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_news_v_version_version_author_idx\` ON \`_news_v\` (\`version_author_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_news_v_version_version_image_idx\` ON \`_news_v\` (\`version_image_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_news_v_version_version_updated_at_idx\` ON \`_news_v\` (\`version_updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_news_v_version_version_created_at_idx\` ON \`_news_v\` (\`version_created_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_news_v_version_version__status_idx\` ON \`_news_v\` (\`version__status\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_news_v_created_at_idx\` ON \`_news_v\` (\`created_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_news_v_updated_at_idx\` ON \`_news_v\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_news_v_latest_idx\` ON \`_news_v\` (\`latest\`);`,
  );
  await db.run(sql`CREATE TABLE \`_albums_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_source_id\` text,
  	\`version_source_type\` text,
  	\`version_source_updated_at\` text,
  	\`version_title\` text,
  	\`version_event_date\` text,
  	\`version_match_id\` integer,
  	\`version_photographer_id\` integer,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`albums\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_match_id\`) REFERENCES \`matches\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_photographer_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(
    sql`CREATE INDEX \`_albums_v_parent_idx\` ON \`_albums_v\` (\`parent_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_albums_v_version_version_source_id_idx\` ON \`_albums_v\` (\`version_source_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_albums_v_version_version_match_idx\` ON \`_albums_v\` (\`version_match_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_albums_v_version_version_photographer_idx\` ON \`_albums_v\` (\`version_photographer_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_albums_v_version_version_updated_at_idx\` ON \`_albums_v\` (\`version_updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_albums_v_version_version_created_at_idx\` ON \`_albums_v\` (\`version_created_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_albums_v_version_version__status_idx\` ON \`_albums_v\` (\`version__status\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_albums_v_created_at_idx\` ON \`_albums_v\` (\`created_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_albums_v_updated_at_idx\` ON \`_albums_v\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_albums_v_latest_idx\` ON \`_albums_v\` (\`latest\`);`,
  );
  await db.run(sql`CREATE TABLE \`_albums_v_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`media_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`_albums_v\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`_albums_v_rels_order_idx\` ON \`_albums_v_rels\` (\`order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_albums_v_rels_parent_idx\` ON \`_albums_v_rels\` (\`parent_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_albums_v_rels_path_idx\` ON \`_albums_v_rels\` (\`path\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_albums_v_rels_media_id_idx\` ON \`_albums_v_rels\` (\`media_id\`);`,
  );
  await db.run(sql`PRAGMA foreign_keys=OFF;`);
  await db.run(sql`CREATE TABLE \`__new_reports\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`source_id\` text,
  	\`source_type\` text,
  	\`source_updated_at\` text,
  	\`title\` text,
  	\`match_id\` integer,
  	\`body\` text,
  	\`author_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`match_id\`) REFERENCES \`matches\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`author_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(
    sql`INSERT INTO \`__new_reports\`("id", "source_id", "source_type", "source_updated_at", "title", "match_id", "body", "author_id", "updated_at", "created_at", "_status") SELECT "id", "source_id", "source_type", "source_updated_at", "title", "match_id", "body", "author_id", "updated_at", "created_at", 'published' FROM \`reports\`;`,
  );
  await db.run(sql`DROP TABLE \`reports\`;`);
  await db.run(sql`ALTER TABLE \`__new_reports\` RENAME TO \`reports\`;`);
  await db.run(sql`PRAGMA foreign_keys=ON;`);
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
  await db.run(
    sql`CREATE INDEX \`reports__status_idx\` ON \`reports\` (\`_status\`);`,
  );
  await db.run(sql`CREATE TABLE \`__new_previews\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`source_id\` text,
  	\`source_type\` text,
  	\`source_updated_at\` text,
  	\`title\` text,
  	\`match_id\` integer,
  	\`body\` text,
  	\`author_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`match_id\`) REFERENCES \`matches\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`author_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(
    sql`INSERT INTO \`__new_previews\`("id", "source_id", "source_type", "source_updated_at", "title", "match_id", "body", "author_id", "updated_at", "created_at", "_status") SELECT "id", "source_id", "source_type", "source_updated_at", "title", "match_id", "body", "author_id", "updated_at", "created_at", 'published' FROM \`previews\`;`,
  );
  await db.run(sql`DROP TABLE \`previews\`;`);
  await db.run(sql`ALTER TABLE \`__new_previews\` RENAME TO \`previews\`;`);
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
  await db.run(
    sql`CREATE INDEX \`previews__status_idx\` ON \`previews\` (\`_status\`);`,
  );
  await db.run(sql`CREATE TABLE \`__new_news\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`source_id\` text,
  	\`source_type\` text,
  	\`source_updated_at\` text,
  	\`title\` text,
  	\`generate_slug\` integer DEFAULT true,
  	\`slug\` text,
  	\`body\` text,
  	\`author_id\` integer,
  	\`image_id\` integer,
  	\`published_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`author_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(
    sql`INSERT INTO \`__new_news\`("id", "source_id", "source_type", "source_updated_at", "title", "generate_slug", "slug", "body", "author_id", "image_id", "published_at", "updated_at", "created_at", "_status") SELECT "id", "source_id", "source_type", "source_updated_at", "title", "generate_slug", "slug", "body", "author_id", "image_id", "published_at", "updated_at", "created_at", 'published' FROM \`news\`;`,
  );
  await db.run(sql`DROP TABLE \`news\`;`);
  await db.run(sql`ALTER TABLE \`__new_news\` RENAME TO \`news\`;`);
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
  await db.run(
    sql`CREATE INDEX \`news__status_idx\` ON \`news\` (\`_status\`);`,
  );
  await db.run(sql`CREATE TABLE \`__new_albums\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`source_id\` text,
  	\`source_type\` text,
  	\`source_updated_at\` text,
  	\`title\` text,
  	\`event_date\` text,
  	\`match_id\` integer,
  	\`photographer_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`match_id\`) REFERENCES \`matches\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`photographer_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(
    sql`INSERT INTO \`__new_albums\`("id", "source_id", "source_type", "source_updated_at", "title", "event_date", "match_id", "photographer_id", "updated_at", "created_at", "_status") SELECT "id", "source_id", "source_type", "source_updated_at", "title", "event_date", "match_id", "photographer_id", "updated_at", "created_at", 'published' FROM \`albums\`;`,
  );
  await db.run(sql`DROP TABLE \`albums\`;`);
  await db.run(sql`ALTER TABLE \`__new_albums\` RENAME TO \`albums\`;`);
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
  await db.run(
    sql`CREATE INDEX \`albums__status_idx\` ON \`albums\` (\`_status\`);`,
  );
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`_reports_v\`;`);
  await db.run(sql`DROP TABLE \`_previews_v\`;`);
  await db.run(sql`DROP TABLE \`_news_v\`;`);
  await db.run(sql`DROP TABLE \`_albums_v\`;`);
  await db.run(sql`DROP TABLE \`_albums_v_rels\`;`);
  await db.run(sql`PRAGMA foreign_keys=OFF;`);
  await db.run(sql`CREATE TABLE \`__new_reports\` (
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
    sql`INSERT INTO \`__new_reports\`("id", "source_id", "source_type", "source_updated_at", "title", "match_id", "body", "author_id", "updated_at", "created_at") SELECT "id", "source_id", "source_type", "source_updated_at", "title", "match_id", "body", "author_id", "updated_at", "created_at" FROM \`reports\`;`,
  );
  await db.run(sql`DROP TABLE \`reports\`;`);
  await db.run(sql`ALTER TABLE \`__new_reports\` RENAME TO \`reports\`;`);
  await db.run(sql`PRAGMA foreign_keys=ON;`);
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
  await db.run(sql`CREATE TABLE \`__new_previews\` (
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
    sql`INSERT INTO \`__new_previews\`("id", "source_id", "source_type", "source_updated_at", "title", "match_id", "body", "author_id", "updated_at", "created_at") SELECT "id", "source_id", "source_type", "source_updated_at", "title", "match_id", "body", "author_id", "updated_at", "created_at" FROM \`previews\`;`,
  );
  await db.run(sql`DROP TABLE \`previews\`;`);
  await db.run(sql`ALTER TABLE \`__new_previews\` RENAME TO \`previews\`;`);
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
  await db.run(sql`CREATE TABLE \`__new_news\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`source_id\` text NOT NULL,
  	\`source_type\` text NOT NULL,
  	\`source_updated_at\` text,
  	\`title\` text NOT NULL,
  	\`generate_slug\` integer DEFAULT true,
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
    sql`INSERT INTO \`__new_news\`("id", "source_id", "source_type", "source_updated_at", "title", "generate_slug", "slug", "body", "author_id", "image_id", "published_at", "updated_at", "created_at") SELECT "id", "source_id", "source_type", "source_updated_at", "title", "generate_slug", "slug", "body", "author_id", "image_id", "published_at", "updated_at", "created_at" FROM \`news\`;`,
  );
  await db.run(sql`DROP TABLE \`news\`;`);
  await db.run(sql`ALTER TABLE \`__new_news\` RENAME TO \`news\`;`);
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
  await db.run(sql`CREATE TABLE \`__new_albums\` (
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
    sql`INSERT INTO \`__new_albums\`("id", "source_id", "source_type", "source_updated_at", "title", "event_date", "match_id", "photographer_id", "updated_at", "created_at") SELECT "id", "source_id", "source_type", "source_updated_at", "title", "event_date", "match_id", "photographer_id", "updated_at", "created_at" FROM \`albums\`;`,
  );
  await db.run(sql`DROP TABLE \`albums\`;`);
  await db.run(sql`ALTER TABLE \`__new_albums\` RENAME TO \`albums\`;`);
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
}
