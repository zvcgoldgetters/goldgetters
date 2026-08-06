# Payload roles and access policy

The migration maps Drupal capabilities to a small, explicit Payload role vocabulary. A user has one primary role; administrator access is the only role that can manage users or global configuration.

| Payload role    | Intended capability                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `administrator` | Full Payload administration, user/role management, configuration, and all domain workflows                             |
| `editor`        | Manage public editorial content and media; no finance, user administration, or private RSVP management by default      |
| `finance`       | Read and manage private finance records; no editorial or user administration by default                                |
| `organizer`     | Manage team events, RSVP invitations, responses, and organizer workflows; no finance or user administration by default |
| `member`        | Authenticated player/member access to the member area and records explicitly scoped to that member                     |

## Implementation contract

- `payload/access/roles.ts` is the shared source for role values and access predicates.
- Access checks must use explicit predicates (`isAdministrator`, `isEditorial`, `isFinance`, `isOrganizer`, or `isMember`) on each collection or endpoint.
- Authentication alone is not sufficient for organizer, finance, editorial, or administrative operations.
- Member-facing records must additionally scope reads and writes to the authenticated member or invitation token; the `member` role does not grant access to every member's private data.
- New collections should default to authenticated access only when their data is private. Public content must explicitly opt into public read access.
- Invitation-token endpoints must remain separately scoped and revocable as described in [RSVP design](rsvp.md).

This policy intentionally avoids recreating Drupal's permission matrix verbatim. Capabilities are grouped by the workflows that will be implemented in Payload, and collection-level checks remain the enforcement point for each private resource.
