import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-sqlite';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`users_roles\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`users_roles_order_idx\` ON \`users_roles\` (\`order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`users_roles_parent_idx\` ON \`users_roles\` (\`parent_id\`);`,
  );
  await db.run(
    sql`INSERT INTO \`users_roles\` (\`order\`, \`parent_id\`, \`value\`) SELECT 1, \`id\`, CASE \`role\` WHEN 'finance' THEN 'treasurer' WHEN 'organizer' THEN 'team-manager' ELSE \`role\` END FROM \`users\` WHERE \`role\` IS NOT NULL;`,
  );
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`role\`;`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(
    sql`ALTER TABLE \`users\` ADD \`role\` text DEFAULT 'member' NOT NULL;`,
  );
  // Preserve highest-privilege legacy role regardless of array order;
  // unsupported new roles (such as 'director') roll back to 'member'.
  await db.run(
    sql`UPDATE \`users\` SET \`role\` = COALESCE((SELECT CASE \`value\` WHEN 'administrator' THEN 'administrator' WHEN 'treasurer' THEN 'finance' WHEN 'team-manager' THEN 'organizer' WHEN 'editor' THEN 'editor' ELSE 'member' END FROM \`users_roles\` WHERE \`parent_id\` = \`users\`.\`id\` ORDER BY CASE \`value\` WHEN 'administrator' THEN 1 WHEN 'treasurer' THEN 2 WHEN 'team-manager' THEN 3 WHEN 'editor' THEN 4 WHEN 'member' THEN 5 ELSE 6 END ASC, \`order\` ASC LIMIT 1), 'member');`,
  );
  await db.run(sql`DROP TABLE \`users_roles\`;`);
}
