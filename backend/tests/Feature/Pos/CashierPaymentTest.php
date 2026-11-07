<?php

namespace Tests\Feature\Pos;

use App\Enums\OrderSource;
use App\Enums\OrderStatus;
use App\Enums\OrderType;
use App\Enums\Role;
use App\Models\Category;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use App\Services\Pos\OrderManagementService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Tests\TestCase;

class CashierPaymentTest extends TestCase
{
    use RefreshDatabase;

    private function order(OrderStatus $status = OrderStatus::WaitingPayment, string $source = 'qr'): Order
    {
        $category = Category::firstOrCreate(['name' => 'Kasir Test']);
        $menu = MenuItem::firstOrCreate(['name' => 'Teh Kasir'], [
            'category_id' => $category->id, 'price' => '12000.00',
        ]);
        $order = Order::create([
            'order_number' => 'POS-'.Str::ulid(),
            'customer_name' => 'Pelanggan Kasir',
            'type' => OrderType::Takeaway,
            'source' => OrderSource::from($source),
            'status' => $status,
            'subtotal' => '24000.00',
            'tax' => '2400.00',
            'service_charge' => '0.00',
            'total' => '26400.00',
        ]);
        $order->items()->create(['menu_item_id' => $menu->id, 'quantity' => 2, 'unit_price' => '12000.00']);

        return $order;
    }

    private function login(Role $role = Role::Kasir): void
    {
        $this->actingAs(User::factory()->create(['role' => $role]));
    }

    private function payload(string $received = '30000.00', ?string $key = null): array
    {
        return [
            'method' => 'cash',
            'received_amount' => $received,
            'expected_total' => '26400.00',
            'idempotency_key' => $key ?? (string) Str::uuid(),
        ];
    }

