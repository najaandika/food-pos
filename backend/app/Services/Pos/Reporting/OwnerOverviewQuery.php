<?php

namespace App\Services\Pos\Reporting;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\MenuItem;
use App\Models\Order;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Read-only owner dashboard snapshot. All queries and the existing JSON
 * serialization stay together so the HTTP controller only handles responses.
 */
final class OwnerOverviewQuery
{
    private const RECENT_LIMIT = 100;

    private const OPEN_STATUSES = [
        'pending', 'accepted', 'preparing', 'ready', 'served', 'waiting_payment',
    ];

    private const PRIORITY_STATUSES = ['pending', 'ready', 'waiting_payment'];

    /** @return array<string, mixed> */
    public function snapshot(): array
    {
        $timezone = 'Asia/Jakarta';
        $today = CarbonImmutable::now($timezone)->startOfDay();
        $startUtc = $today->setTimezone('UTC')->format('Y-m-d H:i:s');
        $endUtc = $today->addDay()->setTimezone('UTC')->format('Y-m-d H:i:s');

        $status = $this->statusSummary();
        $todayOrders = $this->todayOrderCounts($startUtc, $endUtc);
        $payments = $this->paidPaymentSummary($startUtc, $endUtc);
        $topDishes = $this->topDishes($startUtc, $endUtc);
        $recentOrders = $this->recentOrders();
        $priorityOrders = $this->priorityOrders();
        $activeTables = $this->activeTables();

        return [
            'source' => 'database',
            'timezone' => $timezone,
            'date' => $today->toDateString(),
            'generatedAt' => CarbonImmutable::now('UTC')->toIso8601String(),
            'dashboard' => [
                'revenueToday' => $payments['revenueCents'] / 100,
                'paidToday' => $payments['count'],
                'activeOrders' => $status['active'],
                'qrOrders' => $todayOrders['qr'],
                'needAction' => $status['priority'],
                'waitingPayment' => $status['counts']['waiting_payment'],
            ],
            'statusCounts' => $status['counts'],
            'totalOrders' => $status['total'],
            'ordersToday' => $todayOrders['orders'],
            'recentLimit' => self::RECENT_LIMIT,
            'recentOrders' => $recentOrders,
            'priorityOrders' => $priorityOrders,
            'activeTableCount' => $activeTables['count'],
            'activeTableOrders' => $activeTables['orders'],
            'topDishes' => $topDishes,
        ];
    }

    /** @return array{counts: array<string, int>, total: int, active: int, priority: int} */
    private function statusSummary(): array
    {
        $statusRows = DB::table('orders')
            ->select('status')
            ->selectRaw('COUNT(*) as total')
            ->groupBy('status')
            ->get();

        $statusCounts = array_fill_keys(array_column(OrderStatus::cases(), 'value'), 0);
        foreach ($statusRows as $row) {
            if (array_key_exists($row->status, $statusCounts)) {
                $statusCounts[$row->status] = (int) $row->total;
            }
        }

        return [
            'counts' => $statusCounts,
            'total' => array_sum($statusCounts),
            'active' => array_sum(array_intersect_key(
                $statusCounts,
                array_flip(self::OPEN_STATUSES),
            )),
            'priority' => array_sum(array_intersect_key(
                $statusCounts,
                array_flip(self::PRIORITY_STATUSES),
            )),
        ];
    }

    /** @return array{qr: int, orders: int} */
    private function todayOrderCounts(string $startUtc, string $endUtc): array
    {
        $qrToday = DB::table('orders')
            ->where('source', 'qr')
            ->where('created_at', '>=', $startUtc)
            ->where('created_at', '<', $endUtc)
            ->count();

        $orderCountToday = DB::table('orders')
            ->where('created_at', '>=', $startUtc)
            ->where('created_at', '<', $endUtc)
            ->count();

        return ['qr' => $qrToday, 'orders' => $orderCountToday];
    }

    /** Return a fresh query each time; callers add different selected columns. */
    private function confirmedPayments(string $startUtc, string $endUtc): Builder
    {
        return DB::table('payments')
            ->where('status', PaymentStatus::Paid->value)
            ->whereNotNull('paid_at')
            ->where('paid_at', '>=', $startUtc)
            ->where('paid_at', '<', $endUtc);
    }

    /** @return array{revenueCents: int, count: int} */
    private function paidPaymentSummary(string $startUtc, string $endUtc): array
    {
        // Recognized revenue is based on confirmed payments, not order totals.
        // Preserve the per-payment cent rounding of the original controller.
        $revenueCents = 0;
        $paymentsToday = 0;
        foreach ($this->confirmedPayments($startUtc, $endUtc)->select('amount')->cursor() as $payment) {
            $amountCents = (int) round((float) $payment->amount * 100);
            if ($amountCents <= 0) {
                continue;
            }
            $revenueCents += $amountCents;
            $paymentsToday++;
        }

        return ['revenueCents' => $revenueCents, 'count' => $paymentsToday];
    }

