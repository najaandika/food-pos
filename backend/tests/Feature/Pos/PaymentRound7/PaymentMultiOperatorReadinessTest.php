<?php

namespace Tests\Feature\Pos\PaymentRound7;

use App\Enums\OrderSource;
use App\Enums\OrderStatus;
use App\Enums\OrderType;
use App\Enums\Role;
use App\Models\Category;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Cross-operator, sequential HTTP reconciliation only.
 *
 * This does not prove concurrent transactions, MySQL row locking, actual
 * independent browser cookies, or loss of the POST response on the network.
 */
class PaymentMultiOperatorReadinessTest extends TestCase
{
    use RefreshDatabase;

    private function payableOrder(): Order
    {
        $category = Category::create(['name' => 'Round 7 QA']);
        $menu = MenuItem::create([
            'category_id' => $category->id,
            'name' => 'Round 7 Beverage',
            'price' => '12000.00',
        ]);
        $order = Order::create([
            'order_number' => 'R7-'.Str::ulid(),
            'customer_name' => 'Round 7 operator handoff',
            'type' => OrderType::Takeaway,
            'source' => OrderSource::Manual,
            'status' => OrderStatus::WaitingPayment,
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

    private function operator(Role $role): User
    {
        return User::factory()->create(['role' => $role, 'email_verified_at' => now(), 'is_active' => true]);
    }

    /** @return array{method:string,received_amount:string,expected_total:string,idempotency_key:string} */
    private function tender(string $key): array
    {
        return [
            'method' => 'cash',
            'received_amount' => '30000.00',
            'expected_total' => '26400.00',
            'idempotency_key' => $key,
        ];
    }

    public function test_stale_second_cashier_observes_conflict_then_recovers_authoritative_receipt(): void
    {
        $order = $this->payableOrder();
        $firstCashier = $this->operator(Role::Kasir);
        $secondCashier = $this->operator(Role::Kasir);
        $firstKey = (string) Str::uuid();
        $staleKey = (string) Str::uuid();
        $postUrl = "/pos/orders/{$order->id}/cash-payment";
        $showUrl = "/pos/cashier/orders/{$order->id}";
        $receiptUrl = "/pos/cashier/orders/{$order->id}/receipt";

        // Second operator reads an order before the first operator settles it.
        $this->actingAs($secondCashier);
        $this->getJson($showUrl)
            ->assertOk()
            ->assertJsonPath('status', 'waiting_payment');
        $this->getJson($receiptUrl)->assertNotFound();

        $this->actingAs($firstCashier);
        $settlement = $this->postJson($postUrl, $this->tender($firstKey))
            ->assertOk()
            ->assertJsonPath('idempotent', false)
            ->assertJsonPath('payment.status', 'paid');
        $paymentId = $settlement->json('payment.id');

        // Stale second operator has a different key: server must not settle twice.
        $this->actingAs($secondCashier);
        $this->postJson($postUrl, $this->tender($staleKey))
            ->assertStatus(409);
        $this->getJson($showUrl)
            ->assertOk()
            ->assertJsonPath('status', 'paid');
        $this->getJson($receiptUrl)
            ->assertOk()
            ->assertJsonPath('payment.id', $paymentId)
            ->assertJsonPath('payment.status', 'paid')
            ->assertJsonPath('payment.cashChange', '3600.00');

        $this->assertDatabaseCount('payments', 1);
        $this->assertDatabaseHas('payments', [
            'id' => $paymentId,
            'order_id' => $order->id,
            'idempotency_key' => $firstKey,
            'status' => 'paid',
        ]);
        $this->assertDatabaseMissing('payments', ['idempotency_key' => $staleKey]);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'paid']);
    }

    public function test_owner_operator_handoff_can_retrieve_receipt_and_replay_original_key_without_new_payment(): void
    {
        $order = $this->payableOrder();
        $cashier = $this->operator(Role::Kasir);
        $owner = $this->operator(Role::Owner);
        $key = (string) Str::uuid();
        $postUrl = "/pos/orders/{$order->id}/cash-payment";
        $showUrl = "/pos/cashier/orders/{$order->id}";
        $receiptUrl = "/pos/cashier/orders/{$order->id}/receipt";

        $this->actingAs($cashier);
        $settlement = $this->postJson($postUrl, $this->tender($key))
            ->assertOk()
            ->assertJsonPath('idempotent', false)
            ->assertJsonPath('status', 'paid');
        $paymentId = $settlement->json('payment.id');
        $originalPayment = Payment::query()->sole();
        $originalPaidAt = $originalPayment->paid_at?->toIso8601String();
        $this->assertNotNull($originalPaidAt);

        // A different authenticated operator accesses fresh HTTP requests.
        // It is not a browser reload or a separate database connection.
        $this->actingAs($owner);
        $this->getJson($showUrl)
            ->assertOk()
            ->assertJsonPath('status', 'paid')
            ->assertJsonPath('paymentMethod', 'cash');
        $this->getJson($receiptUrl)
            ->assertOk()
            ->assertJsonPath('payment.id', $paymentId)
            ->assertJsonPath('payment.paidAt', $originalPaidAt);
        $this->getJson('/pos/cashier/orders?filter=all')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->postJson($postUrl, $this->tender($key))
            ->assertOk()
            ->assertJsonPath('idempotent', true)
            ->assertJsonPath('payment.id', $paymentId);
        $this->getJson($receiptUrl)
            ->assertOk()
            ->assertJsonPath('payment.id', $paymentId);

        $this->assertDatabaseCount('payments', 1);
        $this->assertSame($originalPaidAt, Payment::query()->sole()->paid_at?->toIso8601String());
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'paid']);
    }
}
