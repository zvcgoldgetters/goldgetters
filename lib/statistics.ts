export type MatchEventType = 'goal' | 'yellow-card' | 'red-card';
export type OwnGoalSide = 'none' | 'goldgetters' | 'opponent';

export type MatchEventStat = {
  eventType: MatchEventType;
  ownGoal?: OwnGoalSide;
  playerId?: string | number | null;
  assistPlayerId?: string | number | null;
};

export type AppearanceStat = {
  playerId: string | number;
  teamId?: string | number | null;
  actualAttendance?: boolean;
};

export type PlayerStatistics = {
  appearances: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  ownGoalsFor: number;
  ownGoalsAgainst: number;
};

const emptyStats = (): PlayerStatistics => ({
  appearances: 0,
  goals: 0,
  assists: 0,
  yellowCards: 0,
  redCards: 0,
  ownGoalsFor: 0,
  ownGoalsAgainst: 0,
});

const updatePlayer = (
  stats: Map<string | number, PlayerStatistics>,
  playerId: string | number,
  update: (current: PlayerStatistics) => PlayerStatistics,
): Map<string | number, PlayerStatistics> => {
  const next = new Map(stats);
  next.set(playerId, update(stats.get(playerId) ?? emptyStats()));
  return next;
};

export function derivePlayerStatistics(
  appearances: AppearanceStat[],
  events: MatchEventStat[],
): Map<string | number, PlayerStatistics> {
  const appearanceStats = appearances.reduce(
    (stats, appearance) =>
      appearance.actualAttendance === false
        ? stats
        : updatePlayer(stats, appearance.playerId, (current) => ({
            ...current,
            appearances: current.appearances + 1,
          })),
    new Map<string | number, PlayerStatistics>(),
  );

  return events.reduce((stats, event) => {
    if (event.playerId === null || event.playerId === undefined) {
      return stats;
    }

    const eventStats = updatePlayer(stats, event.playerId, (current) => ({
      ...current,
      goals: current.goals + (event.eventType === 'goal' ? 1 : 0),
      yellowCards:
        current.yellowCards + (event.eventType === 'yellow-card' ? 1 : 0),
      redCards: current.redCards + (event.eventType === 'red-card' ? 1 : 0),
      ownGoalsFor:
        current.ownGoalsFor + (event.ownGoal === 'goldgetters' ? 1 : 0),
      ownGoalsAgainst:
        current.ownGoalsAgainst + (event.ownGoal === 'opponent' ? 1 : 0),
    }));

    if (
      event.eventType !== 'goal' ||
      event.assistPlayerId === null ||
      event.assistPlayerId === undefined
    ) {
      return eventStats;
    }

    return updatePlayer(eventStats, event.assistPlayerId, (current) => ({
      ...current,
      assists: current.assists + 1,
    }));
  }, appearanceStats);
}

export function deriveTeamTotals(
  events: MatchEventStat[],
): Pick<
  PlayerStatistics,
  'goals' | 'yellowCards' | 'redCards' | 'ownGoalsFor' | 'ownGoalsAgainst'
> {
  return events.reduce(
    (totals, event) => ({
      goals: totals.goals + (event.eventType === 'goal' ? 1 : 0),
      yellowCards:
        totals.yellowCards + (event.eventType === 'yellow-card' ? 1 : 0),
      redCards: totals.redCards + (event.eventType === 'red-card' ? 1 : 0),
      ownGoalsFor:
        totals.ownGoalsFor + (event.ownGoal === 'goldgetters' ? 1 : 0),
      ownGoalsAgainst:
        totals.ownGoalsAgainst + (event.ownGoal === 'opponent' ? 1 : 0),
    }),
    {
      goals: 0,
      yellowCards: 0,
      redCards: 0,
      ownGoalsFor: 0,
      ownGoalsAgainst: 0,
    },
  );
}
