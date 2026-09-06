import { NextResponse } from 'next/server';
import { apiRoles, requireApiRole } from '../../../lib/auth-session';
import { handleApiError, validationErrorResponse } from '../../../lib/errors';
import { createStaff } from '../../../lib/pos-repository';
import { StaffSchema } from '../../../lib/validation';

export async function POST(request: Request) {
  const auth = await requireApiRole(apiRoles.owner);
  if ('response' in auth) return auth.response;

  try {
    const body = await request.json();
    const parsed = StaffSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }
    const staff = await createStaff(parsed.data);
    return NextResponse.json({ ok: true, staff });
  } catch (error) {
    return handleApiError(error);
  }
}
