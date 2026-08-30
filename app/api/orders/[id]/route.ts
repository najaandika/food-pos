import { NextResponse } from 'next/server';
import { apiRoles, requireApiRole } from '../../../../lib/auth-session';
import { handleApiError } from '../../../../lib/errors';
import { getPublicOrder, updateOrderStatus } from '../../../../lib/pos-repository';
import type { PosOrderStatus, UserRole } from '../../../../lib/pos-types';
import { OrderStatusSchema } from '../../../../lib/validation';

const allowedStatuses: PosOrderStatus[] = ['pending', 'accepted', 'preparing', 'ready', 'served', 'waiting_payment', 'paid', 'cancelled'];
const roleStatusAccess: Record<UserRole, PosOrderStatus[]> = {
  owner: allowedStatuses,
  kasir: ['waiting_payment', 'paid', 'cancelled'],
  waiters: ['accepted', 'preparing', 'ready', 'served', 'waiting_payment'],
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const orderId = Number(id);

  if (!Number.isFinite(orderId)) {
    return NextResponse.json({ error: 'Invalid order id' }, { status: 400 });
  }

  const order = await getPublicOrder(orderId);
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json(order);
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiRole(apiRoles.staff);
  if ('response' in auth) return auth.response;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = OrderStatusSchema.safeParse(body);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) fields[issue.path.join('.') || 'root'] = issue.message;
      return NextResponse.json({ error: 'Validation failed', code: 'VALIDATION_ERROR', fields }, { status: 422 });
    }
    const { status } = parsed.data;

    if (!roleStatusAccess[auth.user.role].includes(status)) {
      return NextResponse.json({ error: 'You do not have permission to set this order status', code: 'FORBIDDEN' }, { status: 403 });
    }

    await updateOrderStatus(Number(id), status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
