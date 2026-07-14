# RSVP migration and replacement

## Legacy findings

The Drupal RSVP module is a complete attendance workflow, not merely a yes/no field. The dump contains approximately 558 RSVP events and 13,826 invitation/response rows.

Supported legacy states and behavior:

- yes, no, maybe, and no response
- comments
- total guests brought by an attendee
- secure email invitation links
- invitation and received flags
- response deadlines
- moderators
- guest-list visibility rules
- invitation, response, moderator, and cancellation emails

The legacy module did not implement scheduled reminders. Its cron integration mainly associated email invitations with accounts created later.

## Payload model

### RSVP events

An RSVP event is related to a generic team event: match, training, or tournament. It stores:

- event relationship
- organizer/moderator
- response start and end dates
- whether maybe is allowed
- optional maximum attendee count
- guest-list visibility
- invitation status and send timestamps
- cancellation/rescheduling state
- Drupal `rid` and `nid`

### RSVP responses

One response record represents one invitee for one RSVP event. It stores:

- RSVP event relationship
- player or external guest email
- response state
- comment
- guest count
- invited, received, and response timestamps
- stable Drupal invitation identifiers
- secure revocable invitation token metadata

## New workflow

- Automatically create invitations for the seven current core players.
- Organizers can add reserve players and remove unavailable or injured players.
- Organizers review the invite list before sending invitations.
- Players can respond through secure email links without logging in.
- Authenticated users can also see their invitations in the frontend.
- Invitees see names and responses of other invitees.
- Comments are visible only to the author and organizers.
- Organizers can cancel or reschedule events and notify invitees.
- Optional deadline reminders are controlled by the organizer.
- Attendance history feeds appearance statistics.

## Player experience

Players have a member area showing their upcoming and past invitations. For each invitation they can:

- see the event details and response deadline
- see their current response
- change between yes, no, maybe, and no response when allowed
- add or change a private comment
- change the number of guests they bring
- open the same response screen through a secure email link

## Organizer experience

Organizers and authorized delegates have an RSVP administration view for each event. It shows:

- all invited core and reserve players
- yes, maybe, no, and unanswered groups
- invitation sent/received status
- response timestamps
- guest totals and remaining capacity
- private response comments
- controls to add or remove invitees
- review, send, resend, cancel, and reschedule actions
- reminder controls and response deadline controls

The organizer view is private and is not implemented as public content. It can be exposed through the Payload admin for authorized roles and through a focused frontend organizer dashboard where the workflow is easier for team use.

RSVP response means intended attendance. If exact post-game attendance is needed, add a separate organizer-only `actualAttendance` or appearance confirmation after the event rather than overwriting the historical RSVP response.

## Security

Invitation tokens must be cryptographically random, revocable, scoped to one response, and never expose sensitive data. All organizer actions must use explicit Payload access checks; frontend response actions must not rely on unrestricted admin access.
