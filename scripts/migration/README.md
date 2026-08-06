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

Keep the generated report and source exports outside Git. The inventory
parser is intentionally limited to metadata; it is not a Drupal importer.
The repeatable importer foundation validates private artifact manifests, reads
normalized JSON/JSONL records, and produces dry-run/reconciliation reports:

```bash
python3 scripts/migration/importer.py \\
  --config /private/migration/import-config.json \\
  --dry-run
```

See [Migration configuration and security contract](configuration.md) for the
private configuration schema and apply procedure. Run its standard-library
tests with:

```bash
python3 scripts/migration/test_inventory.py -v
```
