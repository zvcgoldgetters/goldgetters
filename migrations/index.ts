import * as migration_20251223_205825_initial from './20251223_205825_initial';
import * as migration_20260806_075424 from './20260806_075424';

export const migrations = [
  {
    up: migration_20251223_205825_initial.up,
    down: migration_20251223_205825_initial.down,
    name: '20251223_205825_initial',
  },
  {
    up: migration_20260806_075424.up,
    down: migration_20260806_075424.down,
    name: '20260806_075424',
  },
];
