import { NextResponse } from 'next/server';
import { updateMenuItemAvailability } from '../../../../lib/pos-repository';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { isAvailable } = await request.json();

  if (typeof isAvailable !== 'boolean') {
    return NextResponse.json({ error: 'isAvailable must be boolean' }, { status: 400 });
  }

  await updateMenuItemAvailability(Number(id), isAvailable);
  return NextResponse.json({ ok: true });
}
