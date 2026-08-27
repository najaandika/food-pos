import { NextResponse } from 'next/server';
import { createCustomerOrder } from '../../../lib/pos-repository';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const order = await createCustomerOrder({
      tableCode: body.tableCode,
      customerName: body.customerName || 'Guest',
      notes: body.notes,
      items: body.items ?? [],
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Failed to create order', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create order' }, { status: 400 });
  }
}
