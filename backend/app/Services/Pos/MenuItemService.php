<?php

namespace App\Services\Pos;

use App\Enums\OrderStatus;
use App\Models\MenuItem;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class MenuItemService
{
    /** @return LengthAwarePaginator<int, MenuItem> */
    public function paginate(int $perPage = 20, ?int $categoryId = null): LengthAwarePaginator
    {
        $startUtc = now('Asia/Jakarta')->startOfDay()->utc()->toDateTimeString();
        $endUtc = now('Asia/Jakarta')->endOfDay()->utc()->toDateTimeString();

        return MenuItem::query()
            ->with('category')
            // The Owner Menu "Sold today" figure must come from paid sales,
            // not the old frontend demo number or pending/cancelled orders.
            ->withSum([
                'orderItems as sold_today' => fn ($items) => $items->whereHas(
                    'order',
                    fn ($orders) => $orders
                        ->where('status', OrderStatus::Paid->value)
                        ->whereBetween('created_at', [$startUtc, $endUtc]),
                ),
            ], 'quantity')
            ->when($categoryId !== null, fn ($query) => $query->where('category_id', $categoryId))
            ->orderByDesc('is_available')
            ->orderBy('id')
            ->paginate($perPage);
    }

    /** @param array<string, mixed> $attributes */
    public function create(array $attributes): MenuItem
    {
        return MenuItem::create($attributes)->refresh()->load('category');
    }

    /** @param array<string, mixed> $attributes */
    public function update(MenuItem $menuItem, array $attributes): MenuItem
    {
        $menuItem->update($attributes);

        return $menuItem->refresh()->load('category');
    }

    public function delete(MenuItem $menuItem): void
    {
        DB::transaction(function () use ($menuItem): void {
            $menuItem = MenuItem::query()->whereKey($menuItem->getKey())->lockForUpdate()->firstOrFail();

            // order_items.menu_item_id is RESTRICT to preserve sales history.
            if ($menuItem->orderItems()->exists()) {
                throw new ConflictHttpException('Menu sudah digunakan dalam transaksi. Nonaktifkan ketersediaannya sebagai gantinya.');
            }

            $menuItem->delete();
        });
    }
}
