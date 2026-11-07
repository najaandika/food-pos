<?php

namespace App\Services\Pos;

use App\Enums\OrderSource;
use App\Enums\OrderStatus;
use App\Enums\OrderType;
use App\Enums\TableStatus;
use App\Models\Category;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\RestaurantTable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class PublicQrOrderingService
{
    /**
     * Public catalog exposes only guest-safe fields. Never expose the QR bearer
     * secret, internal table pointers, or unavailable/disabled menu items.
     *
     * @return array<string, mixed>
     */
    public function menu(string $token): array
    {
        $table = $this->resolveTable($token);

        $categories = Category::query()
            ->where('is_active', true)
            ->with(['menuItems' => fn ($query) => $query
                ->where('is_available', true)
                ->orderBy('id')])
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->filter(fn (Category $category) => $category->menuItems->isNotEmpty())
            ->map(fn (Category $category): array => [
                'id' => $category->id,
                'name' => $category->name,
                'items' => $category->menuItems->map(fn (MenuItem $item): array => [
                    'id' => $item->id,
                    'name' => $item->name,
                    'description' => $item->description,
                    'price' => $item->price,
                    'image_url' => $item->image_url,
                    'is_best_seller' => $item->is_best_seller,
                    'badge' => $item->badge,
                ])->values()->all(),
            ])
            ->values()
            ->all();

        return [
            'table' => $this->guestTable($table),
            'can_order' => $this->canOrder($table),
            'categories' => $categories,
        ];
    }

    /**
     * Place exactly one pending order per available table, under a row lock.
     * All prices and order state are sourced server-side from Eloquent.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function placeOrder(string $token, array $data): array
    {
        $resolved = $this->resolveTable($token);

        return DB::transaction(function () use ($resolved, $token, $data): array {
            $table = RestaurantTable::query()->whereKey($resolved->getKey())->lockForUpdate()->firstOrFail();

            // A token can be rotated between initial lookup and row lock.
            if (! hash_equals($table->qr_token, $token) || $table->getRawOriginal('status') === TableStatus::Inactive->value) {
                throw new NotFoundHttpException('Kode QR tidak valid.');
            }

            if (! $this->canOrder($table)) {
                throw new ConflictHttpException('Meja ini belum tersedia untuk pesanan baru.');
            }

            if ((int) $data['guests'] > $table->seats) {
                throw ValidationException::withMessages([
                    'guests' => 'Jumlah tamu melebihi kapasitas meja.',
                ]);
            }

            $ids = array_map(static fn (array $item): int => (int) $item['menu_item_id'], $data['items']);
            $menuItems = MenuItem::query()->with('category')->whereIn('id', $ids)->get()->keyBy('id');

            $lines = [];
            $subtotalCents = 0;

            foreach ($data['items'] as $item) {
                $menu = $menuItems->get((int) $item['menu_item_id']);

                if (! $menu || ! $menu->is_available || ! $menu->category?->is_active) {
                    throw ValidationException::withMessages([
                        'items' => 'Salah satu menu tidak tersedia. Perbarui pilihan dan coba lagi.',
                    ]);
                }

                $quantity = (int) $item['quantity'];
                // DECIMAL casts to a fixed-scale string at runtime.
                $unitPrice = (string) $menu->price;
                $unitPriceCents = $this->toCents($unitPrice);
                $lineCents = $unitPriceCents * $quantity;
                $subtotalCents += $lineCents;

                // DECIMAL(12,2) cannot store totals beyond 9,999,999,999.99.
                if ($subtotalCents > 999999999999) {
                    throw ValidationException::withMessages([
                        'items' => 'Total pesanan melebihi batas transaksi.',
                    ]);
                }

                $lines[] = [
                    'menu_item_id' => $menu->id,
                    'name' => $menu->name,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'line_total' => $this->fromCents($lineCents),
                    'notes' => $item['notes'] ?? null,
                ];
            }

            $subtotal = $this->fromCents($subtotalCents);
            // Tax and service charge settings are not implemented yet.
            // Explicitly leave both at zero until a verified pricing policy exists.
            $order = Order::create([
                'order_number' => 'QR-'.Str::ulid(),
                'table_id' => $table->id,
                'customer_name' => $data['customer_name'],
                'guests' => (int) $data['guests'],
                'type' => OrderType::DineIn,
                'status' => OrderStatus::Pending,
                'source' => OrderSource::Qr,
                'subtotal' => $subtotal,
                'tax' => '0.00',
                'service_charge' => '0.00',
                'total' => $subtotal,
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($lines as $line) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'menu_item_id' => $line['menu_item_id'],
                    'quantity' => $line['quantity'],
                    'unit_price' => $line['unit_price'],
                    'notes' => $line['notes'],
                ]);
            }

            $table->update([
                'status' => TableStatus::Occupied,
                'current_order_id' => $order->id,
            ]);

            return [
                'order_number' => $order->order_number,
                'status' => OrderStatus::Pending->value,
                'table' => $this->guestTable($table),
                'subtotal' => $subtotal,
                'tax' => '0.00',
                'service_charge' => '0.00',
                'total' => $subtotal,
                'items' => $lines,
            ];
        }, 3);
    }

    private function resolveTable(string $token): RestaurantTable
    {
        $table = app(RestaurantTableService::class)->resolveQrToken($token);

        if ($table === null || $table->getRawOriginal('status') === TableStatus::Inactive->value) {
            throw new NotFoundHttpException('Kode QR tidak valid.');
        }

        return $table;
    }

    private function canOrder(RestaurantTable $table): bool
    {
        return $table->getRawOriginal('status') === TableStatus::Available->value
            && $table->current_order_id === null
            && ! $table->orders()
                ->whereNotIn('status', [OrderStatus::Paid->value, OrderStatus::Cancelled->value])
                ->exists();
    }

    /** @return array<string, int|string> */
    private function guestTable(RestaurantTable $table): array
    {
        return [
            'code' => $table->code,
            'name' => $table->name,
            'area' => $table->area,
            'seats' => $table->seats,
            'status' => (string) $table->getRawOriginal('status'),
        ];
    }

    private function toCents(string $amount): int
    {
        [$whole, $decimal] = explode('.', $amount);

        return ((int) $whole * 100) + (int) $decimal;
    }

    private function fromCents(int $cents): string
    {
        return intdiv($cents, 100).'.'.str_pad((string) ($cents % 100), 2, '0', STR_PAD_LEFT);
    }
}
