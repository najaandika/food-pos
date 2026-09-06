import { NextResponse } from 'next/server';
import { apiRoles, requireApiRole } from '../../../../lib/auth-session';
import { handleApiError, validationErrorResponse } from '../../../../lib/errors';
import { deleteTable, updateTable } from '../../../../lib/pos-repository';
import { TableSchema } from '../../../../lib/validation';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiRole(apiRoles.owner);
  if ('response' in auth) return auth.response;

  const { id } = await context.params;

  try {
    const body = await request.json();
    const parsed = TableSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }
    await updateTable(Number(id), parsed.data);
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
    const result = await deleteTable(Number(id));
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return handleApiError(error);
  }
}
