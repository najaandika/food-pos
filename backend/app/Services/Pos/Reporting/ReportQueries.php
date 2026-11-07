<?php

namespace App\Services\Pos\Reporting;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/** @phpstan-import-type ReportCriteria from ReportFilters */
final class ReportQueries
{
    /** @param ReportCriteria $filters */
    public function successfulPayments(array $filters): Builder
    {
        $query = DB::table('payments')
            ->where('payments.status', PaymentStatus::Paid->value)
            ->whereNotNull('payments.paid_at')
            ->where('payments.paid_at', '>=', $filters['startUtc'])
            ->where('payments.paid_at', '<', $filters['endUtc']);

        if ($filters['method'] !== 'all') {
            $query->where('payments.method', $filters['method']);
        }

        return $query;
    }

    /** @param ReportCriteria $filters */
    public function transactions(array $filters): Builder
    {
        $query = DB::table('payments')
            ->join('orders', 'orders.id', '=', 'payments.order_id')
            ->leftJoin('tables', 'tables.id', '=', 'orders.table_id')
            ->whereRaw('COALESCE(payments.paid_at, payments.created_at) >= ?', [$filters['startUtc']])
            ->whereRaw('COALESCE(payments.paid_at, payments.created_at) < ?', [$filters['endUtc']])
            ->select([
                'payments.id', 'payments.amount', 'payments.method',
                'payments.status', 'payments.paid_at', 'payments.created_at',
                'orders.order_number', 'orders.customer_name', 'orders.source',
                'tables.code as table_code',
            ]);

        if ($filters['method'] !== 'all') {
            $query->where('payments.method', $filters['method']);
        }
        if ($filters['status'] !== 'all') {
            $query->where('payments.status', $filters['status']);
        }
        if ($filters['search'] !== '') {
            $needle = '%'.addcslashes($filters['search'], '%_\\').'%';
            $query->where(function ($q) use ($needle): void {
                $q->where('orders.order_number', 'like', $needle)
                    ->orWhere('orders.customer_name', 'like', $needle)
                    ->orWhere('tables.code', 'like', $needle);
            });
        }

        if ($filters['sort'] === 'amount_desc') {
            return $query->orderByDesc('payments.amount')->orderByDesc('payments.id');
        }
        if ($filters['sort'] === 'amount_asc') {
            return $query->orderBy('payments.amount')->orderByDesc('payments.id');
        }

        return $query->orderByRaw('COALESCE(payments.paid_at, payments.created_at) DESC')
            ->orderByDesc('payments.id');
    }

    /** @param ReportCriteria $filters */
    public function createdOrders(array $filters): Builder
    {
        return DB::table('orders')
            ->where('created_at', '>=', $filters['startUtc'])
            ->where('created_at', '<', $filters['endUtc'])
            ->select(['source', 'type', 'created_at']);
    }

    /** @param ReportCriteria $filters */
    public function soldCategories(array $filters): Builder
    {
        // Distinct order IDs avoid multiplying quantities for split payments.
        $eligibleIds = $this->successfulPayments($filters)->distinct()->select('order_id');

        return DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('menu_items', 'menu_items.id', '=', 'order_items.menu_item_id')
            ->join('categories', 'categories.id', '=', 'menu_items.category_id')
            ->where('orders.status', OrderStatus::Paid->value)
            ->whereIn('orders.id', $eligibleIds)
            ->groupBy('categories.id', 'categories.name')
            ->select(['categories.name'])
            ->selectRaw('SUM(order_items.quantity) as quantity')
            ->orderByDesc('quantity');
    }
}
