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
## Finance and RSVP importer

`finance_rsvp_importer.py` reconciles normalized `finance`, `rsvp-events`, and
`rsvp-responses` exports. It supports JSON and JSONL inputs, validates optional
SHA-256 checksums, retains stable Drupal booking/invitation identifiers, and
reports unresolved user, team-event, and RSVP-event references. Imports are
repeatable upserts and never delete records missing from a later export.

RSVP response states are `yes`, `no`, `maybe`, and `none`; guest counts must be
non-negative integers. Raw invitation tokens and other sensitive values are
rejected. Only a token hash and revocation metadata may be supplied by a later
Payload adapter.

```bash
python3 scripts/migration/finance_rsvp_importer.py \
  --manifest /private/migration/finance-rsvp-manifest.json \
  --state /private/migration/finance-rsvp-state.json \
  --dry-run
```

The manifest uses the same `collections` shape as the other migration tools;
each entry has `name`, `path`, and an optional `sha256`. Keep source exports,
state, and reconciliation reports outside Git.

Run its standard-library tests with:

```bash
python3 scripts/migration/test_inventory.py -v
python3 scripts/migration/test_finance_rsvp_importer.py -v
```
