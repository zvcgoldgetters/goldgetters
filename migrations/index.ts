import * as migration_20251223_205825_initial from './20251223_205825_initial';
import * as migration_20260918_160426_add_reset_password_requested_at from './20260918_160426_add_reset_password_requested_at';
import * as migration_20260920_210000_core_payload_model from './20260920_210000_core_payload_model';
import * as migration_20260920_210445_use_payload_slug_fields from './20260920_210445_use_payload_slug_fields';
import * as migration_20260920_214447_enable_editorial_drafts from './20260920_214447_enable_editorial_drafts';
import * as migration_20260921_090000_repair_locked_document_relationships from './20260921_090000_repair_locked_document_relationships';
import * as migration_20261126_223642_users_multiple_roles from './20261126_223642_users_multiple_roles';
import * as migration_20261126_224936_media_uploaded_by from './20261126_224936_media_uploaded_by';
import * as migration_20261127_135702_editorial_immutable_owner from './20261127_135702_editorial_immutable_owner';
import * as migration_20261127_170000_users_roles_json_column from './20261127_170000_users_roles_json_column';
import * as migration_20261127_182949_remove_domain_source_fields from './20261127_182949_remove_domain_source_fields';
import * as migration_20261128_114500_source_records_composite_unique from './20261128_114500_source_records_composite_unique';

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
  {
    up: migration_20260921_090000_repair_locked_document_relationships.up,
    down: migration_20260921_090000_repair_locked_document_relationships.down,
    name: '20260921_090000_repair_locked_document_relationships',
  },
  {
    up: migration_20261126_223642_users_multiple_roles.up,
    down: migration_20261126_223642_users_multiple_roles.down,
    name: '20261126_223642_users_multiple_roles',
  },
  {
    up: migration_20261126_224936_media_uploaded_by.up,
    down: migration_20261126_224936_media_uploaded_by.down,
    name: '20261126_224936_media_uploaded_by',
  },
  {
    up: migration_20261127_135702_editorial_immutable_owner.up,
    down: migration_20261127_135702_editorial_immutable_owner.down,
    name: '20261127_135702_editorial_immutable_owner',
  },
  {
    up: migration_20261127_170000_users_roles_json_column.up,
    down: migration_20261127_170000_users_roles_json_column.down,
    name: '20261127_170000_users_roles_json_column',
  },
  {
    up: migration_20261127_182949_remove_domain_source_fields.up,
    down: migration_20261127_182949_remove_domain_source_fields.down,
    name: '20261127_182949_remove_domain_source_fields',
  },
  {
    up: migration_20261128_114500_source_records_composite_unique.up,
    down: migration_20261128_114500_source_records_composite_unique.down,
    name: '20261128_114500_source_records_composite_unique',
  },
];
