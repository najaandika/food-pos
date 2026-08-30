// Facade for backward compatibility - split into domain repositories
// Original monolith 903 lines -> 6 modules + helpers
export * from './repositories/helpers';
export * from './repositories/settings';
export * from './repositories/menu';
export * from './repositories/table';
export * from './repositories/staff';
export * from './repositories/order';
export * from './repositories/dashboard';

import { getCategories } from './repositories/menu';
import { getMenuItems } from './repositories/menu';
import { getOrders } from './repositories/order';
import { getTables } from './repositories/table';
import { getStaff } from './repositories/staff';
import { getDashboard } from './repositories/dashboard';
import { getSettings } from './repositories/settings';
import type { PosSnapshot } from './pos-types';

export async function getSnapshot(): Promise<PosSnapshot> {
  const [categories, menuItems, orders, tables, staff, dashboard, settings] = await Promise.all([
    getCategories(),
    getMenuItems(),
    getOrders(),
    getTables(),
    getStaff(),
    getDashboard(),
    getSettings(),
  ]);

  return { categories, menuItems, orders, tables, staff, dashboard, settings };
}
