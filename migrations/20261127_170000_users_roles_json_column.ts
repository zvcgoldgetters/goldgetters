import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-sqlite';

const recognizedRoles = new Set<string>([
  'administrator',
  'director',
  'team-manager',
  'treasurer',
  'editor',
  'member',
]);

function parseRoleArray(raw: unknown): string[] {
  let parsed: unknown;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  } else {
    parsed = raw;
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  const uniqueRoles = new Set<string>();
  parsed.forEach((entry) => {
    if (typeof entry === 'string' && recognizedRoles.has(entry)) {
      uniqueRoles.add(entry);
    }
  });

  return [...uniqueRoles];
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
  const columnsResult = await db.run(sql`PRAGMA table_info('users');`);
  const hasRolesColumn = columnsResult.rows.some(
    (row) => (row as { name?: unknown }).name === 'roles',
  );

  if (!hasRolesColumn) {
    await db.run(
      sql`ALTER TABLE \`users\` ADD \`roles\` text DEFAULT '["member"]' NOT NULL;`,
    );
    await db.run(sql`UPDATE \`users\` SET \`roles\` = '[]';`);
  }

  const joinTableResult = await db.run(
    sql`SELECT \`name\` FROM \`sqlite_master\` WHERE \`type\` = 'table' AND \`name\` = 'users_roles';`,
  );

  if (joinTableResult.rows.length > 0) {
    if (hasRolesColumn) {
      await db.run(sql`UPDATE \`users\` SET \`roles\` = '[]';`);
    }

    const roleRows = await db.run(
      sql`SELECT \`parent_id\`, \`value\` FROM \`users_roles\` WHERE \`value\` IS NOT NULL ORDER BY \`parent_id\` ASC, \`order\` ASC, \`id\` ASC;`,
    );
    const rolesByUser = new Map<number, string[]>();

    roleRows.rows.forEach((row) => {
      const record = row as { parent_id?: unknown; value?: unknown };
      const parentId = Number(record.parent_id);
      const roleValue = record.value;
      if (
        !Number.isInteger(parentId) ||
        typeof roleValue !== 'string' ||
        !recognizedRoles.has(roleValue)
      ) {
        return;
      }

      const existing = rolesByUser.get(parentId) ?? [];
      if (!existing.includes(roleValue)) {
        rolesByUser.set(parentId, [...existing, roleValue]);
      }
    });

    await [...rolesByUser.entries()].reduce(
      async (previous, [parentId, roles]) => {
        await previous;
        await db.run(
          sql`UPDATE \`users\` SET \`roles\` = ${JSON.stringify(roles)} WHERE \`id\` = ${parentId};`,
        );
      },
      Promise.resolve(),
    );

    await db.run(sql`DROP TABLE \`users_roles\`;`);
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`users_roles\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`users_roles_order_idx\` ON \`users_roles\` (\`order\`);`,
  );
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`users_roles_parent_idx\` ON \`users_roles\` (\`parent_id\`);`,
  );

  const columnsResult = await db.run(sql`PRAGMA table_info('users');`);
  const hasRolesColumn = columnsResult.rows.some(
    (row) => (row as { name?: unknown }).name === 'roles',
  );

  if (hasRolesColumn) {
    const userRows = await db.run(
      sql`SELECT \`id\`, \`roles\` FROM \`users\` WHERE \`roles\` IS NOT NULL;`,
    );

    await userRows.rows.reduce(async (previous, row) => {
      await previous;
      const record = row as { id?: unknown; roles?: unknown };
      const userId = Number(record.id);
      if (!Number.isInteger(userId)) {
        return;
      }

      const roles = parseRoleArray(record.roles);
      await roles.reduce(async (prevInsert, role, index) => {
        await prevInsert;
        await db.run(
          sql`INSERT INTO \`users_roles\` (\`order\`, \`parent_id\`, \`value\`) VALUES (${index + 1}, ${userId}, ${role});`,
        );
      }, Promise.resolve());
    }, Promise.resolve());

    await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`roles\`;`);
  }
}
