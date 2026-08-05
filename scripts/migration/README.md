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

Run it from the repository root:

```bash
python3 scripts/migration/inventory.py \
  --sql /path/to/mysql.sql.gz \
  --files /path/to/goldgetters-files.tar.gz \
  --output /private/path/goldgetters-source-inventory.json
```

Keep the generated report and source exports outside Git. The parser is
intentionally limited to inventory metadata; it is not a Drupal importer.
Run its standard-library tests with:

```bash
python3 scripts/migration/test_inventory.py -v
```
