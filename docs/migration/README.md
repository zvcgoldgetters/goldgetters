# Goldgetters Drupal to Payload migration

This directory is the durable record of the Drupal 7 to Payload migration. GitHub issues track execution; these documents capture the decisions, mappings, exclusions, and operating procedures.

## Current scope

- Drupal 7 remains the source of truth until launch.
- Payload imports must be repeatable because the Drupal site is still active.
- Payload is the eventual source of truth after cutover.
- The new public frontend uses the current Goldgetters design, not the Drupal theme.
- Media will be stored on S3.
- RSVP supports matches, training sessions, and tournaments.
- Klassement, forum, comments, league-wide imported matches, and advanced prediction features are deferred.

## Source material

- Drupal SQL export: private migration input, filename `mysql.sql.gz`
- Drupal files archive: private migration input, filename `goldgetters-files.tar.gz`
- Drupal function library: private source repository `goldgetters-drupal-function-library`
- Drupal RSVP module: private source repository `goldgetters-drupal-rsvp`
- Legacy website: https://goldgetters.be/

Local paths and credentials are intentionally excluded from this documentation.

## Milestones

1. Source inventory
2. Payload domain model
3. Repeatable importer
4. Infrastructure and media
5. Public frontend
6. URLs and SEO
7. Validation and cutover

See the linked documents in this directory for the detailed backlog and decisions.

- [Source inventory snapshot](source-inventory.md)
- [Migration decisions](decisions.md)
- [RSVP design](rsvp.md)
- [URLs and Views](urls-and-views.md)
- [Repeatable import runbook](import-runbook.md)
- [Backup, rollback, and recovery plan](backup-and-rollback.md)
- [Roadmap and task backlog](roadmap.md)
