# Migration configuration and security contract

The importer accepts a private JSON configuration file. Keep it outside the
repository because it contains local source paths and may identify private
migration workspaces. It must not contain credentials, password hashes,
invitation tokens, or source record values.

```json
{
  "schema_version": 1,
  "environment": "staging",
  "manifest_id": "sha256:reviewed-export-manifest-id",
  "artifacts": [
    {
      "name": "normalized-users",
      "path": "/private/migration/users.json",
      "size": 1234,
      "sha256": "<64 hexadecimal characters>"
    }
  ],
  "collections": [{ "name": "users", "path": "/private/migration/users.json" }],
  "state_path": "/private/migration/state.json",
  "report_path": "/private/migration/reports/latest.json"
}
```

`environment` is one of `local`, `development`, `staging`, or `production`.
Every artifact is checked for existence, byte size, and SHA-256 before records
are read. A record must have a stable `source_id`, an optional
`updated_at`, and a `data` object. Input may be a JSON array or newline-
delimited JSON objects.

## Running an import

From the repository root:

```bash
python3 scripts/migration/importer.py \
  --config /private/migration/import-config.json \
  --dry-run
```

A dry run never writes the state store. It reports creates, updates, unchanged
and skipped records, unresolved references, warnings, a run ID, and the
manifest ID. To apply the normalized records to the local reconciliation state
store, omit `--dry-run` after reviewing the report:

```bash
python3 scripts/migration/importer.py \
  --config /private/migration/import-config.json
```

The state store is an implementation-neutral checkpoint for the future Payload
adapter. Imports are upserts and never delete records that are absent from the
source. Production writes require a reviewed dry run and the backup/rollback
approval described in `import-runbook.md`.
