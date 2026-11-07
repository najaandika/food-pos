<?php

namespace Tests\Feature\Pos;

use App\Enums\OrderStatus;
use App\Enums\Role;
use App\Enums\TableStatus;
use App\Models\Category;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\RestaurantTable;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ManualServiceWorkspaceTest extends TestCase
{
    use RefreshDatabase;

    private function user(Role $role = Role::Owner): User
    {
        return User::factory()->create(['role' => $role->value, 'is_active' => true]);
    }

    private function table(): RestaurantTable
    {
        return RestaurantTable::create([
            'code' => 'TEST-A01', 'name' => 'Meja Test',
            'area' => 'Indoor', 'seats' => 4,
            'status' => TableStatus::Available,
            'qr_token' => Str::random(64),
        ]);
    }

    private function menu(bool $available = true): MenuItem
    {
        return MenuItem::create([
            'category_id' => Category::create(['name' => 'Minuman', 'is_active' => true])->id,
            'name' => 'Es Kopi',
            'price' => '25000.50',
            'is_available' => $available,
            'image_url' => '/storage/menu/es-kopi.webp',
        ]);
    }

    /** @return array<string, mixed> */
    private function payload(MenuItem $item, string $type = 'dine_in'): array
    {
        return [
            'type' => $type,
            ...($type === 'dine_in' ? ['table_code' => 'TEST-A01'] : []),
            'customer_name' => 'Pelanggan Manual',
            'guests' => 2,
            'items' => [['menu_item_id' => $item->id, 'quantity' => 2, 'notes' => 'Tanpa es']],
        ];
    }

    public function test_staff_catalog_and_table_are_live_without_qr_secret_and_manual_create_has_roles(): void
    {
        $table = $this->table();
        $menu = $this->menu();

        $this->getJson('/pos/service-catalog')->assertUnauthorized();
        $this->actingAs($this->user(Role::Waiters))
            ->getJson('/pos/service-catalog')
            ->assertOk()
            ->assertJsonPath('data.0.id', $menu->id)
            ->assertJsonPath('data.0.imageUrl', '/storage/menu/es-kopi.webp');
        $this->getJson('/pos/service-tables')
            ->assertOk()
            ->assertJsonPath('data.0.id', $table->id)
            ->assertJsonMissingPath('data.0.qr_token');

        $this->postJson('/pos/manual-orders', $this->payload($menu))
            ->assertForbidden();

        $this->actingAs($this->user(Role::Kasir))
            ->postJson('/pos/manual-orders', $this->payload($menu))
            ->assertCreated()
            ->assertJsonPath('source', 'manual')
            ->assertJsonPath('status', 'pending')
            ->assertJsonPath('total', 50001);

        $this->assertDatabaseHas('orders', [
            'table_id' => $table->id,
            'source' => 'manual',
            'subtotal' => '50001.00',
            'total' => '50001.00',
            'status' => 'pending',
        ]);
        $this->assertDatabaseHas('tables', [
            'id' => $table->id,
            'current_order_id' => Order::firstOrFail()->id,
            'status' => TableStatus::Occupied->value,
        ]);
        $this->assertDatabaseHas('order_items', [
            'order_id' => Order::firstOrFail()->id,
            'quantity' => 2,
            'unit_price' => '25000.50',
            'notes' => 'Tanpa es',
        ]);
        $this->getJson('/pos/orders')->assertOk()->assertJsonPath('data.0.source', 'manual');
    }

    public function test_manual_order_rejects_taken_table_invalid_item_price_forgery_and_capacity(): void
    {
        $this->actingAs($this->user(Role::Owner));
        $table = $this->table();
        $item = $this->menu();

        $this->postJson('/pos/manual-orders', [
            ...$this->payload($item),
            'total' => 1,
        ])->assertUnprocessable()->assertJsonValidationErrors('total');

        $this->postJson('/pos/manual-orders', [
            ...$this->payload($item),
            'guests' => 5,
        ])->assertUnprocessable()->assertJsonValidationErrors('guests');

        $this->postJson('/pos/manual-orders', $this->payload($item))->assertCreated();
        $this->postJson('/pos/manual-orders', $this->payload($item))->assertStatus(409);
        $this->assertDatabaseCount('orders', 1);

        $this->postJson('/pos/manual-orders', [
            ...$this->payload($item, 'takeaway'),
            'table_code' => $table->code,
        ])->assertUnprocessable()->assertJsonValidationErrors('table_code');
        $item->update(['is_available' => false]);
        $this->postJson('/pos/manual-orders', $this->payload($item, 'takeaway'))
            ->assertUnprocessable()->assertJsonValidationErrors('items');
    }

    public function test_takeaway_has_no_table_and_waiter_can_acknowledge_call_without_changing_order(): void
    {
        $this->actingAs($this->user(Role::Kasir));
        $item = $this->menu();
        $this->postJson('/pos/manual-orders', $this->payload($item, 'takeaway'))
            ->assertCreated()
            ->assertJsonPath('type', 'takeaway')
            ->assertJsonPath('tableCode', null);

        $this->assertDatabaseHas('orders', [
            'source' => 'manual',
            'type' => 'takeaway',
            'table_id' => null,
        ]);

        $table = $this->table();
        $table->update(['status' => TableStatus::NeedWaiter]);

        $this->patchJson("/pos/service-tables/{$table->id}/acknowledge")
            ->assertForbidden();

        $this->actingAs($this->user(Role::Waiters))
            ->patchJson("/pos/service-tables/{$table->id}/acknowledge")
            ->assertOk()->assertJsonPath('status', 'available');
        $this->patchJson("/pos/service-tables/{$table->id}/acknowledge")
            ->assertStatus(409);

        $this->assertDatabaseHas('orders', [
            'id' => Order::firstOrFail()->id,
            'status' => OrderStatus::Pending->value,
        ]);
    }
}
