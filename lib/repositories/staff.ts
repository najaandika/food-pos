import { prisma } from '../prisma';
import type { PosStaff, UserRole } from '../pos-types';
import { toId, toBigInt } from './helpers';
import { hashPassword } from '../password';

export type StaffPayload = {
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  isActive: boolean;
};

export async function getStaff(): Promise<PosStaff[]> {
  const staff = await prisma.user.findMany({
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });

  return staff.map((user) => ({
    id: toId(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }));
}

export async function createStaff(input: StaffPayload) {
  const password = input.password?.trim();
  if (!password) throw new Error('Password is required when creating staff');

  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      passwordHash: await hashPassword(password),
      role: input.role,
      isActive: input.isActive,
    },
  });

  return { id: toId(user.id) };
}

export async function updateStaff(userId: number, input: StaffPayload) {
  await prisma.user.update({
    where: { id: toBigInt(userId) },
    data: {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      role: input.role,
      isActive: input.isActive,
      ...(input.password?.trim() ? { passwordHash: await hashPassword(input.password.trim()) } : {}),
    },
  });
}

export async function disableStaff(userId: number) {
  await prisma.user.update({
    where: { id: toBigInt(userId) },
    data: { isActive: false },
  });

  return { disabled: true };
}
