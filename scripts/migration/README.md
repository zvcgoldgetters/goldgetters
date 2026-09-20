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

Keep the generated report and source exports outside Git. The parser is
intentionally limited to inventory metadata; it is not a Drupal importer.

## Content and match importer

`content_importer.py` reconciles normalized JSON or JSONL collections for news,
reports, previews, photo albums, sponsors, matches, team events, and match
events. It validates optional SHA-256 checksums, requires stable `source_id`
values, resolves cross-collection references, and reports unresolved
relationships without silently dropping records. The target-neutral state store
is an auditable checkpoint for the future Payload adapter:

```bash
python3 scripts/migration/content_importer.py \\
  --manifest /private/migration/content-manifest.json \\
  --state /private/migration/content-state.json \\
  --dry-run
```

A manifest contains a `collections` array with `name`, `path`, and optional
`sha256` fields. Each record contains `source_id`, a `data` object, and optional
`references` entries with `collection` and `source_id`. Omit `--dry-run` only
after reviewing the reconciliation report. Imports upsert records and never
delete records absent from a later export.

Run the standard-library tests with:

```bash
python3 scripts/migration/test_inventory.py -v
python3 scripts/migration/test_content_importer.py -v
```
