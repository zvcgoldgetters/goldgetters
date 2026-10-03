# Migration inventory tool

`inventory.py` reads the private Drupal SQL and files exports and writes a
non-sensitive JSON report containing:

- SHA-256 and byte size for each export;
- relevant Drupal table schemas and row counts;
- field definitions, bundle instances, and a joined content-type/field mapping;
- foreign-key-like reference candidates grouped by target;
- archive file counts, byte totals, categories, and extensions.

It does not write SQL values, credentials, password hashes, invitation tokens,
file paths, or archive contents to the report.

Generate the legacy URL manifest from the private SQL export and an optional
sanitized live crawl. The manifest is deterministic and contains paths,
provenance, expected status/access metadata, redirect flags, and migration
status; keep it outside Git with the source exports:

```bash
python3 scripts/migration/url_manifest.py \\
  --sql /path/to/mysql.sql.gz \\
  --crawl /path/to/crawl.json \\
  --output /private/path/legacy-url-manifest.json
```

The crawl JSON may be a list of objects or `{\"urls\": [...]}`. Each object
uses `path` (or `url`), optional `status`, `access_level`, and
`query_parameters` fields.

Run it from the repository root:

```bash
python3 scripts/migration/inventory.py \
  --sql /path/to/mysql.sql.gz \
  --files /path/to/goldgetters-files.tar.gz \
  --output /private/path/goldgetters-source-inventory.json
```

Keep the generated report and source exports outside Git. The parser is intentionally limited to inventory metadata; it is not a Drupal importer.

## Incremental importer

`importer.py` accepts a sanitized record export with this shape:

```json
{
  "records": [
    {
      "source_id": "node:42",
      "changed_at": "2026-01-01T00:00:00Z",
      "entity": "news",
      "data": {},
      "references": []
    }
  ]
}
```

It stores the watermark, stable source mappings, and import-run audit rows in a
SQLite state database. Each record is isolated and retried independently; a
failed record is reported without losing successful records. Reruns are safe,
and `--incremental` selects records newer than the last successful watermark.
The JSON target adapter is deliberately small so a Payload adapter can be
introduced without changing the state and reporting contract:

```bash
python3 scripts/migration/importer.py \\
  --source /private/path/records.json \\
  --state /private/path/import-state.sqlite \\
  --target /private/path/target.json \\
  --output /private/path/import-report.json \\
  --incremental
```

Use `--dry-run` for a non-writing plan. Missing source IDs are reported in the
run report and are not deleted or archived automatically; any archival action
requires a reviewed follow-up.

Run the standard-library tests with:

```bash
python3 scripts/migration/test_inventory.py -v
python3 scripts/migration/test_importer.py -v
```
