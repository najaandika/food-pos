import { NextResponse } from 'next/server';
import { apiRoles, requireApiRole } from '../../../lib/auth-session';
import { handleApiError, validationErrorResponse } from '../../../lib/errors';
import { markOrderPaid } from '../../../lib/pos-repository';
import { PaymentSchema } from '../../../lib/validation';

export async function POST(request: Request) {
  const auth = await requireApiRole(apiRoles.cashier);
  if ('response' in auth) return auth.response;

  try {
    const body = await request.json();
    const parsed = PaymentSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }
    await markOrderPaid(parsed.data.orderId, parsed.data.method);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
