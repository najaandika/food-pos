<?php

namespace Tests\Feature\Pos;

use App\Enums\OrderSource;
use App\Enums\OrderStatus;
use App\Enums\OrderType;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\Role;
use App\Enums\TableStatus;
use App\Models\Category;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\RestaurantTable;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class OrderManagementTest extends TestCase
{
    use RefreshDatabase;

    private function staff(Role $role = Role::Owner, bool $active = true): User
    {
        return User::factory()->create(['role' => $role->value, 'is_active' => $active]);
    }

    private function table(): RestaurantTable
    {
        return RestaurantTable::create([
            'code' => 'A01', 'name' => 'Meja A01',
            'area' => 'Indoor', 'seats' => 4,
            'qr_token' => Str::random(64), 'status' => TableStatus::Available,
        ]);
    }

    private function item(): MenuItem
    {
        $category = Category::create(['name' => 'Minuman', 'is_active' => true]);

        return MenuItem::create([
            'category_id' => $category->id,
            'name' => 'Es Teh',
            'price' => '12000.00',
            'is_available' => true,
        ]);
    }

    private function order(?RestaurantTable $table = null, OrderStatus $status = OrderStatus::Pending): Order
    {
        $order = Order::create([
            'order_number' => 'QR-'.Str::ulid(),
            'table_id' => $table?->id,
            'customer_name' => 'Pelanggan',
            'type' => OrderType::DineIn,
            'status' => $status,
            'source' => OrderSource::Qr,
            'guests' => 2,
            'subtotal' => '24000.00',
            'tax' => '0.00',
            'service_charge' => '0.00',
            'total' => '24000.00',
        ]);
        $item = $this->item();
        OrderItem::create([
            'order_id' => $order->id,
            'menu_item_id' => $item->id,
            'quantity' => 2,
            'unit_price' => '12000.00',
        ]);
        if ($table) {
            $table->update(['current_order_id' => $order->id, 'status' => TableStatus::Occupied]);
        }

        return $order;
    }

    public function test_staff_can_read_actual_orders_and_items_but_guests_and_disabled_staff_cannot(): void
    {
        $table = $this->table();
        $order = $this->order($table);

        $this->getJson('/pos/orders')->assertUnauthorized();
        $this->actingAs($this->staff(Role::Waiters, false))
            ->getJson('/pos/orders')->assertUnauthorized();

        $this->actingAs($this->staff(Role::Waiters))
            ->getJson('/pos/orders?per_page=100')
            ->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertJsonPath('data.0.id', $order->id)
            ->assertJsonPath('data.0.orderNumber', $order->order_number)
            ->assertJsonPath('data.0.status', 'pending')
            ->assertJsonPath('data.0.source', 'qr')
            ->assertJsonPath('data.0.tableCode', 'A01')
            ->assertJsonPath('data.0.items.0.name', 'Es Teh')
            ->assertJsonPath('data.0.items.0.quantity', 2)
            ->assertJsonMissingPath('data.0.table.qr_token');

        $this->getJson('/pos/orders?per_page=101')
            ->assertUnprocessable()->assertJsonValidationErrors('per_page');
        $this->getJson("/pos/orders/{$order->id}")
            ->assertOk()->assertJsonPath('id', $order->id);
    }

    public function test_role_limited_status_transitions_persist_with_table_lifecycle(): void
    {
        $table = $this->table();
        $order = $this->order($table);

        $this->actingAs($this->staff(Role::Kasir))
            ->patchJson("/pos/orders/{$order->id}/status", ['status' => 'accepted'])
            ->assertForbidden();
        $this->actingAs($this->staff(Role::Waiters))
            ->patchJson("/pos/orders/{$order->id}/status", ['status' => 'preparing'])
            ->assertStatus(409);

        foreach ([
            'accepted' => 'preparing',
            'preparing' => 'preparing',
            'ready' => 'ready',
            'served' => 'waiting_payment',
            'waiting_payment' => 'waiting_payment',
        ] as $status => $tableStatus) {
            $this->patchJson("/pos/orders/{$order->id}/status", ['status' => $status])
                ->assertOk()->assertJsonPath('status', $status);
            $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => $status]);
            $this->assertDatabaseHas('tables', ['id' => $table->id, 'status' => $tableStatus]);
        }

        $this->patchJson("/pos/orders/{$order->id}/status", ['status' => 'paid'])
            ->assertStatus(409);
        $this->patchJson("/pos/orders/{$order->id}/status", ['status' => 'preparing'])
            ->assertStatus(409);
        $this->patchJson("/pos/orders/{$order->id}/status", ['status' => 'weird'])
            ->assertUnprocessable()->assertJsonValidationErrors('status');
    }

    public function test_cash_payment_is_atomic_cannot_duplicate_and_releases_table(): void
    {
        $table = $this->table();
        $order = $this->order($table, OrderStatus::WaitingPayment);

        $this->actingAs($this->staff(Role::Waiters))
            ->postJson("/pos/orders/{$order->id}/cash-payment", ['method' => 'cash'])
            ->assertForbidden();

        $this->actingAs($this->staff(Role::Kasir))
            ->postJson("/pos/orders/{$order->id}/cash-payment", ['method' => 'qris'])
            ->assertUnprocessable()->assertJsonValidationErrors('method');

        $this->postJson("/pos/orders/{$order->id}/cash-payment", ['method' => 'cash', 'received_amount' => '24000.00'])
            ->assertOk()->assertJsonPath('status', 'paid')
            ->assertJsonPath('paymentMethod', 'cash');
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'paid']);
        $this->assertDatabaseHas('payments', [
            'order_id' => $order->id,
            'method' => PaymentMethod::Cash->value,
            'status' => PaymentStatus::Paid->value,
            'amount' => '24000.00',
        ]);
        $this->assertDatabaseHas('tables', [
            'id' => $table->id,
            'current_order_id' => null,
            'status' => TableStatus::Available->value,
        ]);

        $this->postJson("/pos/orders/{$order->id}/cash-payment", ['method' => 'cash', 'received_amount' => '24000.00'])
            ->assertStatus(409);
        $this->assertDatabaseCount('payments', 1);
    }

    public function test_qr_guest_order_appears_on_live_orders_api_and_paid_order_disappears_from_active_table(): void
    {
        $table = $this->table();
        $item = $this->item();

        $this->postJson("/api/qr/{$table->qr_token}/orders", [
            'customer_name' => 'Pesanan dari QR',
            'guests' => 2,
            'items' => [['menu_item_id' => $item->id, 'quantity' => 1]],
        ])->assertCreated();

        $order = Order::query()->firstOrFail();
        $this->actingAs($this->staff(Role::Owner))
            ->getJson('/pos/orders')->assertOk()
            ->assertJsonPath('data.0.id', $order->id)
            ->assertJsonPath('data.0.customerName', 'Pesanan dari QR');

        foreach (['accepted', 'preparing', 'ready', 'served', 'waiting_payment'] as $status) {
            $this->patchJson("/pos/orders/{$order->id}/status", ['status' => $status])
                ->assertOk();
        }

        $this->postJson("/pos/orders/{$order->id}/cash-payment", ['method' => 'cash', 'received_amount' => (string) $order->total])
            ->assertOk()->assertJsonPath('status', 'paid');
        $this->assertNull($table->fresh()->current_order_id);
        $this->assertSame(TableStatus::Available, $table->fresh()->status);
    }
}
