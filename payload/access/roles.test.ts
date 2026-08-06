import { describe, expect, it } from 'vitest';
import { hasAnyRole, hasRole, isAuthenticated, userRoles } from './roles';

describe('Payload user roles', () => {
  it('defines the migration role vocabulary', () => {
    expect(userRoles).toEqual([
      'administrator',
      'editor',
      'finance',
      'organizer',
      'member',
    ]);
  });

  it('matches a single role without trusting malformed values', () => {
    expect(hasRole({ role: 'finance' }, 'finance')).toBe(true);
    expect(hasRole({ role: 'member' }, 'finance')).toBe(false);
    expect(hasRole({ role: 'administrator' }, 'administrator')).toBe(true);
    expect(hasRole(null, 'administrator')).toBe(false);
  });

  it('matches any role in an allowed role set', () => {
    expect(
      hasAnyRole({ role: 'organizer' }, ['administrator', 'organizer']),
    ).toBe(true);
    expect(hasAnyRole({ role: 'member' }, ['administrator', 'organizer'])).toBe(
      false,
    );
    expect(hasAnyRole({ role: 'unknown' }, userRoles)).toBe(false);
  });

  it('distinguishes authenticated users from anonymous requests', () => {
    expect(isAuthenticated({ id: 'user-1' })).toBe(true);
    expect(isAuthenticated(null)).toBe(false);
    expect(isAuthenticated(undefined)).toBe(false);
  });
});
