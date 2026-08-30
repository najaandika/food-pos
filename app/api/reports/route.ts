import { NextResponse } from 'next/server';
import { apiRoles, requireApiRole } from '../../../lib/auth-session';
import { getReport } from '../../../lib/pos-repository';

export async function GET(request: Request) {
  const auth = await requireApiRole(apiRoles.owner);
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const report = await getReport({
    from: searchParams.get('from'),
    to: searchParams.get('to'),
  });

  return NextResponse.json(report);
}
