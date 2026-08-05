# Legacy URLs and Drupal Views

## URL sources in the SQL dump

There is no single exhaustive URL table. The dump contains:

- `url_alias`: 10 explicit aliases in this export
- `node`: canonical `node/{nid}` URLs
- `menu_links`: 617 navigation links
- `menu_router`: 702 registered Drupal routes, including admin/system routes
- `redirect`: 9 configured redirects
- `views_display`: View page paths, block displays, feeds, and calendar displays

Dynamic routes from custom PHP, RSVP, Views contextual arguments, query strings, and module callbacks must be recovered from code and a live-site crawl.

## Views inventory

The dump contains 83 Views and 181 displays. Important examples include news, teams, players, matches, photo albums, statistics, RSVP invitations, venues, seasons, and administration pages.

Views configurations are serialized in `views_display.display_options`. They contain useful functional specifications:

- filters and exposed filters
- fields and field formatting
- relationships
- sorting and pagination
- access rules
- page paths and menu entries
- block descriptions and display placement
- custom PHP filters or output

The migration inventory script records every View and display identity plus
the serialized option keys present, without copying option values into the
report. This gives the migration team a complete classification index while
keeping source content, paths, and other export values out of generated
artifacts. A follow-up decoder can use the private export to classify each
display into page, block, feed, calendar, member, or administration scope.

We will not recreate a generic Views engine. Each useful public View becomes a purpose-built Payload query and frontend component. Obsolete, admin-only, or redundant Views are excluded.

## URL manifest

The repeatable generator in `scripts/migration/url_manifest.py` combines the
private SQL export with an optional sanitized live-crawl JSON. It writes a
deterministic manifest and never writes SQL row values, credentials, tokens, or
crawl response bodies. Keep the generated file outside Git with the private
exports.

Create a generated `legacy-url-manifest.json` containing, for every discovered URL:

- legacy path and query parameters
- source: node, alias, View, menu, redirect, module, or crawl
- target Drupal ID where applicable
- expected status and access level
- replacement Payload route
- redirect requirement
- migration status

Build the manifest from SQL, Drupal source code, the live-site crawl, and web-server logs if available. Use it for redirect generation and route coverage tests.
