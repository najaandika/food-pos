import type { UserRole } from '../../lib/pos-types';
import type { View } from './types';

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};

const roleHome: Record<UserRole, View> = {
  owner: 'dashboard',
  kasir: 'cashier',
  waiters: 'waiters',
};

const roleAccess: Record<UserRole, View[]> = {
  owner: ['dashboard', 'report', 'menu', 'orders', 'cashier', 'waiters', 'owner-menu', 'owner-tables', 'owner-staff', 'settings'],
  kasir: ['dashboard', 'menu', 'orders', 'cashier'],
  waiters: ['orders', 'waiters'],
};

export function getRoleHome(role: UserRole) {
  return roleHome[role];
}

export function canAccessView(role: UserRole, view: View) {
  return roleAccess[role].includes(view);
}

export function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') return false;
  const user = value as Partial<AuthUser>;
  return (
    typeof user.id === 'number' &&
    typeof user.name === 'string' &&
    typeof user.email === 'string' &&
    (user.role === 'owner' || user.role === 'kasir' || user.role === 'waiters')
  );
}

export function roleLabel(role: UserRole) {
  if (role === 'kasir') return 'Kasir';
  if (role === 'waiters') return 'Waiters';
  return 'Owner';
}
