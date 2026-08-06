import { describe, expect, it } from 'vitest';
import { RsvpEvents } from './RsvpEvents';
import { RsvpResponses } from './RsvpResponses';
import { TeamEvents } from './TeamEvents';

const fieldNames = (collection: typeof TeamEvents): string[] =>
  collection.fields.flatMap((field) =>
    'name' in field && field.name ? [field.name] : [],
  );

describe('team event and RSVP collections', () => {
  it('models match, training, and tournament events', () => {
    const eventType = TeamEvents.fields.find(
      (field) => 'name' in field && field.name === 'eventType',
    );

    expect(eventType).toMatchObject({
      type: 'select',
      options: [
        { value: 'match' },
        { value: 'training' },
        { value: 'tournament' },
      ],
    });
    expect(fieldNames(TeamEvents)).toEqual(
      expect.arrayContaining(['title', 'startsAt', 'status', 'sourceId']),
    );
  });

  it('stores RSVP windows, visibility, organizer controls, and legacy IDs', () => {
    expect(RsvpEvents.slug).toBe('rsvp-events');
    expect(fieldNames(RsvpEvents)).toEqual(
      expect.arrayContaining([
        'teamEvent',
        'organizers',
        'moderators',
        'responseDeadline',
        'guestListVisibility',
        'invitationStatus',
        'sourceRid',
        'sourceNid',
      ]),
    );
  });

  it('stores private responses and revocable invitation metadata', () => {
    expect(RsvpResponses.slug).toBe('rsvp-responses');
    expect(fieldNames(RsvpResponses)).toEqual(
      expect.arrayContaining([
        'rsvpEvent',
        'invitee',
        'response',
        'comment',
        'guestCount',
        'tokenHash',
        'tokenExpiresAt',
        'tokenRevokedAt',
        'sourceInviteId',
      ]),
    );

    const tokenHash = RsvpResponses.fields.find(
      (field) => 'name' in field && field.name === 'tokenHash',
    );
    expect(tokenHash).toMatchObject({ unique: true, index: true });
  });
});
