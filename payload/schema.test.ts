import { describe, expect, it, vi } from 'vitest';
import { migrations } from '../migrations';
import { Users } from './collections/Users';
import { clubSettings } from './globals/ClubSettings';

describe('Payload schema setup', () => {
  it('registers schema migrations with reversible handlers', () => {
    expect(migrations.map((migration) => migration.name)).toEqual([
      '20251223_205825_initial',
      '20260918_160426_add_reset_password_requested_at',
      '20260920_210000_core_payload_model',
      '20260920_210445_use_payload_slug_fields',
      '20260920_214447_enable_editorial_drafts',
      '20260921_090000_repair_locked_document_relationships',
      '20261126_223642_users_multiple_roles',
      '20261126_224936_media_uploaded_by',
      '20261127_135702_editorial_immutable_owner',
      '20261127_170000_users_roles_json_column',
      '20261127_182949_remove_domain_source_fields',
      '20261128_114500_source_records_composite_unique',
    ]);
    migrations.map((migration) => {
      expect(migration.up).toEqual(expect.any(Function));
      expect(migration.down).toEqual(expect.any(Function));
      return migration;
    });
  });

  it('defines the authenticated users collection and role validation', () => {
    expect(Users.slug).toBe('users');
    expect(Users.auth).toBe(true);

    const rolesField = Users.fields.find(
      (field) => 'name' in field && field.name === 'roles',
    );
    expect(rolesField).toMatchObject({
      name: 'roles',
      type: 'json',
      required: true,
      defaultValue: ['member'],
      saveToJWT: true,
      jsonSchema: {
        schema: {
          items: {
            enum: [
              'administrator',
              'director',
              'team-manager',
              'treasurer',
              'editor',
              'member',
            ],
            type: 'string',
          },
          type: 'array',
          uniqueItems: true,
        },
      },
    });
    const rolesAdminComponents =
      rolesField &&
      'admin' in rolesField &&
      rolesField.admin &&
      'components' in rolesField.admin
        ? (rolesField.admin.components as object)
        : undefined;
    expect(rolesAdminComponents).toBeDefined();
    if (rolesAdminComponents) {
      expect(Reflect.get(rolesAdminComponents, 'Cell')).toBe(
        '/payload/components/UserRolesCell#UserRolesCell',
      );
      expect(Reflect.get(rolesAdminComponents, 'Field')).toBe(
        '/payload/components/UserRolesField#UserRolesField',
      );
    }
  });

  it('protects the club settings global', () => {
    expect(typeof clubSettings.access?.read).toBe('function');
    expect(typeof clubSettings.access?.update).toBe('function');
    expect(typeof clubSettings.access?.readVersions).toBe('function');

    expect(
      clubSettings.fields
        .filter((field) => 'name' in field)
        .map((field) => field.name),
    ).toEqual([
      'clubName',
      'contactEmail',
      'contactPhone',
      'currentTeam',
      'currentSeason',
      'currentLeague',
      'defaultVenue',
      'timezone',
    ]);
  });

  it('registers every domain collection in the Payload config', async () => {
    vi.stubEnv('PAYLOAD_SECRET', 'test-secret');
    const { default: payloadConfig } = await import('../payload.config');
    const config = await payloadConfig;

    expect(typeof config.email).toBe('function');
    expect(config.serverURL).toMatch(/^https?:\/\/[^/]+$/);
    expect(config.collections.map((collection) => collection.slug)).toEqual([
      'users',
      'players',
      'teams',
      'venues',
      'leagues',
      'seasons',
      'matches',
      'team-events',
      'reports',
      'previews',
      'news',
      'albums',
      'media',
      'bookings',
      'source-records',
      'payload-kv',
      'payload-preferences',
      'payload-migrations',
    ]);
    expect(
      config.collections.every(
        (collection) => collection.lockDocuments === false,
      ),
    ).toBe(true);
    expect(config.globals.map((global) => global.slug)).toEqual([
      'club-settings',
    ]);
    expect(
      config.globals.every((global) => global.lockDocuments === false),
    ).toBe(true);
  });
});
