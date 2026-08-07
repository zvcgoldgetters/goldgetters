import * as migration_20251223_205825_initial from './20251223_205825_initial';
import * as migration_20260805_223859_core_payload_model from './20260805_223859_core_payload_model';

export const migrations = [
  {
    up: migration_20251223_205825_initial.up,
    down: migration_20251223_205825_initial.down,
    name: '20251223_205825_initial',
  },
  {
    up: migration_20260805_223859_core_payload_model.up,
    down: migration_20260805_223859_core_payload_model.down,
    name: '20260805_223859_core_payload_model',
  },
];
