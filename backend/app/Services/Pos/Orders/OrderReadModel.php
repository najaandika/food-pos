<?php

namespace App\Services\Pos\Orders;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\Payment;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * Read-only queries for orders, the cashier queue, and WIB daily statistics.
 * Payment mutations and the public service API remain in OrderManagementService.
 */
final class OrderReadModel
{
    /** @return LengthAwarePaginator<int, Order> */
    public function paginate(int $perPage): LengthAwarePaginator
    {
        return Order::query()
            ->with(['table', 'items.menuItem', 'payments'])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($perPage);
    }

    /** @return LengthAwarePaginator<int, Order> */
    public function cashierQueue(int $perPage, string $filter, string $search, bool $demoModeEnabled): LengthAwarePaginator
    {
        $query = Order::query()
            ->whereIn('status', [
                OrderStatus::Ready->value,
                OrderStatus::Served->value,
                OrderStatus::WaitingPayment->value,
            ]);

        if (! $demoModeEnabled) {
            $query->where('order_number', 'not like', 'DEMO-%');
        }

        if ($filter === 'ready') {
            $query->whereIn('status', [OrderStatus::Ready->value, OrderStatus::Served->value]);
        } elseif ($filter === 'qr') {
            $query->where('source', 'qr');
        } elseif ($filter === 'takeaway') {
            $query->where('type', 'takeaway');
        }

        if ($search !== '') {
            $query->where(function (Builder $q) use ($search): void {
                $q->where('customer_name', 'like', '%'.$search.'%')
                    ->orWhere('order_number', 'like', '%'.$search.'%')
                    ->orWhereHas('table', fn (Builder $table) => $table->where('code', 'like', '%'.$search.'%'));
            });
        }

        return $query->with(['table', 'items.menuItem'])
            ->orderBy('created_at')->orderBy('id')->paginate($perPage);
    }

    /** @return array<string, mixed> */
    public function cashierStats(bool $demoModeEnabled): array
    {
        $start = CarbonImmutable::now('Asia/Jakarta')->startOfDay()->setTimezone('UTC');
        $end = $start->addDay();
        $paid = Payment::query()
            ->whereHas('order', fn (Builder $order) => $order->where('order_number', 'not like', 'DEMO-%'))
            ->where('status', PaymentStatus::Paid->value)
            ->where('paid_at', '>=', $start->format('Y-m-d H:i:s'))
            ->where('paid_at', '<', $end->format('Y-m-d H:i:s'));

        return [
            'unpaidCount' => Order::query()->whereIn('status', [
                OrderStatus::Ready->value, OrderStatus::Served->value, OrderStatus::WaitingPayment->value,
            ])->where('order_number', 'not like', 'DEMO-%')->count(),
            'waitingCount' => Order::query()->where('status', OrderStatus::WaitingPayment->value)
                ->where('order_number', 'not like', 'DEMO-%')->count(),
            'demoUnpaidCount' => $demoModeEnabled ? Order::query()->whereIn('status', [
                OrderStatus::Ready->value, OrderStatus::Served->value, OrderStatus::WaitingPayment->value,
            ])->where('order_number', 'like', 'DEMO-%')->count() : 0,
            'demoWaitingCount' => $demoModeEnabled ? Order::query()->where('status', OrderStatus::WaitingPayment->value)
                ->where('order_number', 'like', 'DEMO-%')->count() : 0,
            'paidCount' => (clone $paid)->count(),
            'paidTotal' => self::formatMoneySum((string) ((clone $paid)->sum('amount') ?: '0')),
            'cashPaidCount' => (clone $paid)->where('method', PaymentMethod::Cash->value)->count(),
            'cashPaidTotal' => self::formatMoneySum((string) ((clone $paid)->where('method', PaymentMethod::Cash->value)->sum('amount') ?: '0')),
        ];
    }

    private static function formatMoneySum(string $value): string
    {
        // SQL DECIMAL SUM is authoritative; only normalize its textual scale,
        // never calculate or round settlement money in PHP floating-point.
        [$units, $fraction] = array_pad(explode('.', $value, 2), 2, '');

        return $units.'.'.str_pad(substr($fraction, 0, 2), 2, '0');
    }
}
