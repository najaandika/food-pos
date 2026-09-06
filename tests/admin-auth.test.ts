import { describe, expect, it } from 'vitest';
import { canAccessView, getRoleHome, isAuthUser } from '../app/admin/auth';

describe('admin role access', () => {
  it('routes each role to its intended home view', () => {
    expect(getRoleHome('owner')).toBe('dashboard');
    expect(getRoleHome('kasir')).toBe('cashier');
    expect(getRoleHome('waiters')).toBe('waiters');
  });

  it('limits views by role', () => {
    expect(canAccessView('owner', 'owner-staff')).toBe(true);
    expect(canAccessView('kasir', 'cashier')).toBe(true);
    expect(canAccessView('kasir', 'owner-staff')).toBe(false);
    expect(canAccessView('waiters', 'waiters')).toBe(true);
    expect(canAccessView('waiters', 'settings')).toBe(false);
  });

  it('validates persisted auth user data', () => {
    expect(isAuthUser({ id: 1, name: 'Owner', email: 'owner@example.test', role: 'owner' })).toBe(true);
    expect(isAuthUser({ id: '1', name: 'Owner', email: 'owner@example.test', role: 'owner' })).toBe(false);
    expect(isAuthUser({ id: 1, name: 'Owner', email: 'owner@example.test', role: 'admin' })).toBe(false);
  });
});
