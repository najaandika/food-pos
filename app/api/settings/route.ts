import { NextResponse } from 'next/server';
import { apiRoles, requireApiRole } from '../../../lib/auth-session';
import { handleApiError, validationErrorResponse } from '../../../lib/errors';
import { getSettings, updateSettings } from '../../../lib/pos-repository';
import { SettingsSchema } from '../../../lib/validation';

export async function GET() {
  const auth = await requireApiRole(apiRoles.owner);
  if ('response' in auth) return auth.response;

  return NextResponse.json(await getSettings());
}

export async function PATCH(request: Request) {
  const auth = await requireApiRole(apiRoles.owner);
  if ('response' in auth) return auth.response;

  try {
    const body = await request.json();
    const parsed = SettingsSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }
    const settings = await updateSettings(parsed.data);
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    return handleApiError(error);
  }
}
