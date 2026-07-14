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

We will not recreate a generic Views engine. Each useful public View becomes a purpose-built Payload query and frontend component. Obsolete, admin-only, or redundant Views are excluded.

## URL manifest

Create a generated `legacy-url-manifest.json` containing, for every discovered URL:

- legacy path and query parameters
- source: node, alias, View, menu, redirect, module, or crawl
- target Drupal ID where applicable
- expected status and access level
- replacement Payload route
- redirect requirement
- migration status

Build the manifest from SQL, Drupal source code, the live-site crawl, and web-server logs if available. Use it for redirect generation and route coverage tests.
