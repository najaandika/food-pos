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
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

class PaymentCorrectnessRound6Test extends TestCase
{
    use RefreshDatabase;

    private function order(OrderStatus $status = OrderStatus::WaitingPayment): Order
    {
        $category = Category::firstOrCreate(['name' => 'Round 6 QA']);
        $menu = MenuItem::firstOrCreate(['name' => 'QA Beverage'], [
            'category_id' => $category->id,
            'price' => '12000.00',
        ]);

        $order = Order::create([
            'order_number' => 'R6-'.Str::ulid(),
            'customer_name' => 'Payment QA',
            'type' => OrderType::Takeaway,
            'source' => OrderSource::Manual,
            'status' => $status,
            'subtotal' => '24000.00',
            'tax' => '2400.00',
            'service_charge' => '0.00',
            'total' => '26400.00',
        ]);
        $order->items()->create([
            'menu_item_id' => $menu->id,
            'quantity' => 2,
            'unit_price' => '12000.00',
        ]);

        return $order;
    }

    private function login(Role $role = Role::Kasir, bool $active = true, bool $verified = true): void
    {
        $this->actingAs(User::factory()->create([
            'role' => $role,
            'is_active' => $active,
            'email_verified_at' => $verified ? now() : null,
        ]));
    }

    /** @return array{method:string,received_amount:string,expected_total:string,idempotency_key:string} */
    private function payload(string $key, string $received = '30000.00'): array
    {
        return [
            'method' => 'cash',
            'received_amount' => $received,
            'expected_total' => '26400.00',
            'idempotency_key' => $key,
        ];
    }

