import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-sqlite';

export const legacyBackfillImportRun =
  'migration:20261127_182949_remove_domain_source_fields';

const backfillTrackingTable = '_migration_source_records_backfill';
const backfillDeleteTrigger = '_migration_source_records_backfill_ad';
const targetDeleteTriggerPrefix = '_migration_source_records_target_del_';
const indexStateTable = '_migration_source_records_state';

type DomainSourceTable = {
  collectionSlug: string;
  tableName: string;
  versionTableName?: string;
};

type DomainSourceCandidate = {
  sourceId: string;
  sourceType: string;
  sourceUpdatedAt: string | null;
  targetCreatedAt: string | null;
  targetId: string;
};

type PlannedSourceAction =
  | {
      kind: 'insertNew';
      sourceId: string;
      sourceType: string;
      sourceUpdatedAt: string | null;
      targetCollection: string;
      targetCreatedAt: string | null;
      targetId: string;
    }
  | {
      existingId: number;
      kind: 'updateTimestamp';
      sourceId: string;
      sourceType: string;
      sourceUpdatedAt: string;
      targetCollection: string;
      targetCreatedAt: string | null;
      targetId: string;
    }
  | {
      existingId: number;
      kind: 'keepExisting';
      sourceId: string;
      sourceType: string;
      sourceUpdatedAt: string | null;
      targetCollection: string;
      targetCreatedAt: string | null;
      targetId: string;
    };

type BackfillTrackingEntry = {
  isBackfill: number;
  sourceCreatedAt: string;
  sourceId: string;
  sourceType: string;
  targetCollection: string;
  targetCreatedAt: string | null;
  targetDeleted: number;
  targetId: string;
};

type VerifiedTrackedMapping = {
  sourceId: string;
  sourceRecordId: number;
  sourceType: string;
  sourceUpdatedAt: string | null;
  targetCollection: string;
  targetId: string;
};

type PlannedRollbackMapping = {
  id: number;
  shouldRestoreToDomain: boolean;
  sourceId: string;
  sourceType: string;
  sourceUpdatedAt: string | null;
  targetId: string;
  willBeRemovedFromSourceRecords: boolean;
};

const domainSourceTables: readonly DomainSourceTable[] = [
  { collectionSlug: 'users', tableName: 'users' },
  { collectionSlug: 'players', tableName: 'players' },
  { collectionSlug: 'teams', tableName: 'teams' },
  { collectionSlug: 'venues', tableName: 'venues' },
  { collectionSlug: 'leagues', tableName: 'leagues' },
  { collectionSlug: 'seasons', tableName: 'seasons' },
  { collectionSlug: 'matches', tableName: 'matches' },
  { collectionSlug: 'team-events', tableName: 'team_events' },
  {
    collectionSlug: 'reports',
    tableName: 'reports',
    versionTableName: '_reports_v',
  },
  {
    collectionSlug: 'previews',
    tableName: 'previews',
    versionTableName: '_previews_v',
  },
  {
    collectionSlug: 'news',
    tableName: 'news',
    versionTableName: '_news_v',
  },
  {
    collectionSlug: 'albums',
    tableName: 'albums',
    versionTableName: '_albums_v',
  },
  { collectionSlug: 'media', tableName: 'media' },
  { collectionSlug: 'bookings', tableName: 'bookings' },
];

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function getTargetDeleteTriggerName(tableName: string): string {
  return `${targetDeleteTriggerPrefix}${tableName}`;
}

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

async function dropColumnIfPresent(
  db: MigrateUpArgs['db'],
  tableName: string,
  columnNames: Set<string>,
  columnName: string,
): Promise<void> {
  if (!columnNames.has(columnName)) {
    return;
  }

  await db.run(
    sql.raw(`ALTER TABLE \`${tableName}\` DROP COLUMN \`${columnName}\`;`),
  );
}

async function addTextColumnIfMissing(
  db: MigrateDownArgs['db'],
  tableName: string,
  columnNames: Set<string>,
  columnName: string,
): Promise<void> {
  if (columnNames.has(columnName)) {
    return;
  }

  await db.run(
    sql.raw(`ALTER TABLE \`${tableName}\` ADD \`${columnName}\` text;`),
  );
}

async function addIntegerColumnIfMissing(
  db: MigrateUpArgs['db'],
  tableName: string,
  columnNames: Set<string>,
  columnName: string,
  defaultValue: number,
): Promise<void> {
  if (columnNames.has(columnName)) {
    return;
  }

  await db.run(
    sql.raw(
      `ALTER TABLE \`${tableName}\` ADD \`${columnName}\` integer NOT NULL DEFAULT ${defaultValue};`,
    ),
  );
}

async function ensureBackfillTrackingSchema(
  db: MigrateUpArgs['db'],
): Promise<void> {
  await db.run(
    sql.raw(`
      CREATE TABLE IF NOT EXISTS \`${backfillTrackingTable}\` (
        \`source_record_id\` integer PRIMARY KEY NOT NULL,
        \`source_type\` text NOT NULL DEFAULT '',
        \`source_id\` text NOT NULL DEFAULT '',
        \`target_collection\` text NOT NULL DEFAULT '',
        \`target_id\` text NOT NULL DEFAULT '',
        \`source_created_at\` text NOT NULL DEFAULT '',
        \`target_created_at\` text,
        \`target_deleted\` integer NOT NULL DEFAULT 0,
        \`is_backfill\` integer NOT NULL DEFAULT 1
      );
    `),
  );

  const trackingColumns = await getTableColumnNames(db, backfillTrackingTable);
  await addTextColumnIfMissing(
    db,
    backfillTrackingTable,
    trackingColumns,
    'source_type',
  );
  await addTextColumnIfMissing(
    db,
    backfillTrackingTable,
    trackingColumns,
    'source_id',
  );
  await addTextColumnIfMissing(
    db,
    backfillTrackingTable,
    trackingColumns,
    'target_collection',
  );
  await addTextColumnIfMissing(
    db,
    backfillTrackingTable,
    trackingColumns,
    'target_id',
  );
  await addTextColumnIfMissing(
    db,
    backfillTrackingTable,
    trackingColumns,
    'source_created_at',
  );
  await addTextColumnIfMissing(
    db,
    backfillTrackingTable,
    trackingColumns,
    'target_created_at',
  );
  await addIntegerColumnIfMissing(
    db,
    backfillTrackingTable,
    trackingColumns,
    'target_deleted',
    0,
  );
  await addIntegerColumnIfMissing(
    db,
    backfillTrackingTable,
    trackingColumns,
    'is_backfill',
    1,
  );
}

