export type UserRole = 'owner' | 'kasir' | 'waiters';

export type PosCategory = {
  id: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

export type PosMenuItem = {
  id: number;
  categoryId: number;
  category: string;
  name: string;
  description: string;
  price: number;
  oldPrice: number | null;
  imageUrl: string;
  isAvailable: boolean;
  isBestSeller: boolean;
  badge: string | null;
  soldToday: number;
};

export type PosOrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'served'
  | 'waiting_payment'
  | 'paid'
  | 'cancelled';

export type PosOrderType = 'dine_in' | 'takeaway';

export type PosOrderItem = {
  id: number;
  menuItemId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  notes: string | null;
};

export type PosOrder = {
  id: number;
  orderNumber: string;
  tableCode: string | null;
  customerName: string;
  type: PosOrderType;
  status: PosOrderStatus;
  source: 'qr' | 'manual';
  guests: number;
  subtotal: number;
  tax: number;
  serviceCharge: number;
  total: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: PosOrderItem[];
};

export type PosTableStatus = 'available' | 'occupied' | 'preparing' | 'ready' | 'waiting_payment' | 'need_waiter' | 'inactive';

export type PosTable = {
  id: number;
  code: string;
  name: string;
  area: string;
  seats: number;
  status: PosTableStatus;
  qrToken: string;
  scansToday: number;
  currentOrderId: number | null;
};

export type PosDashboard = {
  revenueToday: number;
  paidToday: number;
  activeOrders: number;
  qrOrders: number;
  needAction: number;
  waitingPayment: number;
};

export type PosSnapshot = {
  categories: PosCategory[];
  menuItems: PosMenuItem[];
  orders: PosOrder[];
  tables: PosTable[];
  dashboard: PosDashboard;
};
