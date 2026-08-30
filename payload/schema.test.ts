import { describe, expect, it } from 'vitest';
import { migrations } from '../migrations';
import { Users } from './collections/Users';

describe('Payload schema setup', () => {
  it('registers the initial schema migration with reversible handlers', () => {
    expect(migrations).toHaveLength(2);
    expect(migrations[0]?.name).toBe('20251223_205825_initial');
    expect(migrations[0]?.up).toEqual(expect.any(Function));
    expect(migrations[0]?.down).toEqual(expect.any(Function));
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
