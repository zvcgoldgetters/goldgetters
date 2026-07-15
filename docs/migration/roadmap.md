# Migration roadmap and task backlog

## M0 - Project setup and migration contract

- Create GitHub milestones, labels, and issues from this backlog.
- Keep migration decisions and generated inventories in `docs/migration/`.
- Define the source export format, export timestamp, target environment, and importer configuration format.
- Define the policy for sensitive data, local files, secrets, and generated artifacts.
- Define rollback, backup, and recovery ownership before production work begins. See [Backup, rollback, and recovery plan](backup-and-rollback.md).

## M1 - Source inventory

- Validate the SQL/files exports and record checksums and export timestamps.
- Extract relevant Drupal tables and field definitions.
- Create content-type and field mapping.
- Decode Views and classify page, block, feed, calendar, member, and admin displays.
- Inventory block placement, menus, permissions, custom PHP, and module callbacks.
- Build URL and redirect manifest.
- Inventory media and referenced files.
- Inventory RSVP, custom PHP, and dynamic routes.
- Identify all foreign-key-like references and expected orphan records.
- Document exclusions, assumptions, and unresolved references.

## M2 - Payload domain model

- Create collections for users, players, teams, venues, leagues, seasons, matches, generic team events, reports, previews, news, albums, media, bookings, RSVP events, and RSVP responses.
- Create `club-settings` Global.
- Add source ID fields and import metadata.
- Model match event records for goals, assists, yellow cards, and red cards.
- Model current player roster status and player/user separation.
- Add roles, access control, drafts, relationships, validation, and migrations.
- Model legacy aliases and redirects where they belong in Payload.
- Generate and verify Payload types.

## M3 - Repeatable importer

- Add importer command and configuration.
- Add dry-run and reconciliation reports.
- Add source-to-target mapping tables and import run records.
- Import reference entities.
- Import content entities.
- Import match events and verify goal, assist, card, appearance, and statistics relationships.
- Import finance.
- Import RSVP history.
- Add incremental watermark handling.
- Add retry, resumability, rate limiting, and failure isolation.
- Add importer unit/integration tests using a sanitized fixture export.

## M4 - Infrastructure and media

- Configure S3 through environment variables.
- Upload and deduplicate referenced media.
- Configure image sizes and public/private access.
- Configure SMTP through environment variables.
- Add environment validation and backups.
- Configure email templates, delivery logging, and failed-delivery handling.
- Configure deployment, database migrations, scheduled jobs, and monitoring.

## M5 - Public frontend

- Connect news route.
- Build team page with core/reserve player lists.
- Build matches and match detail pages.
- Build RSVP response flow.
- Build authenticated member area for invitations and response history.
- Build secure unauthenticated RSVP invitation-link flow.
- Build organizer RSVP dashboard grouped by yes, maybe, no, and unanswered.
- Build organizer workflows for invite review, sending, resending, adding reserves, and removing invitees.
- Build cancellation, rescheduling, response deadlines, and optional reminders.
- Decide and implement separate post-game actual-attendance confirmation if required for official appearances.
- Build photo albums.
- Build statistics from Payload data.
- Build private finance/admin workflows where required.
- Rebuild only selected useful custom pages.

## M6 - URLs and SEO

- Generate legacy URL manifest.
- Implement canonical slugs and aliases.
- Add redirects from important Drupal paths.
- Add dynamic metadata.
- Add route coverage and broken-link checks.
- Validate query-string routes, contextual View routes, RSVP token routes, feeds, and pagination URLs.
- Generate sitemap and robots configuration for the new site.

## M7 - Validation and cutover

- Compare record counts and relationships.
- Validate media and URLs.
- Test roles and private data.
- Test RSVP tokens, notifications, reminders, cancellation, and rescheduling.
- Test importer reruns, incremental imports, retries, and failure recovery.
- Run focused and full automated tests, including route and accessibility checks.
- Perform delta and final imports.
- Reconcile post-freeze changes and manually review unresolved records.
- Switch traffic and keep Drupal read-only for rollback.
- Monitor errors, email delivery, redirects, and data integrity after launch.
