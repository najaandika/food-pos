import { NextResponse } from 'next/server';
import { getCategories, getMenuItems, getSettings, getSnapshot } from '../../../lib/pos-repository';
import { getSessionUser } from '../../../lib/auth-session';
import type { PosSnapshot, UserRole } from '../../../lib/pos-types';

function roleSnapshot(snapshot: PosSnapshot, role: UserRole): PosSnapshot {
  if (role === 'owner') return snapshot;

  return {
    ...snapshot,
    staff: [],
  };
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      const [categories, menuItems, settings] = await Promise.all([
        getCategories(),
        getMenuItems({ includeHidden: false }),
        getSettings(),
      ]);

      return NextResponse.json({
        categories,
        menuItems,
        orders: [],
        tables: [],
        staff: [],
        dashboard: {
          revenueToday: 0,
          paidToday: 0,
          activeOrders: 0,
          qrOrders: 0,
          needAction: 0,
          waitingPayment: 0,
        },
        settings,
      });
    }

    return NextResponse.json(roleSnapshot(await getSnapshot(), user.role));
  } catch (error) {
    console.error('Failed to load POS snapshot', error);
    return NextResponse.json({ error: 'Failed to load POS data' }, { status: 500 });
  }
}
