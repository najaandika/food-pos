import { randomUUID } from 'crypto';
import { prisma } from './prisma';
import type {
  PosCategory,
  PosDashboard,
  PosMenuItem,
  PosOrder,
  PosOrderItem,
  PosOrderStatus,
  PosReport,
  PosSettings,
  PosSnapshot,
  PosStaff,
  PosTable,
  PosTableStatus,
  UserRole,
} from './pos-types';

const toNumber = (value: unknown) => Number(value ?? 0);
const toId = (value: bigint | number) => Number(value);
const toBigInt = (value: number) => BigInt(value);

const activeStatuses: PosOrderStatus[] = ['pending', 'accepted', 'preparing', 'ready', 'served', 'waiting_payment'];

const tableStatusByOrderStatus: Partial<Record<PosOrderStatus, PosTableStatus>> = {
  pending: 'occupied',
  accepted: 'occupied',
  preparing: 'preparing',
  ready: 'ready',
  served: 'occupied',
  waiting_payment: 'waiting_payment',
};

export const defaultSettings: PosSettings = {
  profile: {
    cafeName: 'Cafe Bloc Barat',
    phone: '+62 812-0000-0000',
    address: 'Krui, Pesisir Barat, Lampung',
  },
  tax: {
    taxRate: 5,
    serviceRate: 0,
    currency: 'IDR',
  },
  payments: {
    cash: true,
    qris: true,
    transfer: false,
  },
  qrOptions: {
    guestOrdering: true,
    customerName: true,
    callWaiter: true,
    autoAcceptQr: false,
  },
  hours: [
    { label: 'Monday - Thursday', open: '09:00', close: '22:00', isOpen: true },
    { label: 'Friday', open: '08:00', close: '23:00', isOpen: true },
    { label: 'Saturday - Sunday', open: '08:00', close: '23:00', isOpen: true },
  ],
};

const todayStart = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const dayKey = (date: Date) => date.toISOString().slice(0, 10);

