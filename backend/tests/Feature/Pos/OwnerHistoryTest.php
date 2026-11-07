<?php

namespace Tests\Feature\Pos;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\Role;
use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OwnerHistoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_historical_endpoint_is_owner_only_and_requires_authentication(): void
    {
        $this->getJson('/dashboard/history')->assertUnauthorized();

        $this->actingAs(User::factory()->create(['role' => Role::Kasir]))
            ->getJson('/dashboard/history')
            ->assertForbidden();

        $this->actingAs(User::factory()->create(['role' => Role::Waiters]))
            ->getJson('/dashboard/history')
            ->assertForbidden();

        $this->actingAs(User::factory()->create([
            'role' => Role::Owner,
            'is_active' => false,
        ]))
            ->getJson('/dashboard/history')
            ->assertUnauthorized();
    }

    public function test_returns_empty_but_valid_30_day_history_without_records(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-06 10:00:00', 'Asia/Jakarta'));
        $this->actingAs(User::factory()->create(['role' => Role::Owner]))
            ->getJson('/dashboard/history')
            ->assertOk()
            ->assertJsonPath('source', 'database')
            ->assertJsonPath('timezone', 'Asia/Jakarta')
            ->assertJsonPath('days', 30)
            ->assertJsonPath('from', '2026-10-08')
            ->assertJsonPath('to', '2026-11-06')
            ->assertJsonPath('totals.revenue', 0)
            ->assertJsonPath('totals.payments', 0)
            ->assertJsonPath('totals.orders', 0)
            ->assertJsonCount(30, 'dailyRevenue')
            ->assertJsonCount(84, 'orderActivity');
    }

    public function test_revenue_counts_only_paid_payments_at_paid_at_and_heatmap_uses_order_creation(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-06 10:00:00', 'Asia/Jakarta'));
        $createdAt = CarbonImmutable::parse('2026-11-05 09:35:00', 'Asia/Jakarta')
            ->setTimezone('UTC');
        $paymentAt = CarbonImmutable::parse('2026-11-05 13:30:00', 'Asia/Jakarta')
            ->setTimezone('UTC');
        $order = Order::create([
            'order_number' => 'HISTORY-0001',
            'customer_name' => 'Test only',
            'status' => OrderStatus::Paid,
            'total' => 99999,
        ]);
        $order->forceFill(['created_at' => $createdAt])->save();

        foreach ([
            [PaymentStatus::Paid, '12500.00', $paymentAt],
            [PaymentStatus::Paid, '2500.00', $paymentAt],
            [PaymentStatus::Pending, '99999.00', $paymentAt],
            [PaymentStatus::Refunded, '5000.00', $paymentAt],
            [PaymentStatus::Paid, '3000.00', null],
            [PaymentStatus::Paid, '1000.00', CarbonImmutable::parse('2026-09-01', 'UTC')],
        ] as [$status, $amount, $paidAt]) {
            Payment::create([
                'order_id' => $order->id,
                'method' => PaymentMethod::Cash,
                'status' => $status,
                'amount' => $amount,
                'paid_at' => $paidAt,
            ]);
        }

        $json = $this->actingAs(User::factory()->create(['role' => Role::Owner]))
            ->getJson('/dashboard/history')
            ->assertOk()
            ->assertJsonPath('totals.revenue', 15000)
            ->assertJsonPath('totals.payments', 2)
            ->assertJsonPath('totals.orders', 1)
            ->json();

        $nov5 = collect($json['dailyRevenue'])->firstWhere('date', '2026-11-05');
        $this->assertSame(15000, $nov5['amount']);
        $this->assertSame(2, $nov5['payments']);

        // Thursday = ISO weekday 4; 09:35 Jakarta belongs to 08:00–10:00.
        $thursdayMorning = collect($json['orderActivity'])->first(
            fn (array $cell): bool => $cell['weekday'] === 4 && $cell['hour'] === 8,
        );
        $this->assertSame(1, $thursdayMorning['count']);
        $this->assertSame(1, $json['maxActivity']);
    }

    public function test_decimal_payment_amounts_are_summed_before_currency_rounding(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-06 10:00:00', 'Asia/Jakarta'));
        $order = Order::create([
            'order_number' => 'HISTORY-CENTS',
            'customer_name' => 'Test decimal amounts',
        ]);

        foreach (['1.25', '1.25'] as $amount) {
            Payment::create([
                'order_id' => $order->id,
                'method' => PaymentMethod::Cash,
                'status' => PaymentStatus::Paid,
                'amount' => $amount,
                'paid_at' => CarbonImmutable::parse('2026-11-06 09:00:00', 'Asia/Jakarta')
                    ->setTimezone('UTC'),
            ]);
        }

        $this->actingAs(User::factory()->create(['role' => Role::Owner]))
            ->getJson('/dashboard/history')
            ->assertOk()
            ->assertJsonPath('totals.revenue', 2.5)
            ->assertJsonPath('totals.payments', 2);
    }

    public function test_local_midnight_uses_jakarta_date_even_when_utc_date_is_yesterday(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-06 10:00:00', 'Asia/Jakarta'));
        $order = Order::create([
            'order_number' => 'HISTORY-MIDNIGHT',
            'customer_name' => 'Midnight case',
        ]);
        $order->forceFill([
            'created_at' => CarbonImmutable::parse('2026-11-06 00:15:00', 'Asia/Jakarta')
                ->setTimezone('UTC'),
        ])->save();

        Payment::create([
            'order_id' => $order->id,
            'method' => PaymentMethod::Cash,
            'status' => PaymentStatus::Paid,
            'amount' => '10000.00',
            'paid_at' => CarbonImmutable::parse('2026-11-06 00:30:00', 'Asia/Jakarta')
                ->setTimezone('UTC'),
        ]);

        $data = $this->actingAs(User::factory()->create(['role' => Role::Owner]))
            ->getJson('/dashboard/history')
            ->assertOk()
            ->json();

        $today = collect($data['dailyRevenue'])->firstWhere('date', '2026-11-06');
        $this->assertSame(10000, $today['amount']);
        $this->assertSame(1, $today['payments']);
        $this->assertSame(1, $data['totals']['orders']);
    }
}
