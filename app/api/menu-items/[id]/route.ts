import { NextResponse } from 'next/server';
import { apiRoles, requireApiRole } from '../../../../lib/auth-session';
import { handleApiError, validationErrorResponse } from '../../../../lib/errors';
import { deleteMenuItem, updateMenuItem, updateMenuItemAvailability } from '../../../../lib/pos-repository';
import { MenuAvailabilitySchema, MenuItemSchema, PositiveIdSchema } from '../../../../lib/validation';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiRole(apiRoles.owner);
  if ('response' in auth) return auth.response;

  const { id } = await context.params;
  const parsedId = PositiveIdSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: 'Invalid menu item id', code: 'INVALID_ID' }, { status: 400 });
  }
  try {
    const body = await request.json();

    if ('name' in body || 'category' in body || 'price' in body) {
      const parsed = MenuItemSchema.safeParse(body);
      if (!parsed.success) {
        return validationErrorResponse(parsed.error);
      }
      await updateMenuItem(parsedId.data, parsed.data);
      return NextResponse.json({ ok: true });
    }

    const parsed = MenuAvailabilitySchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    await updateMenuItemAvailability(parsedId.data, parsed.data.isAvailable);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(apiRoles.owner);
  if ('response' in auth) return auth.response;

  try {
    const { id } = await context.params;
    const parsedId = PositiveIdSchema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json({ error: 'Invalid menu item id', code: 'INVALID_ID' }, { status: 400 });
    }
    const result = await deleteMenuItem(parsedId.data);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return handleApiError(error);
  }
}