    /** @return list<array<string, mixed>> */
    private function topDishes(string $startUtc, string $endUtc): array
    {
        $confirmedPaidOrderIds = $this->confirmedPayments($startUtc, $endUtc)
            ->select('order_id')
            ->distinct();

        // Distinct order IDs avoid multiplying sold quantities for split payments.
        $topSales = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.status', OrderStatus::Paid->value)
            ->whereIn('orders.id', $confirmedPaidOrderIds)
            ->select('order_items.menu_item_id')
            ->selectRaw('SUM(order_items.quantity) as sold_today')
            ->groupBy('order_items.menu_item_id')
            ->orderByDesc('sold_today')
            ->orderBy('order_items.menu_item_id')
            ->limit(5)
            ->get();

        $menuById = MenuItem::with('category')
            ->whereIn('id', $topSales->pluck('menu_item_id'))
            ->get()
            ->keyBy('id');

        return array_values($topSales->map(function ($row) use ($menuById): ?array {
            $item = $menuById->get($row->menu_item_id);
            if (! $item) {
                return null;
            }

            return [
                'id' => $item->id,
                'categoryId' => $item->category_id,
                'category' => $item->category->name ?? '',
                'name' => $item->name,
                'description' => $item->description ?? '',
                'price' => (float) $item->price,
                'oldPrice' => $item->old_price !== null ? (float) $item->old_price : null,
                'imageUrl' => $item->image_url ?? '',
                'isAvailable' => (bool) $item->is_available,
                'isBestSeller' => (bool) $item->is_best_seller,
                'badge' => $item->badge,
                'soldToday' => (int) $row->sold_today,
            ];
        })->filter()->values()->all());
    }

    /** @return list<array<string, mixed>> */
    private function recentOrders(): array
    {
        return array_values(Order::with(['table', 'items.menuItem'])
            ->orderByDesc('id')
            ->limit(self::RECENT_LIMIT)
            ->get()
            ->map(fn (Order $order): array => $this->orderData($order))
            ->all());
    }

    /** @return list<array<string, mixed>> */
    private function priorityOrders(): array
    {
        return array_values(Order::with(['table', 'items.menuItem'])
            ->whereIn('status', self::PRIORITY_STATUSES)
            ->orderByRaw("CASE status WHEN 'pending' THEN 0 WHEN 'ready' THEN 1 ELSE 2 END")
            ->orderBy('created_at')
            ->orderBy('id')
            ->limit(4)
            ->get()
            ->map(fn (Order $order): array => $this->orderData($order))
            ->all());
    }

    /** @return array{count: int, orders: list<array<string, mixed>>} */
    private function activeTables(): array
    {
        $activeTableQuery = DB::table('orders')
            ->whereNotNull('table_id')
            ->whereIn('status', self::OPEN_STATUSES);

        $activeTableCount = (clone $activeTableQuery)
            ->distinct()
            ->count('table_id');

        $activeTableOrderIds = (clone $activeTableQuery)
            ->selectRaw('MAX(id) as id')
            ->groupBy('table_id')
            ->orderByDesc('id')
            ->limit(5)
            ->pluck('id');

        $activeTableOrders = Order::with(['table', 'items.menuItem'])
            ->whereIn('id', $activeTableOrderIds)
            ->orderByDesc('id')
            ->get();

        return [
            'count' => $activeTableCount,
            'orders' => array_values($activeTableOrders->map(fn (Order $order): array => $this->orderData($order))->all()),
        ];
    }

    /** @return array<string, mixed> */
    private function orderData(Order $order): array
    {
        return [
            'id' => $order->id,
            'orderNumber' => $order->order_number,
            'tableCode' => $order->table?->code,
            'customerName' => $order->customer_name,
            'type' => $order->type->value,
            'status' => $order->status->value,
            'source' => $order->source->value,
            'guests' => $order->guests,
            'subtotal' => (float) $order->subtotal,
            'tax' => (float) $order->tax,
            'serviceCharge' => (float) $order->service_charge,
            'total' => (float) $order->total,
            'notes' => $order->notes,
            'createdAt' => CarbonImmutable::parse($order->created_at, 'UTC')->toIso8601String(),
            'updatedAt' => CarbonImmutable::parse($order->updated_at, 'UTC')->toIso8601String(),
            'items' => $order->items->map(fn ($item): array => [
                'id' => $item->id,
                'menuItemId' => $item->menu_item_id,
                'name' => $item->menuItem->name ?? 'Menu #'.$item->menu_item_id,
                'quantity' => (int) $item->quantity,
                'unitPrice' => (float) $item->unit_price,
                'lineTotal' => round((float) $item->unit_price * (int) $item->quantity, 2),
                'notes' => $item->notes,
            ])->all(),
        ];
    }
}
