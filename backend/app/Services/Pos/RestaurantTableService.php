<?php

namespace App\Services\Pos;

use App\Enums\OrderStatus;
use App\Enums\TableStatus;
use App\Models\RestaurantTable;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class RestaurantTableService
{
    // Operational fields are managed by the order/QR lifecycle, not table CRUD.
    private const EDITABLE = ['code', 'name', 'area', 'seats', 'status'];

    /** @return LengthAwarePaginator<int, RestaurantTable> */
    public function paginate(int $perPage = 20): LengthAwarePaginator
    {
        // Report actual QR landing visits for the current Jakarta day, not the
        // old demo counter or every background API poll.
        $startUtc = now('Asia/Jakarta')->startOfDay()->utc()->toDateTimeString();
        $endUtc = now('Asia/Jakarta')->addDay()->startOfDay()->utc()->toDateTimeString();

        $todayScans = DB::table('qr_scan_events')
            ->selectRaw('COUNT(*)')
            ->whereColumn('qr_scan_events.table_id', 'tables.id')
            ->where('qr_scan_events.scanned_at', '>=', $startUtc)
            ->where('qr_scan_events.scanned_at', '<', $endUtc);

        return RestaurantTable::query()
            ->select('tables.*')
            ->selectSub($todayScans, 'scans_today')
            ->orderBy('code')
            ->paginate($perPage);
    }

    /** @param array<string, mixed> $attributes */
    public function create(array $attributes): RestaurantTable
    {
        return RestaurantTable::create([
            ...Arr::only($attributes, self::EDITABLE),
            'qr_token' => Str::random(64),
        ])->refresh();
    }

    /** @param array<string, mixed> $attributes */
    public function update(RestaurantTable $table, array $attributes): RestaurantTable
    {
        return DB::transaction(function () use ($table, $attributes): RestaurantTable {
            $table = RestaurantTable::query()->whereKey($table->getKey())->lockForUpdate()->firstOrFail();
            $editable = Arr::only($attributes, self::EDITABLE);

            if (array_key_exists('status', $editable) && $this->hasActiveOrder($table)) {
                throw new ConflictHttpException('Status meja dengan pesanan aktif harus dikelola melalui layanan transaksi.');
            }

            $table->update($editable);

            return $table->refresh();
        });
    }

    public function delete(RestaurantTable $table): void
    {
        DB::transaction(function () use ($table): void {
            $table = RestaurantTable::query()->whereKey($table->getKey())->lockForUpdate()->firstOrFail();

            if ($this->hasActiveOrder($table)) {
                throw new ConflictHttpException('Meja dengan pesanan aktif tidak dapat dihapus.');
            }

            // Historical orders are retained and orders.table_id becomes NULL.
            $table->delete();
        });
    }

    public function rotateQrToken(RestaurantTable $table): string
    {
        return DB::transaction(function () use ($table): string {
            $table = RestaurantTable::query()->whereKey($table->getKey())->lockForUpdate()->firstOrFail();
            $table->update(['qr_token' => Str::random(64)]);

            return $table->qr_token;
        });
    }

    /**
     * Record a real QR landing visit, without storing guest identity or token.
     * An API menu refresh must never count as another scan.
     */
    public function recordQrScan(string $token): void
    {
        $table = $this->resolveQrToken($token);
        if (
            $table === null ||
            $table->getRawOriginal('status') === TableStatus::Inactive->value
        ) {
            return;
        }

        DB::table('qr_scan_events')->insert([
            'table_id' => $table->id,
            'scanned_at' => now('UTC')->toDateTimeString(),
        ]);
    }

    public function resolveQrToken(string $token): ?RestaurantTable
    {
        $table = RestaurantTable::query()->where('qr_token', $token)->first();

        // Guard against case-insensitive DB collations: QR secrets are case-sensitive.
        return $table !== null && hash_equals($table->qr_token, $token) ? $table : null;
    }

    private function hasActiveOrder(RestaurantTable $table): bool
    {
        return $table->current_order_id !== null
            || $table->orders()
                ->whereNotIn('status', [OrderStatus::Paid->value, OrderStatus::Cancelled->value])
                ->exists();
    }
}
