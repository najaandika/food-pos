import type { PosDashboard, PosMenuItem, PosOrder, PosOrderStatus, PosSnapshot, PosTable } from '../../lib/pos-types';
import { formatRupiah } from '../lib/format';
import { dishes as fallbackDishes, orders as fallbackOrders } from './data';

export type AdminDish = {
  id?: number;
  name: string;
  desc: string;
  price: string;
  oldPrice?: string;
  qty: number;
  badge?: string;
  badgeTone?: string;
  image: string;
  category?: string;
  isAvailable?: boolean;
  soldToday?: number;
};

export type AdminOrder = {
  id?: number;
  table: string;
  tone: string;
  name: string;
  meta: string;
  status: string;
  statusTone: string;
  time: string;
  total: string;
  more?: string;
  items: string[][];
  rawStatus?: PosOrderStatus;
  source?: PosOrder['source'];
  type?: PosOrder['type'];
  tableCode?: string | null;
  guests?: number;
};

export type AdminTable = {
  id?: number;
  code: string;
  name: string;
  area: string;
  status: string;
  seats: number;
  scans: number;
  lastOrder: string;
  tone: string;
};

const orderStatusLabel: Record<PosOrderStatus, { label: string; tone: string }> = {
  pending: { label: 'New', tone: 'progress' },
  accepted: { label: 'Accepted', tone: 'progress' },
  preparing: { label: 'In Progress', tone: 'progress' },
  ready: { label: 'Ready', tone: 'ready' },
  served: { label: 'Served', tone: 'ready' },
  waiting_payment: { label: 'Waiting Payment', tone: 'done' },
  paid: { label: 'Completed', tone: 'done' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function toAdminDishes(menuItems?: PosMenuItem[]): AdminDish[] {
  if (!menuItems?.length) return fallbackDishes;

  return menuItems.map((item) => ({
    id: item.id,
    category: item.category,
    name: item.name,
    desc: item.description,
    price: formatRupiah(item.price),
    oldPrice: item.oldPrice ? formatRupiah(item.oldPrice) : undefined,
    qty: 0,
    badge: item.badge ?? (item.isBestSeller ? 'Best Seller' : undefined),
    badgeTone: item.badge?.toLowerCase().includes('disc') ? 'discount' : 'popular',
    image: item.imageUrl,
    isAvailable: item.isAvailable,
    soldToday: item.soldToday,
  }));
}

export function toAdminOrders(orders?: PosOrder[]): AdminOrder[] {
  if (!orders?.length) return fallbackOrders;

  return orders.map((order) => {
    const status = orderStatusLabel[order.status];
    const table = order.tableCode ?? 'TA';

    return {
      id: order.id,
      table,
      tableCode: order.tableCode,
      tone: order.type === 'takeaway' ? 'gold' : 'teal',
      name: order.customerName,
      meta: `Order #${order.orderNumber} / ${order.type === 'takeaway' ? 'Takeaway' : 'Dine In'}`,
      status: status.label,
      statusTone: status.tone,
      time: formatTime(order.createdAt),
      total: formatRupiah(order.total),
      more: order.items.length > 3 ? `+${order.items.length - 3} more` : undefined,
      items: order.items.map((item) => [item.name, String(item.quantity), formatRupiah(item.lineTotal)]),
      rawStatus: order.status,
      source: order.source,
      type: order.type,
      guests: order.guests,
    };
  });
}

export function getAdminRuntimeData(snapshot: PosSnapshot | null) {
  return {
    dishes: toAdminDishes(snapshot?.menuItems),
    orders: toAdminOrders(snapshot?.orders),
    tables: toAdminTables(snapshot?.tables, snapshot?.orders),
    dashboard: snapshot?.dashboard,
  };
}

export function toAdminTables(tables?: PosTable[], orders?: PosOrder[]): AdminTable[] {
  if (!tables?.length) return [];

  const orderById = new Map((orders ?? []).map((order) => [order.id, order]));

  return tables.map((table) => {
    const order = table.currentOrderId ? orderById.get(table.currentOrderId) : null;
    const label = table.status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

    return {
      id: table.id,
      code: table.code,
      name: table.name,
      area: table.area,
      status: label,
      seats: table.seats,
      scans: table.scansToday,
      lastOrder: order ? `Order #${order.orderNumber} - ${orderStatusLabel[order.status].label}` : 'No active order',
      tone: table.status === 'need_waiter' ? 'call' : table.status === 'waiting_payment' ? 'payment' : table.status,
    };
  });
}

export function getDashboardStats(dashboard?: PosDashboard) {
  return {
    revenue: dashboard ? formatRupiah(dashboard.revenueToday) : 'Rp 6.12M',
    activeOrders: dashboard?.activeOrders ?? 24,
    qrOrders: dashboard?.qrOrders ?? 142,
    needAction: dashboard?.needAction ?? 7,
    waitingPayment: dashboard?.waitingPayment ?? 8,
    paidToday: dashboard?.paidToday ?? 42,
  };
}