function parseReportDate(value: string | null, fallback: Date) {
  if (!value) return fallback;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function reportRange(from?: string | null, to?: string | null) {
  const end = todayStart();
  const start = new Date(end);
  start.setDate(start.getDate() - 6);

  const fromDate = parseReportDate(from ?? null, start);
  const toDate = parseReportDate(to ?? null, end);
  toDate.setHours(23, 59, 59, 999);

  return fromDate <= toDate ? { fromDate, toDate } : { fromDate: start, toDate: end };
}

export type MenuItemPayload = {
  name: string;
  category: string;
  description?: string;
  price: number;
  oldPrice?: number | null;
  imageUrl?: string;
  isAvailable?: boolean;
  isBestSeller?: boolean;
  badge?: string | null;
};

export type TablePayload = {
  code: string;
  name: string;
  area: string;
  seats: number;
  status: PosTableStatus;
};

export type StaffPayload = {
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  isActive: boolean;
};

async function resolveCategoryId(categoryName: string) {
  const name = categoryName.trim() || 'Coffee';
  const existingCategory = await prisma.category.findUnique({ where: { name } });

  if (existingCategory) return existingCategory.id;

  const lastCategory = await prisma.category.findFirst({
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  const category = await prisma.category.create({
    data: {
      name,
      sortOrder: (lastCategory?.sortOrder ?? 0) + 1,
      isActive: true,
    },
  });

  return category.id;
}

function normalizeOrderItems(items: Array<{ menuItemId: number; quantity: number; notes?: string }>) {
  return items
    .map((item) => ({
      menuItemId: Number(item.menuItemId),
      quantity: Math.max(0, Math.floor(Number(item.quantity ?? 0))),
      notes: item.notes?.trim() || undefined,
    }))
    .filter((item) => Number.isFinite(item.menuItemId) && item.menuItemId > 0 && item.quantity > 0);
}

function clampRate(value: unknown) {
  const rate = Number(value);
  if (!Number.isFinite(rate)) return 0;
  return Math.min(100, Math.max(0, rate));
}

function normalizeSettings(value: unknown): PosSettings {
  const input = value && typeof value === 'object' ? value as Partial<PosSettings> : {};
  const payments = {
    cash: input.payments?.cash !== false,
    qris: input.payments?.qris !== false,
    transfer: Boolean(input.payments?.transfer),
  };

  if (!payments.cash && !payments.qris && !payments.transfer) {
    payments.cash = true;
  }

  return {
    profile: {
      cafeName: String(input.profile?.cafeName ?? defaultSettings.profile.cafeName).trim() || defaultSettings.profile.cafeName,
      phone: String(input.profile?.phone ?? defaultSettings.profile.phone).trim(),
      address: String(input.profile?.address ?? defaultSettings.profile.address).trim(),
    },
    tax: {
      taxRate: clampRate(input.tax?.taxRate ?? defaultSettings.tax.taxRate),
      serviceRate: clampRate(input.tax?.serviceRate ?? defaultSettings.tax.serviceRate),
      currency: input.tax?.currency === 'USD' ? 'USD' : 'IDR',
    },
    payments,
    qrOptions: {
      guestOrdering: input.qrOptions?.guestOrdering !== false,
      customerName: input.qrOptions?.customerName !== false,
      callWaiter: input.qrOptions?.callWaiter !== false,
      autoAcceptQr: Boolean(input.qrOptions?.autoAcceptQr),
    },
    hours: Array.isArray(input.hours) && input.hours.length
      ? input.hours.map((hour, index) => ({
          label: String(hour.label ?? defaultSettings.hours[index]?.label ?? 'Business Hours').trim(),
          open: String(hour.open ?? '09:00').trim(),
          close: String(hour.close ?? '22:00').trim(),
          isOpen: hour.isOpen !== false,
        }))
      : defaultSettings.hours,
  };
}

function calculateOrderTotal(subtotal: number, settings: PosSettings) {
  const tax = Math.round(subtotal * (settings.tax.taxRate / 100));
  const serviceCharge = Math.round(subtotal * (settings.tax.serviceRate / 100));
  const total = subtotal + tax + serviceCharge;

  return { tax, serviceCharge, total };
}

export async function getSettings(): Promise<PosSettings> {
  const setting = await prisma.appSetting.findUnique({ where: { key: 'cafe' } });
  if (!setting) return defaultSettings;

  return normalizeSettings(setting.value);
}

export async function updateSettings(input: unknown): Promise<PosSettings> {
  const settings = normalizeSettings(input);

  await prisma.appSetting.upsert({
    where: { key: 'cafe' },
    create: { key: 'cafe', value: settings },
    update: { value: settings },
  });

  return settings;
}

export async function getCategories(): Promise<PosCategory[]> {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  return categories.map((category) => ({
    id: toId(category.id),
    name: category.name,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
  }));
}

export async function getMenuItems({ includeHidden = true } = {}): Promise<PosMenuItem[]> {
  const menuItems = await prisma.menuItem.findMany({
    include: { category: true },
    orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    where: includeHidden ? undefined : { isAvailable: true, category: { isActive: true } },
  });

  const soldToday = await prisma.orderItem.groupBy({
    by: ['menuItemId'],
    where: {
      order: {
        createdAt: { gte: todayStart() },
        status: { not: 'cancelled' },
      },
    },
    _sum: { quantity: true },
  });
  const soldByItemId = new Map(soldToday.map((row) => [toId(row.menuItemId), row._sum.quantity ?? 0]));

  return menuItems.map((item) => ({
    id: toId(item.id),
    categoryId: toId(item.categoryId),
    category: item.category.name,
    name: item.name,
    description: item.description ?? '',
    price: toNumber(item.price),
    oldPrice: item.oldPrice === null ? null : toNumber(item.oldPrice),
    imageUrl: item.imageUrl ?? '',
    isAvailable: item.isAvailable,
    isBestSeller: item.isBestSeller,
    badge: item.badge,
    soldToday: soldByItemId.get(toId(item.id)) ?? 0,
  }));
}

export async function getOrders(): Promise<PosOrder[]> {
  const orders = await prisma.order.findMany({
    include: {
      table: true,
      items: {
        include: { menuItem: true },
        orderBy: { id: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 80,
  });

  return orders.map((order) => ({
    id: toId(order.id),
    orderNumber: order.orderNumber,
    tableCode: order.table?.code ?? null,
    customerName: order.customerName,
    type: order.type,
    status: order.status,
    source: order.source,
    guests: order.guests,
    subtotal: toNumber(order.subtotal),
    tax: toNumber(order.tax),
    serviceCharge: toNumber(order.serviceCharge),
    total: toNumber(order.total),
    notes: order.notes,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map<PosOrderItem>((item) => ({
      id: toId(item.id),
      menuItemId: toId(item.menuItemId),
      name: item.menuItem.name,
      quantity: item.quantity,
      unitPrice: toNumber(item.unitPrice),
      lineTotal: toNumber(item.unitPrice) * item.quantity,
      notes: item.notes,
    })),
  }));
}

export async function getPublicOrder(orderId: number) {
  const order = await prisma.order.findUnique({
    where: { id: toBigInt(orderId) },
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      status: true,
      source: true,
      total: true,
      createdAt: true,
      table: {
        select: {
          code: true,
        },
      },
      items: {
        select: {
          quantity: true,
          menuItem: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!order) return null;

  return {
    id: toId(order.id),
    orderNumber: order.orderNumber,
    tableCode: order.table?.code ?? null,
    customerName: order.customerName,
    status: order.status,
    source: order.source,
    total: toNumber(order.total),
    createdAt: order.createdAt.toISOString(),
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    items: order.items.map((item) => ({
      name: item.menuItem.name,
      quantity: item.quantity,
    })),
  };
}

export async function getTables(): Promise<PosTable[]> {
  const tables = await prisma.table.findMany({
    orderBy: [{ area: 'asc' }, { code: 'asc' }],
  });

  return tables.map((table) => ({
    id: toId(table.id),
    code: table.code,
    name: table.name,
    area: table.area,
    seats: table.seats,
    status: table.status,
    qrToken: table.qrToken,
    scansToday: table.scansToday,
    currentOrderId: table.currentOrderId ? toId(table.currentOrderId) : null,
  }));
}

export async function getStaff(): Promise<PosStaff[]> {
  const staff = await prisma.user.findMany({
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });

  return staff.map((user) => ({
    id: toId(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }));
}

export async function createStaff(input: StaffPayload) {
  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      passwordHash: input.password?.trim() || 'blocbarat',
      role: input.role,
      isActive: input.isActive,
    },
  });

  return { id: toId(user.id) };
}

export async function updateStaff(userId: number, input: StaffPayload) {
  await prisma.user.update({
    where: { id: toBigInt(userId) },
    data: {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      role: input.role,
      isActive: input.isActive,
      ...(input.password?.trim() ? { passwordHash: input.password.trim() } : {}),
    },
  });
}

export async function disableStaff(userId: number) {
  await prisma.user.update({
    where: { id: toBigInt(userId) },
    data: { isActive: false },
  });

  return { disabled: true };
}

function createQrToken(code: string) {
  return `${code.toLowerCase()}-${randomUUID().slice(0, 12)}`;
}

export async function createTable(input: TablePayload) {
  const code = input.code.trim().toUpperCase();
  const table = await prisma.table.create({
    data: {
      code,
      name: input.name.trim(),
      area: input.area.trim() || 'Indoor',
      seats: input.seats,
      status: input.status,
      qrToken: createQrToken(code),
    },
  });

  return { id: toId(table.id) };
}

export async function updateTable(tableId: number, input: TablePayload) {
  const code = input.code.trim().toUpperCase();
  await prisma.table.update({
    where: { id: toBigInt(tableId) },
    data: {
      code,
      name: input.name.trim(),
      area: input.area.trim() || 'Indoor',
      seats: input.seats,
      status: input.status,
    },
  });
}

export async function deleteTable(tableId: number) {
  const id = toBigInt(tableId);
  const orderCount = await prisma.order.count({ where: { tableId: id } });

  if (orderCount > 0) {
    await prisma.table.update({
      where: { id },
      data: {
        status: 'inactive',
        currentOrderId: null,
      },
    });

    return { deleted: false, archived: true };
  }

  await prisma.table.delete({ where: { id } });
  return { deleted: true, archived: false };
}

export async function getDashboard(): Promise<PosDashboard> {
  const start = todayStart();
  const [paidToday, activeOrders, qrOrders, needAction, waitingPayment, revenue] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: start }, status: 'paid' } }),
    prisma.order.count({ where: { status: { notIn: ['paid', 'cancelled'] } } }),
    prisma.order.count({ where: { createdAt: { gte: start }, source: 'qr' } }),
    prisma.order.count({ where: { status: { in: ['pending', 'ready', 'waiting_payment'] } } }),
    prisma.order.count({ where: { status: 'waiting_payment' } }),
    prisma.order.aggregate({
      where: { createdAt: { gte: start }, status: 'paid' },
      _sum: { total: true },
    }),
  ]);

  return {
    revenueToday: toNumber(revenue._sum.total),
    paidToday,
    activeOrders,
    qrOrders,
    needAction,
    waitingPayment,
  };
}

export async function getReport({ from, to }: { from?: string | null; to?: string | null } = {}): Promise<PosReport> {
  const { fromDate, toDate } = reportRange(from, to);
  const previousFrom = new Date(fromDate);
  const rangeLength = Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / 86_400_000));
  previousFrom.setDate(previousFrom.getDate() - rangeLength);
  const previousTo = new Date(fromDate);
  previousTo.setMilliseconds(previousTo.getMilliseconds() - 1);

  const [orders, previousItems] = await Promise.all([
    prisma.order.findMany({
      where: {
        createdAt: { gte: fromDate, lte: toDate },
        status: { not: 'cancelled' },
      },
      include: {
        table: true,
        items: {
          include: {
            menuItem: {
              include: { category: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: previousFrom, lte: previousTo },
          status: { not: 'cancelled' },
        },
      },
      include: {
        menuItem: {
          include: { category: true },
        },
      },
    }),
  ]);

  const categoryTotals = new Map<string, number>();
  const previousCategoryTotals = new Map<string, number>();
  const trafficByDay = new Map<string, { label: string; qr: number; dineIn: number }>();
  const rangeCursor = new Date(fromDate);
  rangeCursor.setHours(0, 0, 0, 0);

  while (rangeCursor <= toDate) {
    trafficByDay.set(dayKey(rangeCursor), {
      label: new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short' }).format(rangeCursor),
      qr: 0,
      dineIn: 0,
    });
    rangeCursor.setDate(rangeCursor.getDate() + 1);
  }

  let menuSold = 0;
  let revenue = 0;

  for (const order of orders) {
    if (order.status === 'paid') revenue += toNumber(order.total);
    const key = dayKey(order.createdAt);
    const traffic = trafficByDay.get(key);
    if (traffic) {
      if (order.source === 'qr') traffic.qr += 1;
      if (order.type === 'dine_in') traffic.dineIn += 1;
    }

    for (const item of order.items) {
      menuSold += item.quantity;
      const categoryName = item.menuItem.category.name;
      categoryTotals.set(categoryName, (categoryTotals.get(categoryName) ?? 0) + item.quantity);
    }
  }

  for (const item of previousItems) {
    const categoryName = item.menuItem.category.name;
    previousCategoryTotals.set(categoryName, (previousCategoryTotals.get(categoryName) ?? 0) + item.quantity);
  }

  const categorySales = Array.from(categoryTotals.entries())
    .map(([name, quantity]) => {
      const previousQuantity = previousCategoryTotals.get(name) ?? 0;
      const growth = previousQuantity === 0 ? (quantity > 0 ? 100 : 0) : Math.round(((quantity - previousQuantity) / previousQuantity) * 1000) / 10;
      return { name, quantity, growth };
    })
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return {
    range: {
      from: dayKey(fromDate),
      to: dayKey(toDate),
    },
    summary: {
      revenue,
      totalOrders: orders.length,
      qrOrders: orders.filter((order) => order.source === 'qr').length,
      menuSold,
      waitingPayment: orders.filter((order) => order.status === 'waiting_payment').length,
    },
    traffic: Array.from(trafficByDay.values()).slice(-10),
    categorySales,
    serviceChannels: {
      qr: orders.filter((order) => order.source === 'qr').length,
      manual: orders.filter((order) => order.source === 'manual').length,
      dineIn: orders.filter((order) => order.type === 'dine_in').length,
      takeaway: orders.filter((order) => order.type === 'takeaway').length,
    },
    recentOrders: orders.slice(0, 6).map((order) => ({
      id: toId(order.id),
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      tableCode: order.table?.code ?? null,
      total: toNumber(order.total),
      status: order.status,
      createdAt: order.createdAt.toISOString(),
    })),
  };
}

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

export async function updateOrderStatus(orderId: number, status: PosOrderStatus) {
  const id = toBigInt(orderId);
  const order = await prisma.order.update({
    where: { id },
    data: { status },
    select: { id: true, tableId: true },
  });

  if (!order.tableId) return;

  if (status === 'paid' || status === 'cancelled') {
    await prisma.table.update({
      where: { id: order.tableId },
      data: { status: 'available', currentOrderId: null },
    });
    return;
  }

  const tableStatus = tableStatusByOrderStatus[status];
  if (tableStatus) {
    await prisma.table.update({
      where: { id: order.tableId },
      data: { status: tableStatus, currentOrderId: activeStatuses.includes(status) ? order.id : null },
    });
  }
}

export async function markOrderPaid(orderId: number, method: 'cash' | 'qris' | 'transfer' | 'card' = 'cash') {
  const settings = await getSettings();
  const paymentMethod = method === 'card' ? 'transfer' : method;

  if (!settings.payments[paymentMethod]) {
    throw new Error('Payment method is disabled');
  }

  const order = await prisma.order.findUnique({
    select: { total: true, status: true },
    where: { id: toBigInt(orderId) },
  });

  if (!order) throw new Error('Order not found');
  if (order.status === 'paid') throw new Error('Order already paid');
  if (order.status === 'cancelled') throw new Error('Cancelled order cannot be paid');

  await prisma.payment.create({
    data: {
      orderId: toBigInt(orderId),
      method: paymentMethod,
      amount: order.total,
      status: 'paid',
      paidAt: new Date(),
    },
  });
  await updateOrderStatus(orderId, 'paid');
}

export async function updateMenuItemAvailability(menuItemId: number, isAvailable: boolean) {
  await prisma.menuItem.update({
    where: { id: toBigInt(menuItemId) },
    data: { isAvailable },
  });
}

export async function createMenuItem(input: MenuItemPayload) {
  const categoryId = await resolveCategoryId(input.category);
  const menuItem = await prisma.menuItem.create({
    data: {
      categoryId,
      name: input.name.trim(),
      description: input.description?.trim() ?? '',
      price: input.price,
      oldPrice: input.oldPrice ?? null,
      imageUrl: input.imageUrl?.trim() ?? '',
      isAvailable: input.isAvailable ?? true,
      isBestSeller: input.isBestSeller ?? false,
      badge: input.badge?.trim() || null,
    },
  });

  return { id: toId(menuItem.id) };
}

export async function updateMenuItem(menuItemId: number, input: MenuItemPayload) {
  const categoryId = await resolveCategoryId(input.category);
  await prisma.menuItem.update({
    where: { id: toBigInt(menuItemId) },
    data: {
      categoryId,
      name: input.name.trim(),
      description: input.description?.trim() ?? '',
      price: input.price,
      oldPrice: input.oldPrice ?? null,
      imageUrl: input.imageUrl?.trim() ?? '',
      isAvailable: input.isAvailable ?? true,
      isBestSeller: input.isBestSeller ?? false,
      badge: input.badge?.trim() || null,
    },
  });
}

export async function deleteMenuItem(menuItemId: number) {
  const id = toBigInt(menuItemId);
  const orderItemCount = await prisma.orderItem.count({ where: { menuItemId: id } });

  if (orderItemCount > 0) {
    await prisma.menuItem.update({
      where: { id },
      data: {
        isAvailable: false,
      },
    });

    return { deleted: false, archived: true };
  }

  await prisma.menuItem.delete({ where: { id } });
  return { deleted: true, archived: false };
}

export async function createCustomerOrder(input: {
  tableCode: string;
  customerName: string;
  notes?: string;
  items: Array<{ menuItemId: number; quantity: number; notes?: string }>;
}) {
  return prisma.$transaction(async (tx) => {
    const orderItems = normalizeOrderItems(input.items);
    const table = await tx.table.findUnique({ where: { code: input.tableCode.toUpperCase() } });
    if (!table) throw new Error('Table not found');
    if (orderItems.length === 0) throw new Error('Order needs at least one item');
    const settings = await getSettings();
    if (!settings.qrOptions.guestOrdering) throw new Error('QR ordering is currently paused');
    if (settings.qrOptions.customerName && !input.customerName.trim()) throw new Error('Customer name is required');

    const menuItems = await tx.menuItem.findMany({
      where: {
        id: { in: orderItems.map((item) => toBigInt(item.menuItemId)) },
        isAvailable: true,
      },
    });
    const priceById = new Map(menuItems.map((item) => [toId(item.id), toNumber(item.price)]));
    if (priceById.size !== orderItems.length) throw new Error('Some menu items are unavailable');

    const subtotal = orderItems.reduce((total, item) => total + (priceById.get(item.menuItemId) ?? 0) * item.quantity, 0);
    const { tax, serviceCharge, total } = calculateOrderTotal(subtotal, settings);
    const orderNumber = `BB-${input.tableCode.toUpperCase()}-${Date.now().toString().slice(-6)}`;

    const order = await tx.order.create({
      data: {
        orderNumber,
        tableId: table.id,
        customerName: input.customerName,
        type: 'dine_in',
        status: settings.qrOptions.autoAcceptQr ? 'accepted' : 'pending',
        source: 'qr',
        guests: 1,
        subtotal,
        tax,
        serviceCharge,
        total,
        notes: input.notes ?? null,
      },
    });

    await tx.orderItem.createMany({
      data: orderItems.map((item) => {
        const unitPrice = priceById.get(item.menuItemId);
        if (!unitPrice) throw new Error('Menu item unavailable');

        return {
          orderId: order.id,
          menuItemId: toBigInt(item.menuItemId),
          quantity: item.quantity,
          unitPrice,
          notes: item.notes ?? null,
        };
      }),
    });

    await tx.table.update({
      where: { id: table.id },
      data: { status: settings.qrOptions.autoAcceptQr ? 'occupied' : 'occupied', currentOrderId: order.id },
    });

    return { id: toId(order.id), orderNumber };
  });
}

export async function createManualOrder(input: {
  tableCode?: string | null;
  customerName: string;
  type: 'dine_in' | 'takeaway';
  guests?: number;
  notes?: string;
  items: Array<{ menuItemId: number; quantity: number; notes?: string }>;
}) {
  return prisma.$transaction(async (tx) => {
    const orderItems = normalizeOrderItems(input.items);
    if (orderItems.length === 0) throw new Error('Order needs at least one item');
    const settings = await getSettings();

    const table = input.type === 'dine_in' && input.tableCode
      ? await tx.table.findUnique({ where: { code: input.tableCode.toUpperCase() } })
      : null;
    if (input.type === 'dine_in' && input.tableCode && !table) throw new Error('Table not found');

    const menuItems = await tx.menuItem.findMany({
      where: {
        id: { in: orderItems.map((item) => toBigInt(item.menuItemId)) },
        isAvailable: true,
      },
    });
    const priceById = new Map(menuItems.map((item) => [toId(item.id), toNumber(item.price)]));
    if (priceById.size !== orderItems.length) throw new Error('Some menu items are unavailable');

    const subtotal = orderItems.reduce((total, item) => total + (priceById.get(item.menuItemId) ?? 0) * item.quantity, 0);
    const { tax, serviceCharge, total } = calculateOrderTotal(subtotal, settings);
    const orderNumber = `BB-${input.type === 'takeaway' ? 'TA' : table?.code ?? 'POS'}-${Date.now().toString().slice(-6)}`;

    const order = await tx.order.create({
      data: {
        orderNumber,
        tableId: table?.id ?? null,
        customerName: input.customerName,
        type: input.type,
        status: 'accepted',
        source: 'manual',
        guests: input.guests ?? 1,
        subtotal,
        tax,
        serviceCharge,
        total,
        notes: input.notes ?? null,
      },
    });

    await tx.orderItem.createMany({
      data: orderItems.map((item) => {
        const unitPrice = priceById.get(item.menuItemId);
        if (!unitPrice) throw new Error('Menu item unavailable');

        return {
          orderId: order.id,
          menuItemId: toBigInt(item.menuItemId),
          quantity: item.quantity,
          unitPrice,
          notes: item.notes ?? null,
        };
      }),
    });

    if (table) {
      await tx.table.update({
        where: { id: table.id },
        data: { status: 'occupied', currentOrderId: order.id },
      });
    }

    return { id: toId(order.id), orderNumber };
  });
}