async function loadVerifiedTrackedMappings(
  db: MigrateUpArgs['db'],
): Promise<Map<string, VerifiedTrackedMapping>> {
  const verifiedByTarget = new Map<string, VerifiedTrackedMapping>();
  if (!(await tableExists(db, backfillTrackingTable))) {
    return verifiedByTarget;
  }

  const trackingColumns = await getTableColumnNames(db, backfillTrackingTable);
  const requiredColumns = [
    'source_record_id',
    'source_type',
    'source_id',
    'target_collection',
    'target_id',
    'source_created_at',
  ];
  if (!requiredColumns.every((col) => trackingColumns.has(col))) {
    return verifiedByTarget;
  }

  const verifiedResult = await db.run(
    sql.raw(`
      SELECT
        sr.\`id\` AS \`source_record_id\`,
        sr.\`source_type\` AS \`source_type\`,
        sr.\`source_id\` AS \`source_id\`,
        sr.\`source_updated_at\` AS \`source_updated_at\`,
        sr.\`target_collection\` AS \`target_collection\`,
        sr.\`target_id\` AS \`target_id\`
      FROM \`source_records\` sr
      INNER JOIN \`${backfillTrackingTable}\` b
        ON sr.\`id\` = b.\`source_record_id\`
        AND sr.\`source_type\` = b.\`source_type\`
        AND sr.\`source_id\` = b.\`source_id\`
        AND sr.\`target_collection\` = b.\`target_collection\`
        AND sr.\`target_id\` = b.\`target_id\`
        AND sr.\`created_at\` = b.\`source_created_at\`;
    `),
  );

  verifiedResult.rows.forEach((rawRow) => {
    const row = rawRow as {
      source_id?: unknown;
      source_record_id?: unknown;
      source_type?: unknown;
      source_updated_at?: unknown;
      target_collection?: unknown;
      target_id?: unknown;
    };
    const sourceRecordId = Number(row.source_record_id);
    const sourceType = String(row.source_type ?? '');
    const sourceId = String(row.source_id ?? '');
    const targetCollection = String(row.target_collection ?? '');
    const targetId = String(row.target_id ?? '');
    if (
      !Number.isInteger(sourceRecordId) ||
      !sourceType ||
      !sourceId ||
      !targetCollection ||
      !targetId
    ) {
      return;
    }

    verifiedByTarget.set(`${targetCollection}\0${targetId}`, {
      sourceId,
      sourceRecordId,
      sourceType,
      sourceUpdatedAt: normalizeOptionalString(row.source_updated_at),
      targetCollection,
      targetId,
    });
  });

  return verifiedByTarget;
}

