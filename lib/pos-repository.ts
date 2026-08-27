import { prisma } from './prisma';
import type {
  PosCategory,
  PosDashboard,
  PosMenuItem,
  PosOrder,
  PosOrderItem,
  PosOrderStatus,
  PosSnapshot,
  PosTable,
} from './pos-types';

const toNumber = (value: unknown) => Number(value ?? 0);
const toId = (value: bigint | number) => Number(value);
const toBigInt = (value: number) => BigInt(value);

const todayStart = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

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

export async function getSnapshot(): Promise<PosSnapshot> {
  const [categories, menuItems, orders, tables, dashboard] = await Promise.all([
    getCategories(),
    getMenuItems(),
    getOrders(),
    getTables(),
    getDashboard(),
  ]);

  return { categories, menuItems, orders, tables, dashboard };
}

export async function updateOrderStatus(orderId: number, status: PosOrderStatus) {
  await prisma.order.update({
    where: { id: toBigInt(orderId) },
    data: { status },
  });

  if (status === 'paid') {
    const order = await prisma.order.findUnique({
      select: { tableId: true },
      where: { id: toBigInt(orderId) },
    });

    if (order?.tableId) {
      await prisma.table.update({
        where: { id: order.tableId },
        data: { status: 'available', currentOrderId: null },
      });
    }
  }
}

export async function markOrderPaid(orderId: number, method: 'cash' | 'qris' | 'transfer' = 'cash') {
  const order = await prisma.order.findUnique({
    select: { total: true },
    where: { id: toBigInt(orderId) },
  });

  if (!order) throw new Error('Order not found');

  await prisma.payment.create({
    data: {
      orderId: toBigInt(orderId),
      method,
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

export async function createCustomerOrder(input: {
  tableCode: string;
  customerName: string;
  notes?: string;
  items: Array<{ menuItemId: number; quantity: number; notes?: string }>;
}) {
  return prisma.$transaction(async (tx) => {
    const table = await tx.table.findUnique({ where: { code: input.tableCode } });
    if (!table) throw new Error('Table not found');
    if (input.items.length === 0) throw new Error('Order needs at least one item');

    const menuItems = await tx.menuItem.findMany({
      where: {
        id: { in: input.items.map((item) => toBigInt(item.menuItemId)) },
        isAvailable: true,
      },
    });
    const priceById = new Map(menuItems.map((item) => [toId(item.id), toNumber(item.price)]));
    const subtotal = input.items.reduce((total, item) => total + (priceById.get(item.menuItemId) ?? 0) * item.quantity, 0);
    const tax = Math.round(subtotal * 0.05);
    const serviceCharge = 0;
    const total = subtotal + tax + serviceCharge;
    const orderNumber = `BB-${input.tableCode.toUpperCase()}-${Date.now().toString().slice(-6)}`;

    const order = await tx.order.create({
      data: {
        orderNumber,
        tableId: table.id,
        customerName: input.customerName,
        type: 'dine_in',
        status: 'pending',
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
      data: input.items.map((item) => {
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
      data: { status: 'occupied', currentOrderId: order.id },
    });

    return { id: toId(order.id), orderNumber };
  });
}
