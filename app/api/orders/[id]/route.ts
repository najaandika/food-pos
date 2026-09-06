import { NextResponse } from 'next/server';
import { apiRoles, requireApiRole } from '../../../../lib/auth-session';
import { handleApiError, validationErrorResponse } from '../../../../lib/errors';
import { getPublicOrder, updateOrderStatus } from '../../../../lib/pos-repository';
import type { PosOrderStatus, UserRole } from '../../../../lib/pos-types';
import { OrderStatusSchema, PositiveIdSchema } from '../../../../lib/validation';

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
  const parsedId = PositiveIdSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: 'Invalid order id', code: 'INVALID_ID' }, { status: 400 });
  }

  const order = await getPublicOrder(parsedId.data);
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
    const parsedId = PositiveIdSchema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json({ error: 'Invalid order id', code: 'INVALID_ID' }, { status: 400 });
    }
    const body = await request.json();
    const parsed = OrderStatusSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }
    const { status } = parsed.data;

    if (!roleStatusAccess[auth.user.role].includes(status)) {
      return NextResponse.json({ error: 'You do not have permission to set this order status', code: 'FORBIDDEN' }, { status: 403 });
    }

    await updateOrderStatus(parsedId.data, status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
