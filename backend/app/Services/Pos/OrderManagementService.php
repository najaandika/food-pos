<?php

namespace App\Services\Pos;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\Role;
use App\Enums\TableStatus;
use App\Models\Order;
use App\Models\Payment;
use App\Models\RestaurantTable;
use App\Models\User;
use App\Services\Pos\Orders\OrderPresenter;
use App\Services\Pos\Orders\OrderReadModel;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class OrderManagementService
{
    /** Seeded orders may be exercised in local/test only, never in production. */
    public static function isDemoOrder(Order $order): bool
    {
        return str_starts_with($order->order_number, 'DEMO-');
    }

    public static function demoModeEnabled(): bool
    {
        return app()->environment(['local', 'testing']);
    }

    private const NEXT = [
        'pending' => 'accepted',
        'accepted' => 'preparing',
        'preparing' => 'ready',
        'ready' => 'served',
        'served' => 'waiting_payment',
    ];

    /** @return LengthAwarePaginator<int, Order> */
    public function paginate(int $perPage = 100): LengthAwarePaginator
    {
        return (new OrderReadModel)->paginate($perPage);
    }

    /** @return LengthAwarePaginator<int, Order> */
    public function cashierQueue(int $perPage, string $filter, string $search): LengthAwarePaginator
    {
        return (new OrderReadModel)->cashierQueue($perPage, $filter, $search, self::demoModeEnabled());
    }

    /** @return array<string, mixed> */
    public function cashierStats(): array
    {
        return (new OrderReadModel)->cashierStats(self::demoModeEnabled());
    }

    /** @return array<string, mixed> */
    public function present(Order $order): array
    {
        return (new OrderPresenter)->present($order);
    }

    public function updateStatus(Order $requested, OrderStatus $next, User $staff): Order
    {
        return DB::transaction(function () use ($requested, $next, $staff): Order {
            $order = Order::query()->whereKey($requested->id)->lockForUpdate()->firstOrFail();
            $current = $order->status->value;

            $allowed = self::NEXT[$current] ?? null;
            // Staff members cannot skip order stages or update a settled order.
            if ($allowed === null || $allowed !== $next->value) {
                throw new ConflictHttpException('Status sudah berubah atau urutan layanan tidak sesuai. Muat ulang pesanan.');
            }
            if ($staff->role === Role::Kasir && ! ($current === 'served' && $next === OrderStatus::WaitingPayment)) {
                abort(403, 'Kasir hanya dapat menyiapkan tagihan pesanan yang sudah disajikan.');
            }

            $order->update(['status' => $next]);

            if ($order->table_id !== null) {
                $table = RestaurantTable::query()->whereKey($order->table_id)->lockForUpdate()->first();
                if ($table && $table->current_order_id === $order->id) {
                    $newTableStatus = match ($next) {
                        OrderStatus::Preparing, OrderStatus::Accepted => TableStatus::Preparing,
                        OrderStatus::Ready => TableStatus::Ready,
                        OrderStatus::Served, OrderStatus::WaitingPayment => TableStatus::WaitingPayment,
                        default => null,
                    };
                    if ($newTableStatus !== null) {
                        $table->update(['status' => $newTableStatus]);
                    }
                }
            }

            return $order->refresh()->load(['table', 'items.menuItem', 'payments']);
        }, 3);
    }

    /** Convert a validated decimal currency string to integer cents without float operations. */
    public static function toMinor(string $amount): int
    {
        if (! preg_match('/^\d{1,10}(?:\.\d{1,2})?$/D', $amount)) {
            throw new \InvalidArgumentException('Invalid currency amount.');
        }

        [$whole, $fraction] = array_pad(explode('.', $amount, 2), 2, '');

        return ((int) $whole * 100) + (int) str_pad($fraction, 2, '0');
    }

    public static function fromMinor(int $cents): string
    {
        return intdiv($cents, 100).'.'.str_pad((string) ($cents % 100), 2, '0', STR_PAD_LEFT);
    }

    /** @return array{order: Order, payment: Payment, idempotent: bool} */
    public function recordCashPayment(
        Order $requested,
        User $staff,
        string $received,
        ?string $expectedTotal = null,
        ?string $idempotencyKey = null,
    ): array {
        if (! in_array($staff->role, [Role::Owner, Role::Kasir], true)) {
            abort(403, 'Hanya Owner atau Kasir boleh mencatat pembayaran tunai.');
        }

        return DB::transaction(function () use ($requested, $received, $expectedTotal, $idempotencyKey): array {
            $order = Order::query()->whereKey($requested->id)->lockForUpdate()->firstOrFail();
            if (self::isDemoOrder($order) && ! self::demoModeEnabled()) {
                throw new ConflictHttpException('Pesanan demo hanya dapat diuji pada lingkungan development.');
            }
            $due = self::toMinor((string) $order->total);
            $tendered = self::toMinor($received);

            // Re-read the locked row, not a client-supplied bill calculation.
            if ($expectedTotal !== null && self::toMinor($expectedTotal) !== $due) {
                throw new ConflictHttpException('Total tagihan berubah. Periksa rincian terbaru sebelum membayar.');
            }

            $existing = $order->payments()->where('status', PaymentStatus::Paid->value)->first();
            if ($existing !== null) {
                if ($idempotencyKey !== null && $existing->idempotency_key === $idempotencyKey
                    && $existing->method === PaymentMethod::Cash
                    && self::toMinor((string) ($existing->cash_received ?? $existing->amount)) === $tendered
                    && self::toMinor((string) $existing->amount) === $due) {
                    return ['order' => $order->load(['table', 'items.menuItem', 'payments']), 'payment' => $existing, 'idempotent' => true];
                }
                throw new ConflictHttpException('Pembayaran pesanan sudah tercatat. Antrean akan diperbarui otomatis.');
            }

            if (! in_array($order->status, [OrderStatus::Ready, OrderStatus::Served, OrderStatus::WaitingPayment], true)) {
                throw new ConflictHttpException('Pesanan tidak berada pada antrean pembayaran atau sudah dibayar.');
            }

            if ($idempotencyKey !== null && Payment::query()->where('idempotency_key', $idempotencyKey)->exists()) {
                throw new ConflictHttpException('Kunci permintaan sudah digunakan untuk pembayaran lain.');
            }

            if ($due <= 0 || $tendered < $due) {
                throw ValidationException::withMessages([
                    'received_amount' => 'Uang diterima harus mencukupi total tagihan yang valid.',
                ]);
            }

            $payment = Payment::create([
                'order_id' => $order->id,
                'method' => PaymentMethod::Cash,
                'amount' => self::fromMinor($due),
                'cash_received' => self::fromMinor($tendered),
                'cash_change' => self::fromMinor($tendered - $due),
                'idempotency_key' => $idempotencyKey,
                'status' => PaymentStatus::Paid,
                'paid_at' => now('UTC'),
            ]);
            $order->update(['status' => OrderStatus::Paid]);

            if ($order->table_id !== null) {
                $table = RestaurantTable::query()->whereKey($order->table_id)->lockForUpdate()->first();
                if ($table && $table->current_order_id === $order->id) {
                    $otherActive = Order::query()
                        ->where('table_id', $table->id)
                        ->whereKeyNot($order->id)
                        ->whereNotIn('status', [OrderStatus::Paid->value, OrderStatus::Cancelled->value])
                        ->exists();

                    $table->update([
                        'current_order_id' => null,
                        'status' => $otherActive ? TableStatus::Occupied : TableStatus::Available,
                    ]);
                }
            }

            return [
                'order' => $order->refresh()->load(['table', 'items.menuItem', 'payments']),
                'payment' => $payment->refresh(),
                'idempotent' => false,
            ];
        }, 3);
    }

    /** @return array<string, mixed>|null */
    public function confirmedReceipt(Order $order): ?array
    {
        $payment = $order->payments()
            ->where('status', PaymentStatus::Paid->value)
            ->whereNotNull('paid_at')->orderByDesc('id')->first();
        if ($order->status !== OrderStatus::Paid || $payment === null) {
            return null;
        }

        $data = $this->present($order);
        $data['discount'] = '0.00'; // Discounts are not supported in persisted orders yet.
        $data['payment'] = [
            'id' => $payment->id,
            'method' => $payment->method->value,
            'status' => $payment->status->value,
            'amount' => (string) $payment->amount,
            'cashReceived' => $payment->cash_received,
            'cashChange' => $payment->cash_change,
            'paidAt' => $payment->paid_at?->toIso8601String(),
        ];

        return $data;
    }
}
