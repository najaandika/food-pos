import { NextResponse } from 'next/server';
import { apiRoles, requireApiRole } from '../../../lib/auth-session';
import { handleApiError, validationErrorResponse } from '../../../lib/errors';
import { createMenuItem } from '../../../lib/pos-repository';
import { MenuItemSchema } from '../../../lib/validation';

export async function POST(request: Request) {
  const auth = await requireApiRole(apiRoles.owner);
  if ('response' in auth) return auth.response;

  try {
    const body = await request.json();
    const parsed = MenuItemSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }
    const menuItem = await createMenuItem(parsed.data);
    return NextResponse.json({ ok: true, menuItem });
  } catch (error) {
    return handleApiError(error);
  }
}
