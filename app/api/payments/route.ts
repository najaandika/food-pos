import { NextResponse } from 'next/server';
import { markOrderPaid } from '../../../lib/pos-repository';

export async function POST(request: Request) {
  const { orderId, method = 'cash' } = await request.json();

  if (!orderId) {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
  }

  await markOrderPaid(Number(orderId), method);
  return NextResponse.json({ ok: true });
}
