import { NextResponse } from 'next/server';
import { getSnapshot } from '../../../lib/pos-repository';

export async function GET() {
  try {
    return NextResponse.json(await getSnapshot());
  } catch (error) {
    console.error('Failed to load POS snapshot', error);
    return NextResponse.json({ error: 'Failed to load POS data' }, { status: 500 });
  }
}