    public function test_same_key_replays_same_settlement_and_different_key_conflicts_without_duplicate_payment(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-06 11:00:00', 'Asia/Jakarta'));
        $order = $this->order();
        $this->login();
        $url = "/pos/orders/{$order->id}/cash-payment";
        $key = (string) Str::uuid();

        $first = $this->postJson($url, $this->payload($key))
            ->assertOk()
            ->assertJsonPath('status', 'paid')
            ->assertJsonPath('idempotent', false)
            ->assertJsonPath('payment.status', 'paid')
            ->assertJsonPath('payment.method', 'cash')
            ->assertJsonPath('payment.amount', '26400.00')
            ->assertJsonPath('payment.cashReceived', '30000.00')
            ->assertJsonPath('payment.cashChange', '3600.00');
        $this->assertSame("/pos/cashier/orders/{$order->id}/receipt", $first->json('receiptUrl'));

        $replay = $this->postJson($url, $this->payload($key))
            ->assertOk()
            ->assertJsonPath('idempotent', true)
            ->assertJsonPath('status', 'paid');
        $this->assertSame($first->json('payment.id'), $replay->json('payment.id'));
        $this->assertSame($first->json('receiptUrl'), $replay->json('receiptUrl'));

        $this->postJson($url, $this->payload((string) Str::uuid()))
            ->assertStatus(409);
        $this->postJson($url, $this->payload($key, '40000.00'))
            ->assertStatus(409);

        $this->assertDatabaseCount('payments', 1);
        $this->assertDatabaseHas('payments', [
            'order_id' => $order->id,
            'idempotency_key' => $key,
            'amount' => '26400.00',
            'cash_received' => '30000.00',
            'cash_change' => '3600.00',
            'status' => 'paid',
        ]);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'paid']);
    }

    public function test_idempotency_key_cannot_pay_another_order(): void
    {
        $first = $this->order();
        $second = $this->order();
        $key = (string) Str::uuid();
        $this->login(Role::Owner);

        $this->postJson("/pos/orders/{$first->id}/cash-payment", $this->payload($key))
            ->assertOk()->assertJsonPath('idempotent', false);
        $this->postJson("/pos/orders/{$second->id}/cash-payment", $this->payload($key))
            ->assertStatus(409);

        $this->assertDatabaseCount('payments', 1);
        $this->assertDatabaseHas('orders', ['id' => $first->id, 'status' => 'paid']);
        $this->assertDatabaseHas('orders', ['id' => $second->id, 'status' => 'waiting_payment']);
        $this->assertDatabaseMissing('payments', ['order_id' => $second->id]);
    }

    public function test_invalid_cash_inputs_and_stale_total_never_write_payment(): void
    {
        $order = $this->order();
        $this->login();
        $url = "/pos/orders/{$order->id}/cash-payment";
        $key = (string) Str::uuid();

        foreach ([
            [['method' => 'qris'], 'method'],
            [['method' => 'transfer'], 'method'],
            [['received_amount' => 'invalid'], 'received_amount'],
            [['received_amount' => '30000.001'], 'received_amount'],
            [['received_amount' => ''], 'received_amount'],
            [['idempotency_key' => 'not-a-uuid'], 'idempotency_key'],
        ] as [$override, $field]) {
            $this->postJson($url, array_replace($this->payload($key), $override))
                ->assertUnprocessable()
                ->assertJsonValidationErrors($field);
        }
        $this->postJson($url, $this->payload($key, '26000.00'))
            ->assertUnprocessable()->assertJsonValidationErrors('received_amount');
        $this->postJson($url, [
            ...$this->payload($key), 'expected_total' => '25000.00',
        ])->assertStatus(409);

        $this->assertDatabaseCount('payments', 0);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'waiting_payment']);
    }

    public function test_non_payable_and_already_paid_order_conflicts_keep_settlement_unique(): void
    {
        $pending = $this->order(OrderStatus::Pending);
        $paidWithoutPayment = $this->order(OrderStatus::Paid);
        $settled = $this->order();
        $this->login();

        $this->postJson("/pos/orders/{$pending->id}/cash-payment", $this->payload((string) Str::uuid()))
            ->assertStatus(409);
        $this->postJson("/pos/orders/{$paidWithoutPayment->id}/cash-payment", $this->payload((string) Str::uuid()))
            ->assertStatus(409);
        $this->postJson("/pos/orders/{$settled->id}/cash-payment", $this->payload((string) Str::uuid()))
            ->assertOk();
        $this->postJson("/pos/orders/{$settled->id}/cash-payment", $this->payload((string) Str::uuid()))
            ->assertStatus(409);
        $this->postJson('/pos/orders/999999/cash-payment', $this->payload((string) Str::uuid()))
            ->assertNotFound();

        $this->assertDatabaseCount('payments', 1);
        $this->assertDatabaseHas('orders', ['id' => $pending->id, 'status' => 'pending']);
        $this->assertDatabaseHas('orders', ['id' => $paidWithoutPayment->id, 'status' => 'paid']);
    }

    public function test_receipt_is_read_only_and_retrieval_remains_repeatable_after_confirmed_payment(): void
    {
        $order = $this->order();
        $this->login();
        $receiptUrl = "/pos/cashier/orders/{$order->id}/receipt";

        $this->getJson($receiptUrl)->assertNotFound();
        $settlement = $this->postJson("/pos/orders/{$order->id}/cash-payment", $this->payload((string) Str::uuid()))
            ->assertOk()->assertJsonPath('idempotent', false);
        $this->assertSame($receiptUrl, $settlement->json('receiptUrl'));

        $firstReceipt = $this->getJson($receiptUrl)
            ->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertJsonPath('orderNumber', $order->order_number)
            ->assertJsonPath('status', 'paid')
            ->assertJsonPath('payment.amount', '26400.00')
            ->assertJsonPath('payment.status', 'paid')
            ->assertJsonPath('payment.cashChange', '3600.00')
            ->assertJsonPath('items.0.quantity', 2);
        $secondReceipt = $this->getJson($receiptUrl)
            ->assertOk()
            ->assertJsonPath('payment.id', $firstReceipt->json('payment.id'));
        $this->assertSame($firstReceipt->json(), $secondReceipt->json());
        $this->assertDatabaseCount('payments', 1);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'paid']);
    }

    public function test_simulated_receipt_get_500_does_not_undo_paid_status_or_trigger_another_post(): void
    {
        $order = $this->order();
        $this->login();
        $key = (string) Str::uuid();
        $url = "/pos/orders/{$order->id}/cash-payment";
        $receiptUrl = "/pos/cashier/orders/{$order->id}/receipt";

        $this->postJson($url, $this->payload($key))
            ->assertOk()->assertJsonPath('payment.status', 'paid');
        $payment = Payment::query()->sole();

        // Only this test's in-memory route pipeline is modified. The actual
        // application route/controller is not edited. Simulates an HTTP GET
        // error, not a database failure or real network timeout.
        PaymentRound6ReceiptFailureOnce::$failNext = true;
        Route::getRoutes()->getByName('pos.cashier.receipt')
            ->middleware(PaymentRound6ReceiptFailureOnce::class);

        $this->getJson($receiptUrl)->assertStatus(500);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'paid']);
        $this->assertDatabaseCount('payments', 1);
        $this->assertSame($payment->id, Payment::query()->sole()->id);

        $this->getJson($receiptUrl)
            ->assertOk()
            ->assertJsonPath('payment.id', $payment->id)
            ->assertJsonPath('payment.status', 'paid');
        $this->getJson("/pos/cashier/orders/{$order->id}")
            ->assertOk()->assertJsonPath('status', 'paid');
        $this->assertDatabaseCount('payments', 1);
    }

    public function test_lost_post_response_after_commit_can_be_resolved_by_status_and_idempotent_retry(): void
    {
        $order = $this->order();
        $this->login();
        $key = (string) Str::uuid();
        $url = "/pos/orders/{$order->id}/cash-payment";

        // Deliberately discard the first HTTP response, modelling a client
        // that never received the 200 after persistence. This is NOT a socket
        // timeout or an actual concurrent MySQL transaction test.
        $this->postJson($url, $this->payload($key));
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'paid']);
        $this->assertDatabaseCount('payments', 1);
        $originalPaymentId = Payment::query()->sole()->id;

        $this->getJson("/pos/cashier/orders/{$order->id}")
            ->assertOk()->assertJsonPath('status', 'paid');
        $this->getJson("/pos/cashier/orders/{$order->id}/receipt")
            ->assertOk()->assertJsonPath('payment.id', $originalPaymentId);
        $this->postJson($url, $this->payload($key))
            ->assertOk()
            ->assertJsonPath('idempotent', true)
            ->assertJsonPath('payment.id', $originalPaymentId);
        $this->postJson($url, $this->payload((string) Str::uuid()))
            ->assertStatus(409);
        $this->assertDatabaseCount('payments', 1);
    }

    public function test_authorization_and_validation_guard_cash_payment_and_receipt(): void
    {
        $order = $this->order();
        $paymentUrl = "/pos/orders/{$order->id}/cash-payment";
        $receiptUrl = "/pos/cashier/orders/{$order->id}/receipt";
        $payload = $this->payload((string) Str::uuid());

        $this->postJson($paymentUrl, $payload)->assertUnauthorized();
        $this->getJson($receiptUrl)->assertUnauthorized();

        $this->login(Role::Waiters);
        $this->postJson($paymentUrl, $payload)->assertForbidden();
        $this->getJson($receiptUrl)->assertForbidden();

        $this->login(Role::Kasir, active: false);
        $this->postJson($paymentUrl, $payload)->assertUnauthorized();
        $this->getJson($receiptUrl)->assertUnauthorized();

        $this->login(Role::Kasir, verified: false);
        $this->postJson($paymentUrl, $payload)->assertForbidden();
        $this->getJson($receiptUrl)->assertForbidden();

        $this->login(Role::Owner);
        $this->postJson($paymentUrl, $payload)->assertOk();
        $this->getJson($receiptUrl)->assertOk();
        $this->assertDatabaseCount('payments', 1);

        // Inspect the existing web/auth/verified/role middleware; Laravel
        // disables CSRF verification in PHPUnit, so this is NOT an assertion
        // that real-browser CSRF enforcement was exercised.
        $route = Route::getRoutes()->getByName('pos.orders.cash-payment');
        $this->assertContains('web', $route->gatherMiddleware());
        $this->assertContains('auth', $route->gatherMiddleware());
        $this->assertContains('verified', $route->gatherMiddleware());
        $this->assertContains('staff.role:owner,kasir', $route->gatherMiddleware());
    }
}

/** Test-only middleware to fail one receipt GET without mutating a payment. */
final class PaymentRound6ReceiptFailureOnce
{
    public static bool $failNext = false;

    public function handle(Request $request, Closure $next): Response
    {
        if (self::$failNext) {
            self::$failNext = false;

            return response()->json(['message' => 'Simulated receipt GET failure'], 500);
        }

        /** @var Response $response */
        $response = $next($request);

        return $response;
    }
}
