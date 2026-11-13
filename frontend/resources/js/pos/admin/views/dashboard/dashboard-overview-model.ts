import type { AdminDish, AdminOrder } from '../../runtime-data';
import type { PosDashboard, PosOrderStatus } from '../../../../lib/pos-types';
import { resolveOrderStatus, statusOrder } from './order-status';

export type DashboardOverviewLiveInfo = {
    statusCounts: Record<PosOrderStatus, number>;
    priorityOrders: AdminOrder[];
    activeTableOrders: AdminOrder[];
};

export function deriveDashboardOverview(
    dashboard: PosDashboard | undefined,
    dishes: AdminDish[],
    orders: AdminOrder[],
    liveInfo?: DashboardOverviewLiveInfo,
) {
    // Live overview counts include the entire database, not the capped list.
    const hasSnapshot = dashboard !== undefined;
    const visibleOrders = hasSnapshot ? orders : [];
    const statusCounts = statusOrder.map((status) => ({
        status,
        count: liveInfo
            ? liveInfo.statusCounts[status]
            : visibleOrders.filter(
                  (order) => resolveOrderStatus(order) === status,
              ).length,
    }));
    const statusCount = (status: PosOrderStatus) =>
        statusCounts.find((item) => item.status === status)?.count ?? 0;
    const priority: Record<string, number> = {
        pending: 0,
        ready: 1,
        waiting_payment: 2,
    };
    const attentionAll = liveInfo
        ? liveInfo.priorityOrders
        : visibleOrders.filter(
              (order) =>
                  priority[resolveOrderStatus(order) ?? ''] !== undefined,
          );
    const attention = [...attentionAll]
        .sort(
            (a, b) =>
                (priority[resolveOrderStatus(a) ?? ''] ?? 9) -
                (priority[resolveOrderStatus(b) ?? ''] ?? 9),
        )
        .slice(0, 4);
    const topDishes = (hasSnapshot ? dishes : [])
        .filter((dish) => typeof dish.soldToday === 'number')
        .sort((a, b) => (b.soldToday ?? 0) - (a.soldToday ?? 0))
        .slice(0, 5);
    const topSales = topDishes.reduce(
        (sum, dish) => sum + (dish.soldToday ?? 0),
        0,
    );
    const maxDishSales = Math.max(
        1,
        ...topDishes.map((dish) => dish.soldToday ?? 0),
    );
    const allActiveTableOrders = liveInfo
        ? liveInfo.activeTableOrders
        : Array.from(
              new Map(
                  [...visibleOrders]
                      .reverse()
                      .filter(
                          (order) =>
                              order.tableCode &&
                              !['paid', 'cancelled'].includes(
                                  resolveOrderStatus(order) ?? '',
                              ),
                      )
                      .map((order) => [order.tableCode, order]),
              ).values(),
          );
    const tableOrders = allActiveTableOrders.slice(0, 5);
    return {
        hasSnapshot,
        visibleOrders,
        statusCounts,
        statusCount,
        attentionAll,
        attention,
        topDishes,
        topSales,
        maxDishSales,
        allActiveTableOrders,
        tableOrders,
    };
}
