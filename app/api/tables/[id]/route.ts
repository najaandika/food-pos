import { NextResponse } from 'next/server';
import { apiRoles, requireApiRole } from '../../../../lib/auth-session';
import { handleApiError, validationErrorResponse } from '../../../../lib/errors';
import { deleteTable, updateTable } from '../../../../lib/pos-repository';
import { PositiveIdSchema, TableSchema } from '../../../../lib/validation';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiRole(apiRoles.owner);
  if ('response' in auth) return auth.response;

  const { id } = await context.params;
  const parsedId = PositiveIdSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: 'Invalid table id', code: 'INVALID_ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsed = TableSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }
    await updateTable(parsedId.data, parsed.data);
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
      return NextResponse.json({ error: 'Invalid table id', code: 'INVALID_ID' }, { status: 400 });
    }
    const result = await deleteTable(parsedId.data);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return handleApiError(error);
  }
}
