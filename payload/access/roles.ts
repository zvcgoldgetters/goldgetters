import type { Access } from 'payload';

export const userRoles = [
  'administrator',
  'editor',
  'finance',
  'organizer',
  'member',
] as const;

export type UserRole = (typeof userRoles)[number];

type RoleBearingUser =
  | {
      role?: unknown;
    }
  | null
  | undefined;

export function hasRole(user: RoleBearingUser, role: UserRole): boolean {
  return user?.role === role;
}

export function hasAnyRole(
  user: RoleBearingUser,
  roles: readonly UserRole[],
): boolean {
  return Boolean(user?.role && roles.includes(user.role as UserRole));
}

export function isAuthenticated(user: unknown): boolean {
  return Boolean(user);
}

type AccessArgs = Parameters<Access>[0];

const hasAccessRole =
  (roles: readonly UserRole[]) =>
  ({ req }: AccessArgs): boolean =>
    hasAnyRole(req.user as RoleBearingUser, roles);

export const isLoggedIn = ({ req }: AccessArgs): boolean =>
  isAuthenticated(req.user);
export const isAdministrator = hasAccessRole(['administrator']);
export const isEditorial = hasAccessRole(['administrator', 'editor']);
export const isFinance = hasAccessRole(['administrator', 'finance']);
export const isOrganizer = hasAccessRole(['administrator', 'organizer']);
export const isMember = hasAccessRole([
  'administrator',
  'editor',
  'finance',
  'organizer',
  'member',
]);
