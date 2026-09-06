import { NextResponse } from 'next/server';
import { apiRoles, requireApiRole } from '../../../lib/auth-session';
import { handleApiError, validationErrorResponse } from '../../../lib/errors';
import { createTable } from '../../../lib/pos-repository';
import { TableSchema } from '../../../lib/validation';

export async function POST(request: Request) {
  const auth = await requireApiRole(apiRoles.owner);
  if ('response' in auth) return auth.response;

  try {
    const body = await request.json();
    const parsed = TableSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }
    const table = await createTable(parsed.data);
    return NextResponse.json({ ok: true, table });
  } catch (error) {
    return handleApiError(error);
  }
}
