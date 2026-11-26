import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(
    sql`ALTER TABLE \`reports\` ADD \`owner_id\` integer REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null;`,
  );
  await db.run(
    sql`CREATE INDEX \`reports_owner_idx\` ON \`reports\` (\`owner_id\`);`,
  );
  await db.run(
    sql`ALTER TABLE \`_reports_v\` ADD \`version_owner_id\` integer REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null;`,
  );
  await db.run(
    sql`CREATE INDEX \`_reports_v_version_version_owner_idx\` ON \`_reports_v\` (\`version_owner_id\`);`,
  );
  await db.run(
    sql`UPDATE \`reports\` SET \`owner_id\` = CASE WHEN EXISTS (SELECT 1 FROM \`_reports_v\` AS \`v\` WHERE \`v\`.\`parent_id\` = \`reports\`.\`id\`) THEN (SELECT \`v\`.\`version_author_id\` FROM \`_reports_v\` AS \`v\` WHERE \`v\`.\`parent_id\` = \`reports\`.\`id\` ORDER BY COALESCE(\`v\`.\`latest\`, 0) DESC, \`v\`.\`updated_at\` DESC, \`v\`.\`id\` DESC LIMIT 1) ELSE \`author_id\` END;`,
  );
  await db.run(
    sql`UPDATE \`_reports_v\` SET \`version_owner_id\` = (SELECT \`reports\`.\`owner_id\` FROM \`reports\` WHERE \`reports\`.\`id\` = \`_reports_v\`.\`parent_id\`) WHERE \`parent_id\` IS NOT NULL;`,
  );

  await db.run(
    sql`ALTER TABLE \`previews\` ADD \`owner_id\` integer REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null;`,
  );
  await db.run(
    sql`CREATE INDEX \`previews_owner_idx\` ON \`previews\` (\`owner_id\`);`,
  );
  await db.run(
    sql`ALTER TABLE \`_previews_v\` ADD \`version_owner_id\` integer REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null;`,
  );
  await db.run(
    sql`CREATE INDEX \`_previews_v_version_version_owner_idx\` ON \`_previews_v\` (\`version_owner_id\`);`,
  );
  await db.run(
    sql`UPDATE \`previews\` SET \`owner_id\` = CASE WHEN EXISTS (SELECT 1 FROM \`_previews_v\` AS \`v\` WHERE \`v\`.\`parent_id\` = \`previews\`.\`id\`) THEN (SELECT \`v\`.\`version_author_id\` FROM \`_previews_v\` AS \`v\` WHERE \`v\`.\`parent_id\` = \`previews\`.\`id\` ORDER BY COALESCE(\`v\`.\`latest\`, 0) DESC, \`v\`.\`updated_at\` DESC, \`v\`.\`id\` DESC LIMIT 1) ELSE \`author_id\` END;`,
  );
  await db.run(
    sql`UPDATE \`_previews_v\` SET \`version_owner_id\` = (SELECT \`previews\`.\`owner_id\` FROM \`previews\` WHERE \`previews\`.\`id\` = \`_previews_v\`.\`parent_id\`) WHERE \`parent_id\` IS NOT NULL;`,
  );

  await db.run(
    sql`ALTER TABLE \`news\` ADD \`owner_id\` integer REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null;`,
  );
  await db.run(
    sql`CREATE INDEX \`news_owner_idx\` ON \`news\` (\`owner_id\`);`,
  );
  await db.run(
    sql`ALTER TABLE \`_news_v\` ADD \`version_owner_id\` integer REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null;`,
  );
  await db.run(
    sql`CREATE INDEX \`_news_v_version_version_owner_idx\` ON \`_news_v\` (\`version_owner_id\`);`,
  );
  await db.run(
    sql`UPDATE \`news\` SET \`owner_id\` = CASE WHEN EXISTS (SELECT 1 FROM \`_news_v\` AS \`v\` WHERE \`v\`.\`parent_id\` = \`news\`.\`id\`) THEN (SELECT \`v\`.\`version_author_id\` FROM \`_news_v\` AS \`v\` WHERE \`v\`.\`parent_id\` = \`news\`.\`id\` ORDER BY COALESCE(\`v\`.\`latest\`, 0) DESC, \`v\`.\`updated_at\` DESC, \`v\`.\`id\` DESC LIMIT 1) ELSE \`author_id\` END;`,
  );
  await db.run(
    sql`UPDATE \`_news_v\` SET \`version_owner_id\` = (SELECT \`news\`.\`owner_id\` FROM \`news\` WHERE \`news\`.\`id\` = \`_news_v\`.\`parent_id\`) WHERE \`parent_id\` IS NOT NULL;`,
  );

  await db.run(
    sql`ALTER TABLE \`albums\` ADD \`owner_id\` integer REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null;`,
  );
  await db.run(
    sql`CREATE INDEX \`albums_owner_idx\` ON \`albums\` (\`owner_id\`);`,
  );
  await db.run(
    sql`ALTER TABLE \`_albums_v\` ADD \`version_owner_id\` integer REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null;`,
  );
  await db.run(
    sql`CREATE INDEX \`_albums_v_version_version_owner_idx\` ON \`_albums_v\` (\`version_owner_id\`);`,
  );
  await db.run(
    sql`UPDATE \`albums\` SET \`owner_id\` = CASE WHEN EXISTS (SELECT 1 FROM \`_albums_v\` AS \`v\` WHERE \`v\`.\`parent_id\` = \`albums\`.\`id\`) THEN (SELECT \`v\`.\`version_photographer_id\` FROM \`_albums_v\` AS \`v\` WHERE \`v\`.\`parent_id\` = \`albums\`.\`id\` ORDER BY COALESCE(\`v\`.\`latest\`, 0) DESC, \`v\`.\`updated_at\` DESC, \`v\`.\`id\` DESC LIMIT 1) ELSE \`photographer_id\` END;`,
  );
  await db.run(
    sql`UPDATE \`_albums_v\` SET \`version_owner_id\` = (SELECT \`albums\`.\`owner_id\` FROM \`albums\` WHERE \`albums\`.\`id\` = \`_albums_v\`.\`parent_id\`) WHERE \`parent_id\` IS NOT NULL;`,
  );
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
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
    sql`INSERT INTO \`__new_reports\`("id", "source_id", "source_type", "source_updated_at", "title", "match_id", "body", "author_id", "updated_at", "created_at", "_status") SELECT "id", "source_id", "source_type", "source_updated_at", "title", "match_id", "body", "author_id", "updated_at", "created_at", "_status" FROM \`reports\`;`,
  );
  await db.run(sql`DROP TABLE \`reports\`;`);
  await db.run(sql`ALTER TABLE \`__new_reports\` RENAME TO \`reports\`;`);
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
  await db.run(sql`CREATE TABLE \`__new__reports_v\` (
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
    sql`INSERT INTO \`__new__reports_v\`("id", "parent_id", "version_source_id", "version_source_type", "version_source_updated_at", "version_title", "version_match_id", "version_body", "version_author_id", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest") SELECT "id", "parent_id", "version_source_id", "version_source_type", "version_source_updated_at", "version_title", "version_match_id", "version_body", "version_author_id", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest" FROM \`_reports_v\`;`,
  );
  await db.run(sql`DROP TABLE \`_reports_v\`;`);
  await db.run(sql`ALTER TABLE \`__new__reports_v\` RENAME TO \`_reports_v\`;`);
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
    sql`INSERT INTO \`__new_previews\`("id", "source_id", "source_type", "source_updated_at", "title", "match_id", "body", "author_id", "updated_at", "created_at", "_status") SELECT "id", "source_id", "source_type", "source_updated_at", "title", "match_id", "body", "author_id", "updated_at", "created_at", "_status" FROM \`previews\`;`,
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
  await db.run(sql`CREATE TABLE \`__new__previews_v\` (
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
    sql`INSERT INTO \`__new__previews_v\`("id", "parent_id", "version_source_id", "version_source_type", "version_source_updated_at", "version_title", "version_match_id", "version_body", "version_author_id", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest") SELECT "id", "parent_id", "version_source_id", "version_source_type", "version_source_updated_at", "version_title", "version_match_id", "version_body", "version_author_id", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest" FROM \`_previews_v\`;`,
  );
  await db.run(sql`DROP TABLE \`_previews_v\`;`);
  await db.run(
    sql`ALTER TABLE \`__new__previews_v\` RENAME TO \`_previews_v\`;`,
  );
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
    sql`INSERT INTO \`__new_news\`("id", "source_id", "source_type", "source_updated_at", "title", "generate_slug", "slug", "body", "author_id", "image_id", "published_at", "updated_at", "created_at", "_status") SELECT "id", "source_id", "source_type", "source_updated_at", "title", "generate_slug", "slug", "body", "author_id", "image_id", "published_at", "updated_at", "created_at", "_status" FROM \`news\`;`,
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
  await db.run(sql`CREATE TABLE \`__new__news_v\` (
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
    sql`INSERT INTO \`__new__news_v\`("id", "parent_id", "version_source_id", "version_source_type", "version_source_updated_at", "version_title", "version_generate_slug", "version_slug", "version_body", "version_author_id", "version_image_id", "version_published_at", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest") SELECT "id", "parent_id", "version_source_id", "version_source_type", "version_source_updated_at", "version_title", "version_generate_slug", "version_slug", "version_body", "version_author_id", "version_image_id", "version_published_at", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest" FROM \`_news_v\`;`,
  );
  await db.run(sql`DROP TABLE \`_news_v\`;`);
  await db.run(sql`ALTER TABLE \`__new__news_v\` RENAME TO \`_news_v\`;`);
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
    sql`INSERT INTO \`__new_albums\`("id", "source_id", "source_type", "source_updated_at", "title", "event_date", "match_id", "photographer_id", "updated_at", "created_at", "_status") SELECT "id", "source_id", "source_type", "source_updated_at", "title", "event_date", "match_id", "photographer_id", "updated_at", "created_at", "_status" FROM \`albums\`;`,
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
  await db.run(sql`CREATE TABLE \`__new__albums_v\` (
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
    sql`INSERT INTO \`__new__albums_v\`("id", "parent_id", "version_source_id", "version_source_type", "version_source_updated_at", "version_title", "version_event_date", "version_match_id", "version_photographer_id", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest") SELECT "id", "parent_id", "version_source_id", "version_source_type", "version_source_updated_at", "version_title", "version_event_date", "version_match_id", "version_photographer_id", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest" FROM \`_albums_v\`;`,
  );
  await db.run(sql`DROP TABLE \`_albums_v\`;`);
  await db.run(sql`ALTER TABLE \`__new__albums_v\` RENAME TO \`_albums_v\`;`);
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
  await db.run(sql`PRAGMA foreign_keys=ON;`);
}
