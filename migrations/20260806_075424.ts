import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`team_events\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`event_type\` text NOT NULL,
  	\`starts_at\` text NOT NULL,
  	\`ends_at\` text,
  	\`location\` text,
  	\`description\` text,
  	\`status\` text DEFAULT 'scheduled',
  	\`source_id\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `);
  await db.run(
    sql`CREATE UNIQUE INDEX \`team_events_source_id_idx\` ON \`team_events\` (\`source_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`team_events_updated_at_idx\` ON \`team_events\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`team_events_created_at_idx\` ON \`team_events\` (\`created_at\`);`,
  );
  await db.run(sql`CREATE TABLE \`rsvp_events\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`team_event_id\` integer NOT NULL,
  	\`response_starts_at\` text,
  	\`response_deadline\` text,
  	\`allow_maybe\` integer DEFAULT true,
  	\`max_attendees\` numeric,
  	\`guest_list_visibility\` text DEFAULT 'invitees',
  	\`invitation_status\` text DEFAULT 'draft',
  	\`invitation_sent_at\` text,
  	\`cancelled_at\` text,
  	\`cancellation_reason\` text,
  	\`source_rid\` text,
  	\`source_nid\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`team_event_id\`) REFERENCES \`team_events\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(
    sql`CREATE INDEX \`rsvp_events_team_event_idx\` ON \`rsvp_events\` (\`team_event_id\`);`,
  );
  await db.run(
    sql`CREATE UNIQUE INDEX \`rsvp_events_source_rid_idx\` ON \`rsvp_events\` (\`source_rid\`);`,
  );
  await db.run(
    sql`CREATE UNIQUE INDEX \`rsvp_events_source_nid_idx\` ON \`rsvp_events\` (\`source_nid\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`rsvp_events_updated_at_idx\` ON \`rsvp_events\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`rsvp_events_created_at_idx\` ON \`rsvp_events\` (\`created_at\`);`,
  );
  await db.run(sql`CREATE TABLE \`rsvp_events_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`rsvp_events\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`rsvp_events_rels_order_idx\` ON \`rsvp_events_rels\` (\`order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`rsvp_events_rels_parent_idx\` ON \`rsvp_events_rels\` (\`parent_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`rsvp_events_rels_path_idx\` ON \`rsvp_events_rels\` (\`path\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`rsvp_events_rels_users_id_idx\` ON \`rsvp_events_rels\` (\`users_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`rsvp_responses\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`rsvp_event_id\` integer NOT NULL,
  	\`invitee_id\` integer,
  	\`invitee_email\` text,
  	\`invitee_name\` text,
  	\`response\` text DEFAULT 'none' NOT NULL,
  	\`comment\` text,
  	\`guest_count\` numeric DEFAULT 0,
  	\`invited_at\` text,
  	\`received_at\` text,
  	\`responded_at\` text,
  	\`invitation_id\` text,
  	\`token_hash\` text,
  	\`token_expires_at\` text,
  	\`token_revoked_at\` text,
  	\`token_last_used_at\` text,
  	\`source_invite_id\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`rsvp_event_id\`) REFERENCES \`rsvp_events\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`invitee_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(
    sql`CREATE INDEX \`rsvp_responses_rsvp_event_idx\` ON \`rsvp_responses\` (\`rsvp_event_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`rsvp_responses_invitee_idx\` ON \`rsvp_responses\` (\`invitee_id\`);`,
  );
  await db.run(
    sql`CREATE UNIQUE INDEX \`rsvp_responses_invitation_id_idx\` ON \`rsvp_responses\` (\`invitation_id\`);`,
  );
  await db.run(
    sql`CREATE UNIQUE INDEX \`rsvp_responses_token_hash_idx\` ON \`rsvp_responses\` (\`token_hash\`);`,
  );
  await db.run(
    sql`CREATE UNIQUE INDEX \`rsvp_responses_source_invite_id_idx\` ON \`rsvp_responses\` (\`source_invite_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`rsvp_responses_updated_at_idx\` ON \`rsvp_responses\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`rsvp_responses_created_at_idx\` ON \`rsvp_responses\` (\`created_at\`);`,
  );
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`team_events_id\` integer REFERENCES team_events(id);`,
  );
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`rsvp_events_id\` integer REFERENCES rsvp_events(id);`,
  );
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`rsvp_responses_id\` integer REFERENCES rsvp_responses(id);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_team_events_id_idx\` ON \`payload_locked_documents_rels\` (\`team_events_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_rsvp_events_id_idx\` ON \`payload_locked_documents_rels\` (\`rsvp_events_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_rsvp_responses_id_idx\` ON \`payload_locked_documents_rels\` (\`rsvp_responses_id\`);`,
  );
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`team_events\`;`);
  await db.run(sql`DROP TABLE \`rsvp_events\`;`);
  await db.run(sql`DROP TABLE \`rsvp_events_rels\`;`);
  await db.run(sql`DROP TABLE \`rsvp_responses\`;`);
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
}