async function queryDomainRowsWithSourceMetadata(
  db: MigrateUpArgs['db'],
  entry: DomainSourceTable,
  verifiedByTarget: Map<string, VerifiedTrackedMapping>,
): Promise<DomainSourceCandidate[]> {
  const tableColumns = await getTableColumnNames(db, entry.tableName);
  const hasMainSourceId = tableColumns.has('source_id');
  const hasMainSourceType = tableColumns.has('source_type');
  const hasMainSourceUpdatedAt = tableColumns.has('source_updated_at');
  const hasMainCreatedAt = tableColumns.has('created_at');
  const mainColumnRemovalStarted =
    !hasMainSourceId || !hasMainSourceType || !hasMainSourceUpdatedAt;

  const versionColumns = entry.versionTableName
    ? await getTableColumnNames(db, entry.versionTableName)
    : null;
  const hasVersionSourceId = Boolean(versionColumns?.has('version_source_id'));
  const hasVersionSourceType = Boolean(
    versionColumns?.has('version_source_type'),
  );
  const hasVersionSourceUpdatedAt = Boolean(
    versionColumns?.has('version_source_updated_at'),
  );

  if (!hasMainSourceId && (!entry.versionTableName || !hasVersionSourceId)) {
    return [];
  }

  type MainRowData = {
    sourceId: string | null;
    sourceType: string | null;
    sourceUpdatedAt: string | null;
    targetCreatedAt: string | null;
  };
  type VersionRowData = {
    isLatest: boolean;
    sourceId: string | null;
    sourceType: string | null;
    sourceUpdatedAt: string | null;
    versionId: string;
  };

  const mainRowsById = new Map<string, MainRowData>();
  if (hasMainSourceId) {
    const mainSelectFields = [
      `\`id\` AS \`id\``,
      hasMainCreatedAt
        ? `\`created_at\` AS \`created_at\``
        : `NULL AS \`created_at\``,
      `\`source_id\` AS \`source_id\``,
      hasMainSourceType
        ? `\`source_type\` AS \`source_type\``
        : `NULL AS \`source_type\``,
      hasMainSourceUpdatedAt
        ? `\`source_updated_at\` AS \`source_updated_at\``
        : `NULL AS \`source_updated_at\``,
    ];
    const mainFilters = [
      `(\`source_id\` IS NOT NULL AND TRIM(\`source_id\`) != '')`,
      ...(hasMainSourceType
        ? [`(\`source_type\` IS NOT NULL AND TRIM(\`source_type\`) != '')`]
        : []),
      ...(hasMainSourceUpdatedAt
        ? [
            `(\`source_updated_at\` IS NOT NULL AND TRIM(\`source_updated_at\`) != '')`,
          ]
        : []),
    ];

    const mainResult = await db.run(
      sql.raw(`
        SELECT ${mainSelectFields.join(', ')}
        FROM \`${entry.tableName}\`
        WHERE (${mainFilters.join(' OR ')})
        ORDER BY \`id\` ASC;
      `),
    );

    mainResult.rows.forEach((rawRow) => {
      const row = rawRow as {
        created_at?: unknown;
        id?: unknown;
        source_id?: unknown;
        source_type?: unknown;
        source_updated_at?: unknown;
      };
      const targetId = String(row.id ?? '');
      mainRowsById.set(targetId, {
        sourceId: normalizeOptionalString(row.source_id),
        sourceType: normalizeOptionalString(row.source_type),
        sourceUpdatedAt: normalizeOptionalString(row.source_updated_at),
        targetCreatedAt: normalizeOptionalString(row.created_at),
      });
    });
  }

  const versionRowsByParentId = new Map<string, VersionRowData[]>();
  const parentIdsFromVersions: string[] = [];

  if (entry.versionTableName && hasVersionSourceId) {
    const versionTableName = entry.versionTableName;
    const versionSelectFields = [
      `\`id\` AS \`version_id\``,
      `\`parent_id\` AS \`parent_id\``,
      `\`latest\` AS \`latest\``,
      `\`version_source_id\` AS \`version_source_id\``,
      hasVersionSourceType
        ? `\`version_source_type\` AS \`version_source_type\``
        : `NULL AS \`version_source_type\``,
      hasVersionSourceUpdatedAt
        ? `\`version_source_updated_at\` AS \`version_source_updated_at\``
        : `NULL AS \`version_source_updated_at\``,
    ];
    const versionFilters = [
      `(\`version_source_id\` IS NOT NULL AND TRIM(\`version_source_id\`) != '')`,
      ...(hasVersionSourceType
        ? [
            `(\`version_source_type\` IS NOT NULL AND TRIM(\`version_source_type\`) != '')`,
          ]
        : []),
      ...(hasVersionSourceUpdatedAt
        ? [
            `(\`version_source_updated_at\` IS NOT NULL AND TRIM(\`version_source_updated_at\`) != '')`,
          ]
        : []),
    ];

    const versionResult = await db.run(
      sql.raw(`
        SELECT ${versionSelectFields.join(', ')}
        FROM \`${versionTableName}\`
        WHERE (${versionFilters.join(' OR ')})
        ORDER BY \`latest\` DESC, \`updated_at\` DESC, \`id\` DESC;
      `),
    );

    versionResult.rows.forEach((rawRow) => {
      const row = rawRow as {
        latest?: unknown;
        parent_id?: unknown;
        version_id?: unknown;
        version_source_id?: unknown;
        version_source_type?: unknown;
        version_source_updated_at?: unknown;
      };
      const versionId = String(row.version_id ?? '');
      const parentId = normalizeOptionalString(
        row.parent_id === null || row.parent_id === undefined
          ? null
          : String(row.parent_id),
      );
      if (!parentId) {
        throw new Error(
          `Cannot migrate legacy source metadata from orphaned version ${versionTableName}#${versionId} without parent_id.`,
        );
      }

      const list = versionRowsByParentId.get(parentId) ?? [];
      if (list.length === 0) {
        parentIdsFromVersions.push(parentId);
      }
      list.push({
        isLatest: Number(row.latest) === 1,
        sourceId: normalizeOptionalString(row.version_source_id),
        sourceType: normalizeOptionalString(row.version_source_type),
        sourceUpdatedAt: normalizeOptionalString(row.version_source_updated_at),
        versionId,
      });
      versionRowsByParentId.set(parentId, list);
    });
  }

  const allTargetIds = Array.from(
    new Set([...mainRowsById.keys(), ...parentIdsFromVersions]),
  ).sort((left, right) => {
    const leftNum = Number(left);
    const rightNum = Number(right);
    if (Number.isFinite(leftNum) && Number.isFinite(rightNum)) {
      return leftNum - rightNum;
    }
    return left.localeCompare(right);
  });

  // Verify every versioned parent document exists and capture its created_at
  // even when only an older editorial revision holds source metadata.
  await allTargetIds.reduce(async (previous, targetId) => {
    await previous;
    if (mainRowsById.has(targetId)) {
      return;
    }

    const parentResult = await db.run(
      sql.raw(
        hasMainCreatedAt
          ? `SELECT \`created_at\` FROM \`${entry.tableName}\` WHERE CAST(\`id\` AS TEXT) = '${targetId.replace(/'/g, "''")}' LIMIT 1;`
          : `SELECT NULL AS \`created_at\` FROM \`${entry.tableName}\` WHERE CAST(\`id\` AS TEXT) = '${targetId.replace(/'/g, "''")}' LIMIT 1;`,
      ),
    );
    if (parentResult.rows.length !== 1) {
      throw new Error(
        `Cannot migrate legacy source metadata from ${entry.versionTableName ?? entry.tableName}: parent ${entry.tableName}#${targetId} is missing.`,
      );
    }

    const parentRow = parentResult.rows[0] as { created_at?: unknown };
    mainRowsById.set(targetId, {
      sourceId: null,
      sourceType: null,
      sourceUpdatedAt: null,
      targetCreatedAt: normalizeOptionalString(parentRow.created_at),
    });
  }, Promise.resolve());

  return allTargetIds.map((targetId) => {
    const mainRow = mainRowsById.get(targetId) ?? {
      sourceId: null,
      sourceType: null,
      sourceUpdatedAt: null,
      targetCreatedAt: null,
    };
    const versionRows = versionRowsByParentId.get(targetId) ?? [];

    const sourceIds = Array.from(
      new Set(
        [
          mainRow.sourceId,
          ...versionRows.map((versionRow) => versionRow.sourceId),
        ].filter((value): value is string => value !== null),
      ),
    );
    if (sourceIds.length > 1) {
      throw new Error(
        `Conflicting domain source_id values across ${entry.tableName}#${targetId} and ${entry.versionTableName ?? entry.tableName}: ${sourceIds.join(' vs ')}.`,
      );
    }

    const sourceTypes = Array.from(
      new Set(
        [
          mainRow.sourceType,
          ...versionRows.map((versionRow) => versionRow.sourceType),
        ].filter((value): value is string => value !== null),
      ),
    );
    if (sourceTypes.length > 1) {
      throw new Error(
        `Conflicting domain source_type values across ${entry.tableName}#${targetId} and ${entry.versionTableName ?? entry.tableName}: ${sourceTypes.join(' vs ')}.`,
      );
    }

    if (mainColumnRemovalStarted) {
      const verified = verifiedByTarget.get(
        `${entry.collectionSlug}\0${targetId}`,
      );
      if (verified) {
        if (sourceIds.length === 1 && sourceIds[0] !== verified.sourceId) {
          throw new Error(
            `Conflicting domain source_id values across ${entry.tableName}#${targetId} and ${entry.versionTableName ?? entry.tableName}: ${sourceIds[0]} vs ${verified.sourceId}.`,
          );
        }
        if (
          sourceTypes.length === 1 &&
          sourceTypes[0] !== verified.sourceType
        ) {
          throw new Error(
            `Conflicting domain source_type values across ${entry.tableName}#${targetId} and ${entry.versionTableName ?? entry.tableName}: ${sourceTypes[0]} vs ${verified.sourceType}.`,
          );
        }

        return {
          sourceId: verified.sourceId,
          sourceType: verified.sourceType,
          sourceUpdatedAt: verified.sourceUpdatedAt,
          targetCreatedAt: mainRow.targetCreatedAt,
          targetId,
        };
      }
    }

    const sourceId = sourceIds[0] ?? null;
    if (!sourceId) {
      throw new Error(
        `Cannot migrate legacy source metadata from ${entry.tableName}#${targetId} without a non-empty source_id.`,
      );
    }

    const latestVersionTimestamp =
      versionRows.find(
        (versionRow) =>
          versionRow.isLatest && versionRow.sourceUpdatedAt !== null,
      )?.sourceUpdatedAt ?? null;
    const newestAnyVersionTimestamp =
      versionRows.find((versionRow) => versionRow.sourceUpdatedAt !== null)
        ?.sourceUpdatedAt ?? null;

    return {
      sourceId,
      sourceType: sourceTypes[0] ?? entry.collectionSlug,
      sourceUpdatedAt:
        latestVersionTimestamp ??
        mainRow.sourceUpdatedAt ??
        newestAnyVersionTimestamp,
      targetCreatedAt: mainRow.targetCreatedAt,
      targetId,
    };
  });
}

