import * as migration_20251223_205825_initial from './20251223_205825_initial';
import * as migration_20260918_160426_add_reset_password_requested_at from './20260918_160426_add_reset_password_requested_at';

export const migrations = [
  {
    up: migration_20251223_205825_initial.up,
    down: migration_20251223_205825_initial.down,
    name: '20251223_205825_initial',
  },
  {
    up: migration_20260918_160426_add_reset_password_requested_at.up,
    down: migration_20260918_160426_add_reset_password_requested_at.down,
    name: '20260918_160426_add_reset_password_requested_at',
  },
];
