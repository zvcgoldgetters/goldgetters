import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-sqlite';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(
    sql`ALTER TABLE \`teams\` ADD COLUMN \`generate_slug\` integer DEFAULT true;`,
  );
  await db.run(
    sql`ALTER TABLE \`venues\` ADD COLUMN \`generate_slug\` integer DEFAULT true;`,
  );
  await db.run(
    sql`ALTER TABLE \`leagues\` ADD COLUMN \`generate_slug\` integer DEFAULT true;`,
  );
  await db.run(
    sql`ALTER TABLE \`news\` ADD COLUMN \`generate_slug\` integer DEFAULT true;`,
  );
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`teams\` DROP COLUMN \`generate_slug\`;`);
  await db.run(sql`ALTER TABLE \`venues\` DROP COLUMN \`generate_slug\`;`);
  await db.run(sql`ALTER TABLE \`leagues\` DROP COLUMN \`generate_slug\`;`);
  await db.run(sql`ALTER TABLE \`news\` DROP COLUMN \`generate_slug\`;`);
}
