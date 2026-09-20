import * as migration_20251223_205825_initial from './20251223_205825_initial';
import * as migration_20260918_160426_add_reset_password_requested_at from './20260918_160426_add_reset_password_requested_at';
import * as migration_20260920_210000_core_payload_model from './20260920_210000_core_payload_model';
import * as migration_20260920_210445_use_payload_slug_fields from './20260920_210445_use_payload_slug_fields';
import * as migration_20260920_214447_enable_editorial_drafts from './20260920_214447_enable_editorial_drafts';

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
  {
    up: migration_20260920_210000_core_payload_model.up,
    down: migration_20260920_210000_core_payload_model.down,
    name: '20260920_210000_core_payload_model',
  },
  {
    up: migration_20260920_210445_use_payload_slug_fields.up,
    down: migration_20260920_210445_use_payload_slug_fields.down,
    name: '20260920_210445_use_payload_slug_fields',
  },
  {
    up: migration_20260920_214447_enable_editorial_drafts.up,
    down: migration_20260920_214447_enable_editorial_drafts.down,
    name: '20260920_214447_enable_editorial_drafts',
  },
];
