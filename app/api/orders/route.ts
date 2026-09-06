import { NextResponse } from 'next/server';
import { apiRoles, requireApiRole } from '../../../lib/auth-session';
import { handleApiError, validationErrorResponse } from '../../../lib/errors';
import { createCustomerOrder, createManualOrder } from '../../../lib/pos-repository';
import { CustomerOrderSchema, ManualOrderSchema } from '../../../lib/validation';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.source === 'manual' || body.type) {
      const auth = await requireApiRole(apiRoles.cashier);
      if ('response' in auth) return auth.response;

      const parsed = ManualOrderSchema.safeParse(body);
      if (!parsed.success) {
        return validationErrorResponse(parsed.error);
      }

      const order = await createManualOrder({
        tableCode: parsed.data.tableCode ?? undefined,
        customerName: parsed.data.customerName,
        type: parsed.data.type,
        guests: parsed.data.guests,
        notes: parsed.data.notes ?? undefined,
        items: parsed.data.items,
      });

      return NextResponse.json(order, { status: 201 });
    }

    const parsed = CustomerOrderSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const order = await createCustomerOrder({
      tableCode: parsed.data.tableCode,
      customerName: parsed.data.customerName,
      notes: parsed.data.notes ?? undefined,
      items: parsed.data.items,
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
