import { prisma } from '../prisma';
import type { PosOrder, PosOrderItem, PosOrderStatus } from '../pos-types';
import { activeStatuses, calculateOrderTotal, dayKey, normalizeOrderItems, reportRange, tableStatusByOrderStatus, toBigInt, toId, toNumber, todayStart } from './helpers';
import { getSettings } from './settings';
import type { PosReport } from '../pos-types';

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
      table: { select: { code: true } },
      items: {
        select: {
          quantity: true,
          menuItem: { select: { name: true } },
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

    const table = input.type === 'dine_in' && input.tableCode ? await tx.table.findUnique({ where: { code: input.tableCode.toUpperCase() } }) : null;
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
    const orderNumber = `BB-${input.type === 'takeaway' ? 'TA' : (table?.code ?? 'POS')}-${Date.now().toString().slice(-6)}`;

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
