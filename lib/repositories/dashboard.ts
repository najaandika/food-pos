import { prisma } from '../prisma';
import type { PosDashboard, PosReport } from '../pos-types';
import { dayKey, reportRange, toId, toNumber, todayStart } from './helpers';

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
      const growth =
        previousQuantity === 0 ? (quantity > 0 ? 100 : 0) : Math.round(((quantity - previousQuantity) / previousQuantity) * 1000) / 10;
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
