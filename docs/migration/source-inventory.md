# Drupal source inventory snapshot

This is a snapshot of the inspected Drupal export. Counts should be rechecked against the final export used for production migration.

## Verified source facts

- Drupal 7 site, Dutch content, base path historically under `/drupal/`.
- The source inventory run against the current export found 3,861 nodes, 37 users, 450 managed files, 557 comments, 17 active/custom node types, 104 field definitions, and 156 field instances.
- The source inventory run found 10 URL aliases, 9 redirects, 617 menu links, 702 registered routes, and 181 View displays.
- The export contains approximately 584 booking records, 586 own `wedstrijd` records, 597 deferred `ndmt_wedstrijd` records, 5,798 `wedstrijdverloop` events, 558 RSVP events, and 13,826 RSVP invitation/response records.
- The media archive contains 2,630 files, including generated styles and cache assets; migrate only referenced managed files and ignore generated derivatives.

## Media inventory

Run the inventory command with the private Drupal SQL dump and files archive:

```bash
python3 scripts/migration/inventory.py \
  --sql /path/to/drupal.sql.gz \
  --files /path/to/files.tar.gz \
  --output /tmp/goldgetters-inventory.json
```

The `files_export.managed_files` records map each Drupal `file_managed.fid` and
URI to the matching archive path, classify generated/cache members, and list
referencing entity/table/field records. The report also includes
`missing_archive_files` for managed files absent from the archive and
`dangling_file_references` for field references without a `file_managed` row.
The report is intended for local reconciliation and must not be committed when
it contains paths from a private export.

## Player roster facts

The current core/reserve distinction is stored on Drupal users in `field_data_field_gebruiker_reserve`, not in a season model. The seven core players identified in the export are Bjorn, Jeroen, Nick, Ken, Nils, Dieter, and Robin. Reserve players remain separate records and can be added to individual events.

## Match-event semantics

The legacy statistics implementation is in the Drupal function library, especially `function_library_stats.inc`. The `wedstrijdverloop` fields represent:

- `speler1`: scorer or card recipient
- `speler2`: assist for goals
- `-1`: unknown or no player
- `-2`: own goal by Goldgetters
- `-3`: own goal by the opponent
- empty event type: treated as a goal
- event types: goal, yellow card, red card

Statistics are calculated dynamically by season and match type, rather than stored as immutable totals. The ratings/klassement import behavior is in `function_library_ratings.inc` and is deferred.

## RSVP source behavior

The legacy RSVP module stores event configuration in `rsvp`, individual invitations/responses in `rsvp_invite`, and anonymous-name mappings in `rsvp_realname`. It supports secure email links, yes/no/maybe/none responses, comments, guest counts, response windows, moderators, visibility rules, and invitation/notification/cancellation emails. It does not implement scheduled reminders; reminders are a new Payload feature.

## Verification notes

- Counts above are inventory estimates from the supplied export and should be generated automatically in the first importer dry run.
- The SQL export and media archive are private migration inputs and must not be committed.
- Source paths, credentials, hashes, email addresses, and invitation tokens must not be copied into public documentation or GitHub issues.
