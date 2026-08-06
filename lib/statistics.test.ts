import { describe, expect, it } from 'vitest';
import { derivePlayerStatistics, deriveTeamTotals } from '@/lib/statistics';

describe('statistics derivation', () => {
  it('derives appearances, goals, assists, cards, and own goals per player', () => {
    const stats = derivePlayerStatistics(
      [
        { playerId: 1 },
        { playerId: 2, actualAttendance: false },
        { playerId: 2 },
      ],
      [
        { eventType: 'goal', playerId: 1, assistPlayerId: 2 },
        { eventType: 'yellow-card', playerId: 2 },
        { eventType: 'red-card', playerId: 1 },
        { eventType: 'goal', playerId: 1, ownGoal: 'goldgetters' },
        { eventType: 'goal', playerId: 2, ownGoal: 'opponent' },
      ],
    );

    expect(stats.get(1)).toEqual({
      appearances: 1,
      goals: 2,
      assists: 0,
      yellowCards: 0,
      redCards: 1,
      ownGoalsFor: 1,
      ownGoalsAgainst: 0,
    });
    expect(stats.get(2)).toEqual({
      appearances: 1,
      goals: 1,
      assists: 1,
      yellowCards: 1,
      redCards: 0,
      ownGoalsFor: 0,
      ownGoalsAgainst: 1,
    });
  });

  it('derives team totals without counting assists as goals', () => {
    expect(
      deriveTeamTotals([
        { eventType: 'goal', playerId: 1 },
        { eventType: 'yellow-card', playerId: 1 },
        { eventType: 'red-card', playerId: 2 },
        { eventType: 'goal', playerId: 3, ownGoal: 'opponent' },
      ]),
    ).toEqual({
      goals: 2,
      yellowCards: 1,
      redCards: 1,
      ownGoalsFor: 0,
      ownGoalsAgainst: 1,
    });
  });
});
