<?php

namespace App\Services\Pos;

use App\Enums\OrderSource;
use App\Enums\OrderStatus;
use App\Enums\OrderType;
use App\Enums\TableStatus;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\RestaurantTable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class ManualOrderService
{
    /** @param array<string, mixed> $input */
    public function place(array $input): Order
    {
        return DB::transaction(function () use ($input): Order {
            $dineIn = $input['type'] === OrderType::DineIn->value;
            $table = null;

            if ($dineIn) {
                $table = RestaurantTable::query()
                    ->where('code', $input['table_code'])
                    ->lockForUpdate()
                    ->first();

                if (! $table || $table->getRawOriginal('status') === TableStatus::Inactive->value) {
                    throw ValidationException::withMessages(['table_code' => 'Meja tidak ditemukan atau sedang nonaktif.']);
                }
                if (
                    $table->getRawOriginal('status') !== TableStatus::Available->value ||
                    $table->current_order_id !== null ||
                    $table->orders()->whereNotIn('status', [
                        OrderStatus::Paid->value,
                        OrderStatus::Cancelled->value,
                    ])->exists()
                ) {
                    throw new ConflictHttpException('Meja sudah digunakan. Pilih meja yang masih tersedia.');
                }
                if ($input['guests'] > $table->seats) {
                    throw ValidationException::withMessages(['guests' => 'Jumlah tamu melebihi kapasitas meja.']);
                }
            }

            $ids = array_map(static fn (array $line): int => (int) $line['menu_item_id'], $input['items']);
            $menu = MenuItem::query()->with('category')->whereIn('id', $ids)->get()->keyBy('id');
            $subtotalCents = 0;
            $lines = [];

            foreach ($input['items'] as $line) {
                $item = $menu->get((int) $line['menu_item_id']);
                if (! $item || ! $item->is_available || ! $item->category?->is_active) {
                    throw ValidationException::withMessages(['items' => 'Ada menu yang sudah tidak tersedia. Perbarui keranjang.']);
                }
                [$whole, $decimals] = explode('.', (string) $item->price);
                $unitCents = (int) $whole * 100 + (int) $decimals;
                $subtotalCents += $unitCents * (int) $line['quantity'];
                if ($subtotalCents > 999999999999) {
                    throw ValidationException::withMessages(['items' => 'Total pesanan melebihi batas transaksi.']);
                }
                $lines[] = [
                    'menu_item_id' => $item->id,
                    'quantity' => (int) $line['quantity'],
                    'unit_price' => $item->price,
                    'notes' => $line['notes'] ?? null,
                ];
            }

            $subtotal = intdiv($subtotalCents, 100).'.'.str_pad((string) ($subtotalCents % 100), 2, '0', STR_PAD_LEFT);
            // Same confirmed pricing policy as QR orders: tax/service are zero
            // until the Settings backend implements audited rate persistence.
            $order = Order::create([
                'order_number' => 'MAN-'.Str::ulid(),
                'table_id' => $table?->id,
                'customer_name' => $input['customer_name'],
                'type' => OrderType::from($input['type']),
                'status' => OrderStatus::Pending,
                'source' => OrderSource::Manual,
                'guests' => $input['guests'],
                'subtotal' => $subtotal,
                'tax' => '0.00',
                'service_charge' => '0.00',
                'total' => $subtotal,
                'notes' => $input['notes'] ?? null,
            ]);

            foreach ($lines as $line) {
                OrderItem::create(['order_id' => $order->id, ...$line]);
            }

            if ($table) {
                $table->update([
                    'status' => TableStatus::Occupied,
                    'current_order_id' => $order->id,
                ]);
            }

            return $order->load(['table', 'items.menuItem', 'payments']);
        }, 3);
    }
}
