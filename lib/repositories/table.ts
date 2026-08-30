import { randomUUID } from 'crypto';
import { prisma } from '../prisma';
import type { PosTable, PosTableStatus } from '../pos-types';
import { toId, toBigInt } from './helpers';

export type TablePayload = {
  code: string;
  name: string;
  area: string;
  seats: number;
  status: PosTableStatus;
};

function createQrToken(code: string) {
  return `${code.toLowerCase()}-${randomUUID().slice(0, 12)}`;
}

export async function getTables(): Promise<PosTable[]> {
  const tables = await prisma.table.findMany({
    orderBy: [{ area: 'asc' }, { code: 'asc' }],
  });

  return tables.map((table) => ({
    id: toId(table.id),
    code: table.code,
    name: table.name,
    area: table.area,
    seats: table.seats,
    status: table.status,
    qrToken: table.qrToken,
    scansToday: table.scansToday,
    currentOrderId: table.currentOrderId ? toId(table.currentOrderId) : null,
  }));
}

export async function createTable(input: TablePayload) {
  const code = input.code.trim().toUpperCase();
  const table = await prisma.table.create({
    data: {
      code,
      name: input.name.trim(),
      area: input.area.trim() || 'Indoor',
      seats: input.seats,
      status: input.status,
      qrToken: createQrToken(code),
    },
  });

  return { id: toId(table.id) };
}

export async function updateTable(tableId: number, input: TablePayload) {
  const code = input.code.trim().toUpperCase();
  await prisma.table.update({
    where: { id: toBigInt(tableId) },
    data: {
      code,
      name: input.name.trim(),
      area: input.area.trim() || 'Indoor',
      seats: input.seats,
      status: input.status,
    },
  });
}

export async function deleteTable(tableId: number) {
  const id = toBigInt(tableId);
  const orderCount = await prisma.order.count({ where: { tableId: id } });

  if (orderCount > 0) {
    await prisma.table.update({
      where: { id },
      data: {
        status: 'inactive',
        currentOrderId: null,
      },
    });

    return { deleted: false, archived: true };
  }

  await prisma.table.delete({ where: { id } });
  return { deleted: true, archived: false };
}
