# RSVP, custom PHP, and dynamic route inventory

This document records the migration-relevant behavior that must be preserved from
Drupal. It separates behavior verified by the source inventory from behavior that
still requires inspection of the private Drupal module and function-library
repositories. Private exports, credentials, email addresses, and invitation
tokens are intentionally excluded.

## Verified RSVP behavior

The SQL/source inventory identifies the following Drupal RSVP data and behavior:

| Area                   | Verified behavior                                                                             | Payload migration implication                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Event configuration    | RSVP events are stored in `rsvp` and relate to matches, training sessions, or tournaments.    | Import the event relationship, response window, moderator, visibility, invitation state, and stable Drupal IDs.     |
| Invitees and responses | `rsvp_invite` stores one invitation/response per invitee and event.                           | Preserve the invitee relationship, response state, comment, guest count, invitation/received flags, and timestamps. |
| Anonymous invitees     | `rsvp_realname` provides anonymous-name mappings.                                             | Keep the mapping scoped to the relevant invitation; do not publish source identifiers or personal data.             |
| Response states        | The legacy flow supports yes, no, maybe, and no response.                                     | Keep all four states distinct, including unanswered invitations.                                                    |
| Access                 | Email invitations use secure links; visibility rules and moderators are part of the workflow. | Use revocable, cryptographically random, response-scoped tokens and explicit organizer/member access checks.        |
| Notifications          | Invitation, response, moderator, and cancellation emails are supported.                       | Preserve notification intent and delivery state; implementation belongs in the Payload mail workflow.               |
| Reminders              | The legacy cron integration did not provide scheduled deadline reminders.                     | Treat reminders as a new, organizer-controlled feature rather than imported history.                                |

The inventory estimates approximately 558 RSVP events and 13,826 invitation or
response rows. These counts must be regenerated during the first importer dry
run against the final export.

## Custom PHP and module behavior

The following behavior is in scope for replacement, but its exact callback names,
permission checks, and templates must be verified from the private Drupal source
repositories before implementation:

| Behavior to verify                                              | Replacement boundary                                                                       | Acceptance evidence                                                                                    |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| RSVP event creation and invite-list generation                  | Payload RSVP event and response collections plus organizer actions                         | A sanitized fixture demonstrates event, core-player, reserve-player, and external-guest relationships. |
| Invitation review, send, resend, cancellation, and rescheduling | Server-side actions with role checks and mail delivery logging                             | Tests prove authorized organizers can act and unauthorized users cannot.                               |
| Secure anonymous response links and token revocation            | Dedicated response route using a single response-scoped token                              | Tests prove token scope, expiry/revocation, replay handling, and no cross-invite access.               |
| Member invitation list and response updates                     | Authenticated member route and server mutations                                            | Tests cover state changes, private comments, guest counts, and deadline enforcement.                   |
| Organizer grouping and capacity display                         | Private organizer dashboard                                                                | Tests cover yes/maybe/no/unanswered groups, guest totals, and visibility rules.                        |
| Post-event attendance confirmation, if required                 | Separate organizer-only attendance field or appearance record                              | RSVP intent remains unchanged after attendance is recorded.                                            |
| Custom PHP pages and callbacks outside RSVP                     | Purpose-built Payload queries and frontend routes only where migration scope requires them | Each selected route has a documented source path, authorization rule, and replacement route.           |

Do not recreate a generic Drupal Views or callback engine. Implement selected
public behavior as purpose-built Payload queries and components, and keep
organizer and response workflows behind explicit access checks.

## Dynamic-route inventory

The current source inventory reports 702 registered Drupal routes and 181 View
displays. The route classes below are the migration-relevant categories to
extract from the private source/export during importer preparation:

| Route class         | Examples of behavior to inspect                                               | Migration disposition                                                                            |
| ------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| RSVP response       | Tokenized anonymous response, authenticated member response, response updates | Preserve as secure dedicated Payload routes; never expose private response data in public pages. |
| RSVP administration | Invite-list review, send/resend, cancellation, rescheduling, reminders        | Replace with Payload admin and/or a private organizer dashboard.                                 |
| Event detail        | Match, training, and tournament details linked to RSVP configuration          | Replace with canonical Payload event routes and stable aliases.                                  |
| Dynamic listing     | Calendar, member, match, and feed displays backed by Views                    | Implement only selected public listings as purpose-built queries.                                |
| Contextual routes   | Query-string, contextual-filter, pagination, and legacy alias routes          | Capture parameters and redirect/canonicalization rules in the URL manifest.                      |
| Module callbacks    | Notification, access, form-submit, and cron callbacks                         | Replace with server actions/jobs and document the authorization and side effects.                |

### Extraction checklist

Before implementation or cutover, the source inspection must record for every
in-scope route or callback:

- Drupal path, route/menu source, and owning module or function file
- parameters and contextual filters, including query-string behavior
- access callback and the equivalent Payload role/access rule
- read/write side effects and any notification or cron behavior
- replacement Payload collection, endpoint, page, or scheduled job
- redirect/alias requirement and whether the route is intentionally excluded
- unresolved source references and the fixture or manual test needed to verify it

No private source paths, credentials, invitation tokens, or personal data belong
in this public repository. Until the private repositories are available to the
migration worker, the items marked "to verify" remain blockers for a complete
behavioral parity claim rather than assumptions to fill in from memory.

## Exclusions and unresolved references

- Drupal forum, comments, klassement, prediction/rating/chart features, and
  league-wide imported matches remain excluded per the migration decisions.
- Generated image styles, caches, and other derived files are not RSVP route
  inputs and remain excluded from migration.
- Exact custom PHP callback names, source permissions, and legacy route aliases
  remain unresolved until the private Drupal repositories are inspected.
- Import counts and orphan references must come from a sanitized fixture or the
  first dry run, not from hardcoded production data.
