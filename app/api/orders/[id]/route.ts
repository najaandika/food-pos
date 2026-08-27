import { NextResponse } from 'next/server';
import { updateOrderStatus } from '../../../../lib/pos-repository';
import type { PosOrderStatus } from '../../../../lib/pos-types';

const allowedStatuses: PosOrderStatus[] = ['pending', 'accepted', 'preparing', 'ready', 'served', 'waiting_payment', 'paid', 'cancelled'];

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { status } = await request.json();

  if (!allowedStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid order status' }, { status: 400 });
  }

  await updateOrderStatus(Number(id), status);
  return NextResponse.json({ ok: true });
}
