# Migration decisions

## Content and ownership

- Drupal remains authoritative during the migration period.
- Imports are incremental and upsert existing records using stable Drupal identifiers.
- Do not physically delete Payload records when a Drupal record disappears; report missing records for review.
- Retain Drupal IDs, UUIDs where available, source paths, and source timestamps.
- Preserve old URLs through aliases and redirects where useful.

## Content types

| Drupal type      | Payload direction                                                           |
| ---------------- | --------------------------------------------------------------------------- |
| article          | News/articles                                                               |
| ploeg            | Teams, including historical opponents                                       |
| zaal             | Venues                                                                      |
| wedstrijd        | Own matches                                                                 |
| wedstrijdverslag | Match reports                                                               |
| voorbeschouwing  | Match previews                                                              |
| fotoalbum        | Photo albums                                                                |
| liga             | Leagues                                                                     |
| seizoen          | Seasons                                                                     |
| boeking          | Private finance transactions                                                |
| sponsor          | Sponsors                                                                    |
| blikvanger       | Import referenced images into Media; no separate collection                 |
| page             | Do not migrate as editorial content; rebuild useful custom pages explicitly |
| forum            | Exclude for now                                                             |
| klassement       | Exclude for now                                                             |
| poll             | Exclude unless useful records are found                                     |

## Exclusions

- Drupal forum content
- All 28 Drupal comments
- Klassement records and prediction/rating/chart features
- `ndmt_wedstrijd` league-wide imported matches
- Drupal revision history; each node has one revision in the dump
- Facebook, Twitter, and OAuth integrations and credentials
- Drupal Metatag tables; generate metadata from Payload fields
- Generated Drupal image styles, caches, and other derived files

## Players and users

- Users and players are separate concepts in Payload.
- Migrate active editorial/admin users as Payload auth users; use password resets rather than importing password hashes.
- Preserve inactive players because match events, goals, assists, cards, and RSVP history may reference them.
- Player `reserve` is a current status, not season history.
- The public team page displays separate core and reserve lists and only active players.
- The SQL identifies seven core players: Bjorn, Jeroen, Nick, Ken, Nils, Dieter, and Robin.
- Reserve players can be added to individual RSVP events.

## Teams

- Migrate all teams, including historical opponents.
- Store the current Goldgetters team in a `club-settings` Global rather than an `isGoldgetters` field.
- Store current season, current league, club contact details, and current team relationship in that Global.

## Finance

- Migrate the complete booking history, starting from zero.
- Keep finance data private and admin-only.
- Preserve fixed categories: Lidgeld, Inschrijving, Licentie, Website, Zaalhuur, Sponsoring, Scheidsrechter, Kledij, Divers, Boete, Cadeau.
- Preserve Inkomst/Uitgave and derive a signed amount for reporting.
- Calculate balances and reports from transactions; do not migrate static charts.

## Rich text and media

- Convert article, report, and preview HTML to Lexical.
- Keep original Drupal HTML as a hidden migration backup where practical.
- Deduplicate media by Drupal file ID/path/checksum.
- Store public images and albums on S3 with public delivery; keep private files private.

## Permissions

Preserve the intent of the Drupal roles, including administrator, afgevaardigde, artikelschrijver, fotograaf, organisator, penningmeester, speler, supporter, and verslaggever. Payload roles may be combined. Finance access is restricted to penningmeester and administrators; user/site configuration remains administrator-only.
