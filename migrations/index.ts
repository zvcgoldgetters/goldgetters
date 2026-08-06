import * as migration_20251223_205825_initial from './20251223_205825_initial';
import * as migration_20260806_110831_match_events_and_statistics from './20260806_110831_match_events_and_statistics';

export const migrations = [
  {
    up: migration_20251223_205825_initial.up,
    down: migration_20251223_205825_initial.down,
    name: '20251223_205825_initial',
  },
  {
    up: migration_20260806_110831_match_events_and_statistics.up,
    down: migration_20260806_110831_match_events_and_statistics.down,
    name: '20260806_110831_match_events_and_statistics',
  },
];
