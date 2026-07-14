# Repeatable import runbook

## Principles

- Drupal is authoritative until cutover.
- Every import is safe to rerun.
- Use stable source IDs and source timestamps.
- Upsert creates and updates; it does not silently delete.
- Produce an audit report for every run.
- Keep source and target databases private.

## Import phases

1. Validate source dump/archive and record the export timestamp.
2. Import reference data: users, players, teams, venues, leagues, and seasons.
3. Import media referenced by migrated content.
4. Import matches and generic team events.
5. Import news, reports, previews, photos, sponsors, and finance.
6. Import RSVP events and responses after match/event mappings exist.
7. Resolve redirects and URL aliases.
8. Generate a reconciliation report.

## Required behavior

- `--dry-run` reports creates, updates, unchanged records, skipped records, and unresolved references.
- Incremental mode selects changed Drupal records after a stored watermark.
- Stable mappings are retained for Drupal nid, uid, fid, rid, and invitation identifiers.
- Media is deduplicated by source path and checksum.
- Unresolved references are reported and retained for later repair.
- Each run records source timestamp, target environment, counts, warnings, and errors.
- A final import can optionally mark records missing from Drupal as archived after review.

## Cutover

1. Continue importing while Drupal remains active.
2. Announce a short content freeze.
3. Take a final SQL/files export.
4. Run the final delta import.
5. Run relationship, URL, permission, media, and frontend checks.
6. Switch traffic and retain Drupal read-only for rollback.
