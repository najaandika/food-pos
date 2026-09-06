import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { UserRole } from './pos-types';

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};

const cookieName = 'bloc-pos-session';
const maxAge = 60 * 60 * 12;

const roleAccess: Record<UserRole, UserRole[]> = {
  owner: ['owner'],
  kasir: ['owner', 'kasir'],
  waiters: ['owner', 'kasir', 'waiters'],
};

function authSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET must be configured');
  }
  return secret;
}

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function decode<T>(value: string): T | null {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}

function sign(payload: string) {
  return createHmac('sha256', authSecret()).update(payload).digest('base64url');
}

function verifySignature(payload: string, signature: string) {
  const expected = sign(payload);
  const left = Buffer.from(expected);
  const right = Buffer.from(signature);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createSessionToken(user: SessionUser) {
  const payload = encode({
    user,
    exp: Date.now() + maxAge * 1000,
  });

  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token?: string): SessionUser | null {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !verifySignature(payload, signature)) return null;

  const session = decode<{ user: SessionUser; exp: number }>(payload);
  if (!session || session.exp < Date.now()) return null;
  if (!['owner', 'kasir', 'waiters'].includes(session.user.role)) return null;

  return session.user;
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  return readSessionToken(cookieStore.get(cookieName)?.value);
}

export async function setSessionCookie(response: NextResponse, user: SessionUser) {
  response.cookies.set(cookieName, createSessionToken(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(cookieName, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export async function requireApiRole(allowedRoles: UserRole[]) {
  const user = await getSessionUser();
  if (!user) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!allowedRoles.includes(user.role)) return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user };
}

export const apiRoles = {
  owner: roleAccess.owner,
  cashier: roleAccess.kasir,
  staff: roleAccess.waiters,
};
