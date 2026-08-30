import { NextResponse } from 'next/server';
import { apiRoles, requireApiRole } from '../../../../lib/auth-session';
import { handleApiError } from '../../../../lib/errors';
import { deleteMenuItem, updateMenuItem, updateMenuItemAvailability } from '../../../../lib/pos-repository';
import { MenuAvailabilitySchema, MenuItemSchema } from '../../../../lib/validation';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiRole(apiRoles.owner);
  if ('response' in auth) return auth.response;

  const { id } = await context.params;
  try {
    const body = await request.json();

    if ('name' in body || 'category' in body || 'price' in body) {
      const parsed = MenuItemSchema.safeParse(body);
      if (!parsed.success) {
        const fields: Record<string, string> = {};
        for (const issue of parsed.error.issues) fields[issue.path.join('.') || 'root'] = issue.message;
        return NextResponse.json({ error: 'Validation failed', code: 'VALIDATION_ERROR', fields }, { status: 422 });
      }
      await updateMenuItem(Number(id), parsed.data);
      return NextResponse.json({ ok: true });
    }

    const parsed = MenuAvailabilitySchema.safeParse(body);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) fields[issue.path.join('.') || 'root'] = issue.message;
      return NextResponse.json({ error: 'Validation failed', code: 'VALIDATION_ERROR', fields }, { status: 422 });
    }

    await updateMenuItemAvailability(Number(id), parsed.data.isAvailable);
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
    const result = await deleteMenuItem(Number(id));
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return handleApiError(error);
  }
}