async function recordBackfillProvenanceInTx(
  tx: Parameters<Parameters<MigrateUpArgs['db']['transaction']>[0]>[0],
  params: {
    isBackfill: number;
    sourceCreatedAt: string;
    sourceId: string;
    sourceRecordId: number;
    sourceType: string;
    targetCollection: string;
    targetCreatedAt: string | null;
    targetId: string;
  },
): Promise<void> {
  const targetDeletedDefault = 0;
  await tx.run(
    sql`INSERT INTO ${sql.raw(`\`${backfillTrackingTable}\``)} (
        \`source_record_id\`,
        \`source_type\`,
        \`source_id\`,
        \`target_collection\`,
        \`target_id\`,
        \`source_created_at\`,
        \`target_created_at\`,
        \`target_deleted\`,
        \`is_backfill\`
      ) VALUES (
        ${params.sourceRecordId},
        ${params.sourceType},
        ${params.sourceId},
        ${params.targetCollection},
        ${params.targetId},
        ${params.sourceCreatedAt},
        ${params.targetCreatedAt},
        ${targetDeletedDefault},
        ${params.isBackfill}
      )
      ON CONFLICT(\`source_record_id\`) DO UPDATE SET
        \`source_type\` = excluded.\`source_type\`,
        \`source_id\` = excluded.\`source_id\`,
        \`target_collection\` = excluded.\`target_collection\`,
        \`target_id\` = excluded.\`target_id\`,
        \`source_created_at\` = excluded.\`source_created_at\`,
        \`target_created_at\` = excluded.\`target_created_at\`,
        \`target_deleted\` = excluded.\`target_deleted\`,
        \`is_backfill\` = CASE
          WHEN ${sql.raw(`\`${backfillTrackingTable}\``)}.\`source_created_at\` = excluded.\`source_created_at\`
            THEN MAX(${sql.raw(`\`${backfillTrackingTable}\``)}.\`is_backfill\`, excluded.\`is_backfill\`)
          ELSE excluded.\`is_backfill\`
        END;`,
  );
}

