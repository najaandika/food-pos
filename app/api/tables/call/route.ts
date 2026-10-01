import { NextResponse } from 'next/server';
import { requestWaiterCall } from '../../../../lib/pos-repository';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tableCode = String(body.tableCode || '').trim();
    if (!tableCode) {
      return NextResponse.json({ error: 'Table code is required' }, { status: 400 });
    }
    const result = await requestWaiterCall(tableCode);
    if (!result) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to call waiter' }, { status: 500 });
  }
}
