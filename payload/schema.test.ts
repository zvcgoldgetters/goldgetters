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

    const roleField = Users.fields.find(
      (field) => 'name' in field && field.name === 'role',
    );
    expect(roleField).toMatchObject({
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'member',
    });
    expect(
      roleField && 'options' in roleField ? roleField.options : [],
    ).toEqual([
      { label: 'administrator', value: 'administrator' },
      { label: 'editor', value: 'editor' },
      { label: 'finance', value: 'finance' },
      { label: 'organizer', value: 'organizer' },
      { label: 'member', value: 'member' },
    ]);
  });

  it('protects the club settings global', () => {
    expect(typeof clubSettings.access?.read).toBe('function');
    expect(typeof clubSettings.access?.update).toBe('function');

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
      'payload-locked-documents',
      'payload-preferences',
      'payload-migrations',
    ]);
    expect(config.globals.map((global) => global.slug)).toEqual([
      'club-settings',
    ]);
  });
});
