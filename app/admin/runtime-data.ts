import type {
  PosDashboard,
  PosMenuItem,
  PosOrder,
  PosOrderStatus,
  PosSnapshot,
  PosStaff,
  PosTable,
  PosTableStatus,
  UserRole,
} from '../../lib/pos-types';
import { formatRupiah } from '../lib/format';
import { dishes as fallbackDishes, orders as fallbackOrders } from './data';

export type AdminDish = {
  id?: number | undefined;
  categoryId?: number | undefined;
  name: string;
  desc: string;
  price: string;
  oldPrice?: string | undefined;
  rawPrice?: number | undefined;
  rawOldPrice?: number | null | undefined;
  qty: number;
  badge?: string | null | undefined;
  badgeTone?: string | undefined;
  image: string;
  category?: string | undefined;
  isAvailable?: boolean | undefined;
  isBestSeller?: boolean | undefined;
  soldToday?: number | undefined;
};

export type AdminOrder = {
  id?: number | undefined;
  table: string;
  tone: string;
  name: string;
  orderNumber?: string | undefined;
  meta: string;
  status: string;
  statusTone: string;
  time: string;
  total: string;
  rawSubtotal?: number | undefined;
  rawTax?: number | undefined;
  rawServiceCharge?: number | undefined;
  rawTotal?: number | undefined;
  more?: string | undefined;
  items: string[][];
  rawStatus?: PosOrderStatus | undefined;
  source?: PosOrder['source'] | undefined;
  type?: PosOrder['type'] | undefined;
  tableCode?: string | null | undefined;
  guests?: number | undefined;
  notes?: string | null | undefined;
  paymentMethod?: string | undefined;
};

export type AdminTable = {
  id?: number | undefined;
  code: string;
  name: string;
  area: string;
  status: string;
  rawStatus?: PosTableStatus | undefined;
  seats: number;
  scans: number;
  lastOrder: string;
  tone: string;
  qrToken?: string | undefined;
  currentOrderId?: number | null | undefined;
};

export type AdminStaff = {
  id?: number | undefined;
  name: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  status: string;
  isActive: boolean;
  shift: string;
  activity: string;
  area: string;
  avatar: string;
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

const roleLabel: Record<UserRole, string> = {
  owner: 'Owner',
  kasir: 'Kasir',
  waiters: 'Waiters',
};

const roleArea: Record<UserRole, string> = {
  owner: 'Full access',
  kasir: 'Cashier desk',
  waiters: 'Floor service',
};

const roleAvatar: Record<UserRole, string> = {
  owner: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=160&q=80',
  kasir: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80',
  waiters: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80',
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function formatActivity(value: string) {
  return new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function toAdminDishes(menuItems?: PosMenuItem[]): AdminDish[] {
  if (!menuItems) return fallbackDishes;
  if (!menuItems.length) return [];

  return menuItems.map((item) => ({
    id: item.id,
    category: item.category,
    name: item.name,
    desc: item.description,
    price: formatRupiah(item.price),
    oldPrice: item.oldPrice ? formatRupiah(item.oldPrice) : undefined,
    rawPrice: item.price,
    rawOldPrice: item.oldPrice,
    categoryId: item.categoryId,
    qty: 0,
    badge: item.badge ?? (item.isBestSeller ? 'Best Seller' : undefined),
    badgeTone: item.badge?.toLowerCase().includes('disc') ? 'discount' : 'popular',
    image: item.imageUrl,
    isAvailable: item.isAvailable,
    isBestSeller: item.isBestSeller,
    soldToday: item.soldToday,
  }));
}

export function toAdminOrders(orders?: PosOrder[]): AdminOrder[] {
  if (!orders) return fallbackOrders;
  if (!orders.length) return [];

  return orders.map((order) => {
    const status = orderStatusLabel[order.status];
    const table = order.tableCode ?? 'TA';

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      table,
      tableCode: order.tableCode,
      tone: order.type === 'takeaway' ? 'gold' : 'teal',
      name: order.customerName,
      meta: `Order #${order.orderNumber} / ${order.type === 'takeaway' ? 'Takeaway' : 'Dine In'}`,
      status: status.label,
      statusTone: status.tone,
      time: formatTime(order.createdAt),
      total: formatRupiah(order.total),
      rawSubtotal: order.subtotal,
      rawTax: order.tax,
      rawServiceCharge: order.serviceCharge,
      rawTotal: order.total,
      more: order.items.length > 3 ? `+${order.items.length - 3} more` : undefined,
      items: order.items.map((item) => [item.name, String(item.quantity), formatRupiah(item.lineTotal)]),
      rawStatus: order.status,
      source: order.source,
      type: order.type,
      guests: order.guests,
      notes: order.notes,
      paymentMethod: (order as unknown as { paymentMethod?: string }).paymentMethod ?? 'cash',
    };
  });
}

export function getAdminRuntimeData(snapshot: PosSnapshot | null) {
  return {
    dishes: toAdminDishes(snapshot?.menuItems),
    orders: toAdminOrders(snapshot?.orders),
    tables: toAdminTables(snapshot?.tables, snapshot?.orders),
    staff: toAdminStaff(snapshot?.staff),
    dashboard: snapshot?.dashboard,
    settings: snapshot?.settings,
  };
}

export function toAdminStaff(staff?: PosStaff[]): AdminStaff[] {
  if (!staff?.length) return [];

  return staff.map((person) => ({
    id: person.id,
    name: person.name,
    email: person.email,
    role: person.role,
    roleLabel: roleLabel[person.role],
    status: person.isActive ? 'Active' : 'Inactive',
    isActive: person.isActive,
    shift: person.role === 'owner' ? 'All access' : 'Evening',
    activity: formatActivity(person.updatedAt),
    area: roleArea[person.role],
    avatar: roleAvatar[person.role],
  }));
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
      rawStatus: table.status,
      seats: table.seats,
      scans: table.scansToday,
      lastOrder: order ? `Order #${order.orderNumber} - ${orderStatusLabel[order.status].label}` : 'No active order',
      tone: table.status === 'need_waiter' ? 'call' : table.status === 'waiting_payment' ? 'payment' : table.status,
      qrToken: table.qrToken,
      currentOrderId: table.currentOrderId,
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
