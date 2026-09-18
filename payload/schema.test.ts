import { describe, expect, it } from 'vitest';
import { migrations } from '../migrations';
import { Users } from './collections/Users';

describe('Payload schema setup', () => {
  it('registers schema migrations with reversible handlers', () => {
    expect(migrations.map(({ name }) => name)).toEqual([
      '20251223_205825_initial',
      '20260918_160426_add_reset_password_requested_at',
    ]);
    migrations.forEach((migration) => {
      expect(migration.up).toEqual(expect.any(Function));
      expect(migration.down).toEqual(expect.any(Function));
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
});
