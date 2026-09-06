import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRoles, createSessionToken, readSessionToken, requireApiRole, type SessionUser } from '../lib/auth-session';

const cookieValue = { value: undefined as string | undefined };

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: () => cookieValue.value ? { value: cookieValue.value } : undefined,
  })),
}));

const user: SessionUser = {
  id: 1,
  name: 'Owner',
  email: 'owner@example.test',
  role: 'owner',
};

describe('session authorization', () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = 'test-only-secret';
    cookieValue.value = undefined;
  });

  it('round-trips a signed session token', () => {
    const token = createSessionToken(user);

    expect(readSessionToken(token)).toEqual(user);
  });

  it('rejects a tampered session token', () => {
    const token = createSessionToken(user);
    const tampered = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;

    expect(readSessionToken(tampered)).toBeNull();
  });

  it('enforces allowed roles for API access', async () => {
    cookieValue.value = createSessionToken(user);

    await expect(requireApiRole(apiRoles.owner)).resolves.toEqual({ user });
    await expect(requireApiRole(apiRoles.cashier)).resolves.toEqual({ user });
    await expect(requireApiRole(['waiters'])).resolves.toMatchObject({
      response: { status: 403 },
    });
  });

  it('rejects requests without a session', async () => {
    await expect(requireApiRole(apiRoles.owner)).resolves.toMatchObject({
      response: { status: 401 },
    });
  });

  it('applies the expected API access matrix for every role', async () => {
    const cases: Array<{ role: SessionUser['role']; allowed: string[]; denied: string[] }> = [
      { role: 'owner', allowed: ['owner', 'cashier', 'staff'], denied: [] },
      { role: 'kasir', allowed: ['cashier', 'staff'], denied: ['owner'] },
      { role: 'waiters', allowed: ['staff'], denied: ['owner', 'cashier'] },
    ];

    for (const testCase of cases) {
      cookieValue.value = createSessionToken({ ...user, role: testCase.role });

      for (const access of testCase.allowed) {
        await expect(requireApiRole(apiRoles[access as keyof typeof apiRoles])).resolves.toHaveProperty('user.role', testCase.role);
      }

      for (const access of testCase.denied) {
        await expect(requireApiRole(apiRoles[access as keyof typeof apiRoles])).resolves.toMatchObject({
          response: { status: 403 },
        });
      }
    }
  });

  it('rejects expired session tokens', () => {
    vi.useFakeTimers();
    try {
      const token = createSessionToken(user);

      vi.advanceTimersByTime(12 * 60 * 60 * 1000 + 1);

      expect(readSessionToken(token)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