async function applyPlannedActionAtomically(
  db: MigrateUpArgs['db'],
  action: PlannedSourceAction,
): Promise<void> {
  // Run each backfill write and its provenance tracking inside a connection-bound
  // Drizzle transaction so both remote libSQL HTTP and local SQLite stay atomic.
  await db.transaction(async (tx) => {
    if (action.kind === 'insertNew') {
      await tx.run(
        sql`INSERT INTO \`source_records\` (
          \`source_id\`,
          \`source_type\`,
          \`source_updated_at\`,
          \`target_collection\`,
          \`target_id\`,
          \`updated_at\`,
          \`created_at\`
        ) VALUES (
          ${action.sourceId},
          ${action.sourceType},
          ${action.sourceUpdatedAt},
          ${action.targetCollection},
          ${action.targetId},
          strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
          strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        );`,
      );

      const insertedResult = await tx.run(
        sql`SELECT \`id\`, \`created_at\`
          FROM \`source_records\`
          WHERE \`source_type\` = ${action.sourceType} AND \`source_id\` = ${action.sourceId}
          LIMIT 1;`,
      );
      if (insertedResult.rows.length !== 1) {
        throw new Error(
          `Failed to load inserted source_records row for (${action.sourceType}, ${action.sourceId}).`,
        );
      }

      const inserted = insertedResult.rows[0] as {
        created_at?: unknown;
        id?: unknown;
      };
      await recordBackfillProvenanceInTx(tx, {
        isBackfill: 1,
        sourceCreatedAt: String(inserted.created_at ?? ''),
        sourceId: action.sourceId,
        sourceRecordId: Number(inserted.id),
        sourceType: action.sourceType,
        targetCollection: action.targetCollection,
        targetCreatedAt: action.targetCreatedAt,
        targetId: action.targetId,
      });
      return;
    }

    if (action.kind === 'updateTimestamp') {
      await tx.run(
        sql`UPDATE \`source_records\`
          SET \`source_updated_at\` = ${action.sourceUpdatedAt},
              \`updated_at\` = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
          WHERE \`id\` = ${action.existingId};`,
      );
    }

    const existingResult = await tx.run(
      sql`SELECT \`created_at\`
        FROM \`source_records\`
        WHERE \`id\` = ${action.existingId}
        LIMIT 1;`,
    );
    const existingRow = existingResult.rows[0] as
      { created_at?: unknown } | undefined;
    await recordBackfillProvenanceInTx(tx, {
      isBackfill: 0,
      sourceCreatedAt: String(existingRow?.created_at ?? ''),
      sourceId: action.sourceId,
      sourceRecordId: action.existingId,
      sourceType: action.sourceType,
      targetCollection: action.targetCollection,
      targetCreatedAt: action.targetCreatedAt,
      targetId: action.targetId,
    });
  });
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Phase 1: Collect and validate all domain source mappings (including older
  // editorial revisions) before any writes or schema mutations.
  const verifiedByTarget = await loadVerifiedTrackedMappings(db);
  const plannedActions: PlannedSourceAction[] = [];
  const seenPlannedKeys = new Map<
    string,
    { targetCollection: string; targetId: string }
  >();

  await domainSourceTables.reduce(async (previous, entry) => {
    await previous;
    const candidates = await queryDomainRowsWithSourceMetadata(
      db,
      entry,
      verifiedByTarget,
    );

    await candidates.reduce(async (rowPromise, candidate) => {
      await rowPromise;
      const {
        sourceId,
        sourceType,
        sourceUpdatedAt,
        targetCreatedAt,
        targetId,
      } = candidate;

      const compositeKey = `${sourceType}\0${sourceId}`;
      const seenPlanned = seenPlannedKeys.get(compositeKey);
      if (
        seenPlanned &&
        (seenPlanned.targetCollection !== entry.collectionSlug ||
          seenPlanned.targetId !== targetId)
      ) {
        throw new Error(
          `Conflicting domain source metadata for (${sourceType}, ${sourceId}): ${seenPlanned.targetCollection}#${seenPlanned.targetId} vs ${entry.collectionSlug}#${targetId}.`,
        );
      }
      seenPlannedKeys.set(compositeKey, {
        targetCollection: entry.collectionSlug,
        targetId,
      });

      const existingResult = await db.run(
        sql`SELECT \`id\`, \`target_collection\`, \`target_id\`, \`source_updated_at\`
          FROM \`source_records\`
          WHERE \`source_type\` = ${sourceType} AND \`source_id\` = ${sourceId};`,
      );

      if (existingResult.rows.length > 0) {
        const existing = existingResult.rows[0] as {
          id?: unknown;
          source_updated_at?: unknown;
          target_collection?: unknown;
          target_id?: unknown;
        };
        if (
          existing.target_collection !== entry.collectionSlug ||
          String(existing.target_id ?? '') !== targetId
        ) {
          throw new Error(
            `Conflicting source_records mapping for (${sourceType}, ${sourceId}): existing target ${String(existing.target_collection)}#${String(existing.target_id)} vs ${entry.collectionSlug}#${targetId}.`,
          );
        }

        const existingUpdatedAt = normalizeOptionalString(
          existing.source_updated_at,
        );
        if (
          existingUpdatedAt !== null &&
          sourceUpdatedAt !== null &&
          existingUpdatedAt !== sourceUpdatedAt
        ) {
          throw new Error(
            `Conflicting source_updated_at for (${sourceType}, ${sourceId}) targeting ${entry.collectionSlug}#${targetId}: source_records has "${existingUpdatedAt}" while domain record has "${sourceUpdatedAt}". Reconcile the timestamp before re-running this migration.`,
          );
        }

        if (existingUpdatedAt === null && sourceUpdatedAt !== null) {
          plannedActions.push({
            existingId: Number(existing.id),
            kind: 'updateTimestamp',
            sourceId,
            sourceType,
            sourceUpdatedAt,
            targetCollection: entry.collectionSlug,
            targetCreatedAt,
            targetId,
          });
          return;
        }

        plannedActions.push({
          existingId: Number(existing.id),
          kind: 'keepExisting',
          sourceId,
          sourceType,
          sourceUpdatedAt: existingUpdatedAt ?? sourceUpdatedAt,
          targetCollection: entry.collectionSlug,
          targetCreatedAt,
          targetId,
        });
        return;
      }

      plannedActions.push({
        kind: 'insertNew',
        sourceId,
        sourceType,
        sourceUpdatedAt,
        targetCollection: entry.collectionSlug,
        targetCreatedAt,
        targetId,
      });
    }, Promise.resolve());
  }, Promise.resolve());

  // Phase 2: Switch source_records uniqueness to (source_type, source_id),
  // install lifetime and target-deletion triggers, and apply all planned writes.
  await db.run(sql`DROP INDEX IF EXISTS \`source_records_source_id_idx\`;`);
  await db.run(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS \`sourceType_sourceId_idx\` ON \`source_records\` (\`source_type\`,\`source_id\`);`,
  );
  await ensureBackfillTrackingSchema(db);
  await db.run(
    sql.raw(`
      CREATE TRIGGER IF NOT EXISTS \`${backfillDeleteTrigger}\`
      AFTER DELETE ON \`source_records\`
      BEGIN
        DELETE FROM \`${backfillTrackingTable}\`
        WHERE \`source_record_id\` = OLD.\`id\`;
      END;
    `),
  );

  await domainSourceTables.reduce(async (previous, entry) => {
    await previous;
    const triggerName = getTargetDeleteTriggerName(entry.tableName);
    await db.run(
      sql.raw(`
        CREATE TRIGGER IF NOT EXISTS \`${triggerName}\`
        AFTER DELETE ON \`${entry.tableName}\`
        BEGIN
          UPDATE \`${backfillTrackingTable}\`
          SET \`target_deleted\` = 1
          WHERE \`target_collection\` = '${entry.collectionSlug}'
            AND \`target_id\` = CAST(OLD.\`id\` AS TEXT);
        END;
      `),
    );
  }, Promise.resolve());

  await plannedActions.reduce(async (previous, action) => {
    await previous;
    await applyPlannedActionAtomically(db, action);
  }, Promise.resolve());

  // Phase 3: Verify every migrated mapping and its provenance before dropping columns.
  await plannedActions.reduce(async (previous, mapping) => {
    await previous;
    const verificationResult = await db.run(
      sql`SELECT \`id\`, \`target_collection\`, \`target_id\`, \`source_updated_at\`
        FROM \`source_records\`
        WHERE \`source_type\` = ${mapping.sourceType} AND \`source_id\` = ${mapping.sourceId};`,
    );

    if (verificationResult.rows.length !== 1) {
      throw new Error(
        `Source mapping verification failed for (${mapping.sourceType}, ${mapping.sourceId}).`,
      );
    }

    const verified = verificationResult.rows[0] as {
      id?: unknown;
      source_updated_at?: unknown;
      target_collection?: unknown;
      target_id?: unknown;
    };
    if (
      verified.target_collection !== mapping.targetCollection ||
      String(verified.target_id ?? '') !== mapping.targetId ||
      normalizeOptionalString(verified.source_updated_at) !==
        mapping.sourceUpdatedAt
    ) {
      throw new Error(
        `Source mapping verification mismatch for (${mapping.sourceType}, ${mapping.sourceId}).`,
      );
    }

    const provenanceResult = await db.run(
      sql`SELECT 1 AS \`present\`
        FROM ${sql.raw(`\`${backfillTrackingTable}\``)}
        WHERE \`source_record_id\` = ${Number(verified.id)}
          AND \`source_type\` = ${mapping.sourceType}
          AND \`source_id\` = ${mapping.sourceId}
          AND \`target_collection\` = ${mapping.targetCollection}
          AND \`target_id\` = ${mapping.targetId};`,
    );
    if (provenanceResult.rows.length !== 1) {
      throw new Error(
        `Backfill provenance verification failed for (${mapping.sourceType}, ${mapping.sourceId}).`,
      );
    }
  }, Promise.resolve());

  // Phase 4: Drop remaining legacy indexes and columns idempotently so an
  // interrupted upgrade can resume cleanly on retry.
  await domainSourceTables.reduce(async (previous, entry) => {
    await previous;
    const tableColumns = await getTableColumnNames(db, entry.tableName);
    await db.run(
      sql.raw(`DROP INDEX IF EXISTS \`${entry.tableName}_source_id_idx\`;`),
    );
    await dropColumnIfPresent(db, entry.tableName, tableColumns, 'source_id');
    await dropColumnIfPresent(db, entry.tableName, tableColumns, 'source_type');
    await dropColumnIfPresent(
      db,
      entry.tableName,
      tableColumns,
      'source_updated_at',
    );

    if (entry.versionTableName) {
      const versionColumns = await getTableColumnNames(
        db,
        entry.versionTableName,
      );
      await db.run(
        sql.raw(
          `DROP INDEX IF EXISTS \`${entry.versionTableName}_version_version_source_id_idx\`;`,
        ),
      );
      await dropColumnIfPresent(
        db,
        entry.versionTableName,
        versionColumns,
        'version_source_id',
      );
      await dropColumnIfPresent(
        db,
        entry.versionTableName,
        versionColumns,
        'version_source_type',
      );
      await dropColumnIfPresent(
        db,
        entry.versionTableName,
        versionColumns,
        'version_source_updated_at',
      );
    }
  }, Promise.resolve());
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  const tableBySlug = new Map(
    domainSourceTables.map((entry) => [entry.collectionSlug, entry]),
  );

  const hasTrackingTable = await tableExists(db, backfillTrackingTable);
  const trackingColumns = hasTrackingTable
    ? await getTableColumnNames(db, backfillTrackingTable)
    : new Set<string>();
  const hasExtendedTargetTracking =
    hasTrackingTable &&
    trackingColumns.has('source_record_id') &&
    trackingColumns.has('source_type') &&
    trackingColumns.has('source_id') &&
    trackingColumns.has('target_collection') &&
    trackingColumns.has('target_id') &&
    trackingColumns.has('source_created_at') &&
    trackingColumns.has('target_created_at') &&
    trackingColumns.has('target_deleted') &&
    trackingColumns.has('is_backfill');

  const trackedById = new Map<number, BackfillTrackingEntry>();

  if (hasExtendedTargetTracking) {
    const trackingResult = await db.run(
      sql.raw(
        `SELECT \`source_record_id\`, \`source_type\`, \`source_id\`, \`target_collection\`, \`target_id\`, \`source_created_at\`, \`target_created_at\`, \`target_deleted\`, \`is_backfill\` FROM \`${backfillTrackingTable}\`;`,
      ),
    );
    trackingResult.rows.forEach((row) => {
      const entry = row as {
        is_backfill?: unknown;
        source_created_at?: unknown;
        source_id?: unknown;
        source_record_id?: unknown;
        source_type?: unknown;
        target_collection?: unknown;
        target_created_at?: unknown;
        target_deleted?: unknown;
        target_id?: unknown;
      };
      const id = Number(entry.source_record_id);
      if (Number.isInteger(id)) {
        trackedById.set(id, {
          isBackfill:
            entry.is_backfill === undefined ? 1 : Number(entry.is_backfill),
          sourceCreatedAt: String(entry.source_created_at ?? ''),
          sourceId: String(entry.source_id ?? ''),
          sourceType: String(entry.source_type ?? ''),
          targetCollection: String(entry.target_collection ?? ''),
          targetCreatedAt: normalizeOptionalString(entry.target_created_at),
          targetDeleted:
            entry.target_deleted === undefined
              ? 0
              : Number(entry.target_deleted),
          targetId: String(entry.target_id ?? ''),
        });
      }
    });
  }

  const mappingRowsResult = await db.run(
    sql`SELECT \`id\`, \`source_id\`, \`source_type\`, \`source_updated_at\`, \`target_collection\`, \`target_id\`, \`import_run\`, \`created_at\`
      FROM \`source_records\`
      ORDER BY \`id\` ASC;`,
  );

  // Upfront dry-run: determine which mappings have verified original target
  // identity and which rows will remain in source_records before mutating anything.
  const remainingSourceIds = new Set<string>();
  const seenTargets = new Set<string>();
  const seenCollectionSourceIds = new Set<string>();
  const mappingsByCollection = new Map<string, PlannedRollbackMapping[]>();

  await mappingRowsResult.rows.reduce(async (previous, row) => {
    await previous;
    const record = row as {
      created_at?: unknown;
      id?: unknown;
      import_run?: unknown;
      source_id?: unknown;
      source_type?: unknown;
      source_updated_at?: unknown;
      target_collection?: unknown;
      target_id?: unknown;
    };
    const id = Number(record.id);
    const sourceId = String(record.source_id ?? '');
    const sourceType = String(record.source_type ?? '');
    const sourceUpdatedAt = normalizeOptionalString(record.source_updated_at);
    const targetCollection = String(record.target_collection ?? '');
    const targetId = String(record.target_id ?? '');
    const createdAt = String(record.created_at ?? '');
    const importRun = normalizeOptionalString(record.import_run);
    const targetEntry = tableBySlug.get(targetCollection);

    let shouldRestoreToDomain = false;
    let willBeRemovedFromSourceRecords = false;

    if (hasExtendedTargetTracking) {
      const tracked = trackedById.get(id);
      const hasLifetimeMatch = Boolean(
        tracked &&
        tracked.sourceType === sourceType &&
        tracked.sourceId === sourceId &&
        tracked.targetCollection === targetCollection &&
        tracked.targetId === targetId &&
        tracked.sourceCreatedAt === createdAt,
      );

      if (targetEntry && hasLifetimeMatch && tracked) {
        const targetColumns = await getTableColumnNames(
          db,
          targetEntry.tableName,
        );
        const hasCreatedAt = targetColumns.has('created_at');
        const targetRowResult = await db.run(
          sql.raw(
            hasCreatedAt
              ? `SELECT \`created_at\` FROM \`${targetEntry.tableName}\` WHERE CAST(\`id\` AS TEXT) = '${targetId.replace(/'/g, "''")}' LIMIT 1;`
              : `SELECT NULL AS \`created_at\` FROM \`${targetEntry.tableName}\` WHERE CAST(\`id\` AS TEXT) = '${targetId.replace(/'/g, "''")}' LIMIT 1;`,
          ),
        );

        let isOriginalTarget = false;
        if (targetRowResult.rows.length > 0) {
          const currentTargetCreatedAt = normalizeOptionalString(
            (targetRowResult.rows[0] as { created_at?: unknown }).created_at,
          );
          isOriginalTarget =
            tracked.targetDeleted === 0 &&
            (tracked.targetCreatedAt === null ||
              currentTargetCreatedAt === tracked.targetCreatedAt);
        }

        shouldRestoreToDomain = isOriginalTarget;
        willBeRemovedFromSourceRecords =
          isOriginalTarget && tracked.isBackfill === 1;
      }
    } else if (!hasTrackingTable) {
      // Legacy 08741ed compatibility path when no tracking table exists:
      // only restore and remove mappings carrying the legacy backfill tag.
      if (targetEntry && importRun === legacyBackfillImportRun) {
        const targetRowResult = await db.run(
          sql.raw(
            `SELECT 1 AS \`present\` FROM \`${targetEntry.tableName}\` WHERE CAST(\`id\` AS TEXT) = '${targetId.replace(/'/g, "''")}' LIMIT 1;`,
          ),
        );
        const targetExists = targetRowResult.rows.length > 0;
        shouldRestoreToDomain = targetExists;
        willBeRemovedFromSourceRecords = targetExists;
      }
    }
    // When hasTrackingTable && !hasExtendedTargetTracking (e.g. 068c0fa 1-column
    // or earlier incomplete tracking layouts), target/row lifetime cannot be verified,
    // so mappings remain in source_records without copying onto domain rows.

    if (targetEntry && shouldRestoreToDomain) {
      const targetKey = `${targetCollection}:${targetId}`;
      if (seenTargets.has(targetKey)) {
        throw new Error(
          `Cannot roll back multiple source_records rows mapped to ${targetKey}.`,
        );
      }
      seenTargets.add(targetKey);

      const collectionSourceIdKey = `${targetCollection}:${sourceId}`;
      if (seenCollectionSourceIds.has(collectionSourceIdKey)) {
        throw new Error(
          `Cannot roll back duplicate source_id "${sourceId}" within ${targetCollection}.`,
        );
      }
      seenCollectionSourceIds.add(collectionSourceIdKey);

      const list = mappingsByCollection.get(targetCollection) ?? [];
      list.push({
        id,
        shouldRestoreToDomain,
        sourceId,
        sourceType,
        sourceUpdatedAt,
        targetId,
        willBeRemovedFromSourceRecords,
      });
      mappingsByCollection.set(targetCollection, list);
    }

    if (!willBeRemovedFromSourceRecords) {
      if (remainingSourceIds.has(sourceId)) {
        throw new Error(
          `Cannot restore unique source_records.source_id index because colliding source_id "${sourceId}" will remain in source_records after rollback; restore from a pre-upgrade SQLite backup instead.`,
        );
      }
      remainingSourceIds.add(sourceId);
    }
  }, Promise.resolve());

  // Mutate schema, restore mappings, remove verified backfill rows, and rebuild indexes.
  await domainSourceTables.reduce(async (previous, entry) => {
    await previous;
    const tableColumns = await getTableColumnNames(db, entry.tableName);
    await addTextColumnIfMissing(
      db,
      entry.tableName,
      tableColumns,
      'source_id',
    );
    await addTextColumnIfMissing(
      db,
      entry.tableName,
      tableColumns,
      'source_type',
    );
    await addTextColumnIfMissing(
      db,
      entry.tableName,
      tableColumns,
      'source_updated_at',
    );

    if (entry.versionTableName) {
      const versionColumns = await getTableColumnNames(
        db,
        entry.versionTableName,
      );
      await addTextColumnIfMissing(
        db,
        entry.versionTableName,
        versionColumns,
        'version_source_id',
      );
      await addTextColumnIfMissing(
        db,
        entry.versionTableName,
        versionColumns,
        'version_source_type',
      );
      await addTextColumnIfMissing(
        db,
        entry.versionTableName,
        versionColumns,
        'version_source_updated_at',
      );
    }

    const mappings = mappingsByCollection.get(entry.collectionSlug) ?? [];
    await mappings.reduce(async (rowPromise, mapping) => {
      await rowPromise;
      if (!mapping.shouldRestoreToDomain) {
        return;
      }

      await db.run(
        sql`UPDATE ${sql.raw(`\`${entry.tableName}\``)}
          SET \`source_id\` = ${mapping.sourceId},
              \`source_type\` = ${mapping.sourceType},
              \`source_updated_at\` = ${mapping.sourceUpdatedAt}
          WHERE CAST(\`id\` AS TEXT) = ${mapping.targetId};`,
      );

      if (entry.versionTableName) {
        await db.run(
          sql`UPDATE ${sql.raw(`\`${entry.versionTableName}\``)}
            SET \`version_source_id\` = ${mapping.sourceId},
                \`version_source_type\` = ${mapping.sourceType},
                \`version_source_updated_at\` = ${mapping.sourceUpdatedAt}
            WHERE CAST(\`parent_id\` AS TEXT) = ${mapping.targetId};`,
        );
      }

      if (mapping.willBeRemovedFromSourceRecords) {
        const restoredRowResult = await db.run(
          sql`SELECT \`source_id\`, \`source_type\`, \`source_updated_at\`
            FROM ${sql.raw(`\`${entry.tableName}\``)}
            WHERE CAST(\`id\` AS TEXT) = ${mapping.targetId};`,
        );
        if (restoredRowResult.rows.length !== 1) {
          throw new Error(
            `Source metadata rollback verification failed: ${entry.tableName}#${mapping.targetId} missing.`,
          );
        }

        const restored = restoredRowResult.rows[0] as {
          source_id?: unknown;
          source_type?: unknown;
          source_updated_at?: unknown;
        };
        if (
          restored.source_id !== mapping.sourceId ||
          restored.source_type !== mapping.sourceType ||
          normalizeOptionalString(restored.source_updated_at) !==
            mapping.sourceUpdatedAt
        ) {
          throw new Error(
            `Source metadata rollback verification failed for ${entry.tableName}#${mapping.targetId}.`,
          );
        }

        await db.run(
          sql`DELETE FROM \`source_records\` WHERE \`id\` = ${mapping.id};`,
        );
      }
    }, Promise.resolve());

    await db.run(
      sql.raw(
        `CREATE UNIQUE INDEX IF NOT EXISTS \`${entry.tableName}_source_id_idx\` ON \`${entry.tableName}\` (\`source_id\`);`,
      ),
    );
    if (entry.versionTableName) {
      await db.run(
        sql.raw(
          `CREATE INDEX IF NOT EXISTS \`${entry.versionTableName}_version_version_source_id_idx\` ON \`${entry.versionTableName}\` (\`version_source_id\`);`,
        ),
      );
    }
  }, Promise.resolve());

  await db.run(sql`DROP INDEX IF EXISTS \`sourceType_sourceId_idx\`;`);
  await db.run(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS \`source_records_source_id_idx\` ON \`source_records\` (\`source_id\`);`,
  );

  await domainSourceTables.reduce(async (previous, entry) => {
    await previous;
    await db.run(
      sql.raw(
        `DROP TRIGGER IF EXISTS \`${getTargetDeleteTriggerName(entry.tableName)}\`;`,
      ),
    );
  }, Promise.resolve());
  await db.run(sql.raw(`DROP TRIGGER IF EXISTS \`${backfillDeleteTrigger}\`;`));
  await db.run(sql.raw(`DROP TABLE IF EXISTS \`${backfillTrackingTable}\`;`));
  await db.run(sql.raw(`DROP TABLE IF EXISTS \`${indexStateTable}\`;`));
}