    public function test_cash_payment_stores_tender_change_and_only_paid_receipt(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-06 11:00:00', 'Asia/Jakarta'));
        $order = $this->order();
        $this->login();

        $this->getJson("/pos/cashier/orders/{$order->id}/receipt")->assertNotFound();
        $response = $this->postJson("/pos/orders/{$order->id}/cash-payment", $this->payload())
            ->assertOk()
            ->assertJsonPath('status', 'paid')
            ->assertJsonPath('payment.status', 'paid')
            ->assertJsonPath('payment.cashReceived', '30000.00')
            ->assertJsonPath('payment.cashChange', '3600.00')
            ->assertJsonPath('idempotent', false);

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'paid']);
        $this->assertDatabaseHas('payments', [
            'order_id' => $order->id, 'method' => 'cash', 'status' => 'paid',
            'amount' => '26400.00', 'cash_received' => '30000.00', 'cash_change' => '3600.00',
        ]);
        $this->assertDatabaseCount('payments', 1);
        $this->assertNotNull(Payment::first()->paid_at);
        $this->getJson("/pos/cashier/orders/{$order->id}/receipt")
            ->assertOk()
            ->assertJsonPath('items.0.quantity', 2)
            ->assertJsonPath('orderNumber', $order->order_number)
            ->assertJsonPath('payment.amount', '26400.00')
            ->assertJsonPath('payment.cashChange', '3600.00');
        $this->assertStringContainsString('/pos/cashier/orders/', $response->json('receiptUrl'));
    }

    public function test_underpayment_and_stale_total_do_not_write_any_payment(): void
    {
        $order = $this->order();
        $this->login();
        $this->postJson("/pos/orders/{$order->id}/cash-payment", $this->payload('26000.00'))
            ->assertUnprocessable()->assertJsonValidationErrors('received_amount');
        $this->postJson("/pos/orders/{$order->id}/cash-payment", [
            ...$this->payload(), 'expected_total' => '20000.00',
        ])->assertStatus(409);
        $this->assertDatabaseCount('payments', 0);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'waiting_payment']);
    }

    public function test_retry_same_key_is_idempotent_and_different_key_is_rejected(): void
    {
        $order = $this->order();
        $this->login();
        $key = (string) Str::uuid();
        $payload = $this->payload('30000.00', $key);
        $this->postJson("/pos/orders/{$order->id}/cash-payment", $payload)
            ->assertOk()->assertJsonPath('idempotent', false);
        $this->postJson("/pos/orders/{$order->id}/cash-payment", $payload)
            ->assertOk()->assertJsonPath('idempotent', true);
        $this->postJson("/pos/orders/{$order->id}/cash-payment", $this->payload())
            ->assertStatus(409);
        $this->postJson("/pos/orders/{$order->id}/cash-payment", $this->payload('40000.00', $key))
            ->assertStatus(409);
        $this->assertDatabaseCount('payments', 1);
    }

    public function test_reused_key_other_order_cannot_settle_second_order(): void
    {
        $a = $this->order();
        $b = $this->order();
        $this->login();
        $key = (string) Str::uuid();
        $this->postJson("/pos/orders/{$a->id}/cash-payment", $this->payload('30000.00', $key))->assertOk();
        $this->postJson("/pos/orders/{$b->id}/cash-payment", $this->payload('30000.00', $key))->assertStatus(409);
        $this->assertDatabaseCount('payments', 1);
        $this->assertDatabaseHas('orders', ['id' => $b->id, 'status' => 'waiting_payment']);
    }

    public function test_non_cash_invalid_and_unauthorized_requests_are_blocked(): void
    {
        $order = $this->order();
        $url = "/pos/orders/{$order->id}/cash-payment";
        $this->postJson($url, $this->payload())->assertUnauthorized();
        $this->login(Role::Waiters);
        $this->postJson($url, $this->payload())->assertForbidden();
        $this->getJson('/pos/cashier/orders')->assertForbidden();
        $this->login();
        $this->postJson($url, ['method' => 'qris', 'received_amount' => '30000.00'])
            ->assertUnprocessable()->assertJsonValidationErrors('method');
        $this->postJson($url, ['method' => 'transfer', 'received_amount' => '30000.00'])
            ->assertUnprocessable()->assertJsonValidationErrors('method');
        $this->postJson($url, ['method' => 'cash'])
            ->assertUnprocessable()->assertJsonValidationErrors('received_amount');
        $this->postJson($url, $this->payload('abc'))
            ->assertUnprocessable()->assertJsonValidationErrors('received_amount');
        $this->postJson('/pos/orders/999999/cash-payment', $this->payload())->assertNotFound();
        $this->assertDatabaseCount('payments', 0);
    }

    public function test_only_payable_statuses_and_filtered_database_orders_appear(): void
    {
        $ready = $this->order(OrderStatus::Ready);
        $this->order(OrderStatus::Pending);
        $this->order(OrderStatus::Paid);
        $this->login();
        $this->getJson('/pos/cashier/orders?per_page=25&filter=all&search=&page=1')
            ->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/pos/cashier/orders?filter=ready&search=Pelanggan&per_page=25')
            ->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $ready->id)
            ->assertJsonPath('stats.unpaidCount', 1);
        $this->getJson('/pos/cashier/orders?filter=takeaway')
            ->assertOk()->assertJsonCount(1, 'data');
        $this->getJson("/pos/cashier/orders/{$ready->id}")
            ->assertOk()->assertJsonPath('items.0.lineTotal', 24000)
            ->assertJsonPath('discount', '0.00');
        $this->getJson('/pos/cashier/orders?per_page=55')
            ->assertUnprocessable()->assertJsonValidationErrors('per_page');
    }

    public function test_seeded_demo_orders_are_visible_and_payable_only_for_local_testing(): void
    {
        $demo = $this->order(OrderStatus::Ready);
        $demo->update(['order_number' => 'DEMO-261106-007']);
        $real = $this->order(OrderStatus::Ready);
        $this->login();

        $this->getJson('/pos/cashier/orders')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $demo->id)
            ->assertJsonPath('stats.unpaidCount', 1)
            ->assertJsonPath('stats.demoUnpaidCount', 1);
        $this->getJson("/pos/cashier/orders/{$demo->id}")
            ->assertOk()->assertJsonPath('orderNumber', 'DEMO-261106-007');
        $this->getJson("/pos/cashier/orders/{$demo->id}/receipt")->assertNotFound();
        $this->postJson("/pos/orders/{$demo->id}/cash-payment", $this->payload())
            ->assertOk()->assertJsonPath('payment.status', 'paid');
        $this->getJson("/pos/cashier/orders/{$demo->id}/receipt")
            ->assertOk()->assertJsonPath('orderNumber', 'DEMO-261106-007');
        $this->getJson('/pos/cashier/orders')
            ->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $real->id)
            ->assertJsonPath('stats.demoUnpaidCount', 0)
            ->assertJsonPath('stats.paidTotal', '0.00');
        $this->assertDatabaseHas('orders', ['id' => $demo->id, 'status' => 'paid']);
        $this->assertDatabaseCount('payments', 1);
    }

    public function test_demo_bills_cannot_be_listed_or_paid_in_production(): void
    {
        $demo = $this->order(OrderStatus::Ready);
        $demo->update(['order_number' => 'DEMO-261106-007']);
        $this->login();

        app()->detectEnvironment(fn (): string => 'production');
        try {
            $this->getJson('/pos/cashier/orders')
                ->assertOk()->assertJsonCount(0, 'data')
                ->assertJsonPath('stats.demoUnpaidCount', 0);
            $this->getJson("/pos/cashier/orders/{$demo->id}")->assertNotFound();
            $this->getJson("/pos/cashier/orders/{$demo->id}/receipt")->assertNotFound();
            // Production middleware requires real CSRF; test the service guard directly.
            $blocked = false;
            try {
                app(OrderManagementService::class)->recordCashPayment(
                    $demo, auth()->user(), '30000.00', '26400.00', (string) Str::uuid(),
                );
            } catch (ConflictHttpException) {
                $blocked = true;
            }
            $this->assertTrue($blocked);
            $this->assertDatabaseCount('payments', 0);
            $this->assertDatabaseHas('orders', ['id' => $demo->id, 'status' => 'ready']);
        } finally {
            app()->detectEnvironment(fn (): string => 'testing');
        }
    }

    public function test_seeded_demo_payments_do_not_inflate_cashier_today_kpis(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-06 11:00:00', 'Asia/Jakarta'));
        $demo = $this->order(OrderStatus::Paid);
        $demo->update(['order_number' => 'DEMO-261106-013']);
        $demo->payments()->create([
            'method' => 'cash',
            'amount' => '26400.00',
            'status' => 'paid',
            'paid_at' => now('UTC'),
        ]);
        $this->login();
        $this->getJson('/pos/cashier/orders')
            ->assertOk()
            ->assertJsonPath('stats.paidCount', 0)
            ->assertJsonPath('stats.paidTotal', '0.00')
            ->assertJsonPath('stats.cashPaidCount', 0)
            ->assertJsonPath('stats.cashPaidTotal', '0.00');
        $this->assertDatabaseCount('payments', 1);
    }

    public function test_cash_payment_updates_owner_dashboard_and_report_once(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-06 11:00:00', 'Asia/Jakarta'));
        $order = $this->order();
        $this->login();
        $key = (string) Str::uuid();
        $this->postJson("/pos/orders/{$order->id}/cash-payment", $this->payload('30000.00', $key))->assertOk();
        $this->postJson("/pos/orders/{$order->id}/cash-payment", $this->payload('30000.00', $key))->assertOk();
        $this->getJson('/pos/cashier/orders')
            ->assertOk()
            ->assertJsonPath('stats.paidCount', 1)
            ->assertJsonPath('stats.cashPaidCount', 1)
            ->assertJsonPath('stats.cashPaidTotal', '26400.00');
        $this->login(Role::Owner);
        $this->getJson('/dashboard/overview')
            ->assertOk()->assertJsonPath('dashboard.revenueToday', 26400)
            ->assertJsonPath('dashboard.paidToday', 1);
        $this->getJson('/dashboard/report?from=2026-11-06&to=2026-11-06')
            ->assertOk()->assertJsonPath('summary.revenue', 26400)
            ->assertJsonPath('summary.successfulPayments', 1)
            ->assertJsonPath('summary.paidOrders', 1);
    }

    public function test_failed_payment_insert_rolls_back_order_status(): void
    {
        $order = $this->order();
        $this->login();

        Payment::creating(function (): void {
            throw new \RuntimeException('Simulated payment storage outage.');
        });

        try {
            $this->postJson("/pos/orders/{$order->id}/cash-payment", $this->payload())
                ->assertStatus(500);
        } finally {
            Payment::flushEventListeners();
        }

        $this->assertDatabaseCount('payments', 0);
        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => OrderStatus::WaitingPayment->value,
        ]);
    }
}
