<?php

namespace Tests\Feature\Pos;

use App\Enums\OrderSource;
use App\Enums\OrderStatus;
use App\Enums\TableStatus;
use App\Models\Category;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\RestaurantTable;
use App\Services\Pos\RestaurantTableService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class PublicQrOrderingTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_scan_qr_and_see_only_active_available_catalog_without_table_secrets(): void
    {
        $table = $this->table();
        $active = Category::create(['name' => 'Makanan', 'sort_order' => 1, 'is_active' => true]);
        $inactive = Category::create(['name' => 'Rahasia', 'sort_order' => 2, 'is_active' => false]);
        $menu = $this->item($active, 'Nasi Goreng', '12500.75');
        $this->item($active, 'Habis', '13000.00', false);
        $this->item($inactive, 'Tersembunyi', '20000.00');

        $this->getJson("/api/qr/{$table->qr_token}/menu")
            ->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertJsonPath('table.code', 'A01')
            ->assertJsonPath('can_order', true)
            ->assertJsonCount(1, 'categories')
            ->assertJsonCount(1, 'categories.0.items')
            ->assertJsonPath('categories.0.items.0.id', $menu->id)
            ->assertJsonPath('categories.0.items.0.price', '12500.75')
            ->assertJsonMissingPath('table.qr_token')
            ->assertJsonMissingPath('table.current_order_id')
            ->assertDontSee($table->qr_token);
    }

    public function test_qr_token_is_case_sensitive_and_rotation_revokes_old_access(): void
    {
        $table = $this->table();
        $token = $table->qr_token;
        $this->getJson('/api/qr/'.strtolower($token).'/menu')->assertNotFound();
        $this->getJson('/api/qr/'.strtoupper($token).'/menu')->assertNotFound();

        app(RestaurantTableService::class)->rotateQrToken($table);
        $table->refresh();

        $this->getJson("/api/qr/{$token}/menu")->assertNotFound();
        $this->getJson("/api/qr/{$table->qr_token}/menu")->assertOk();
    }

    public function test_inactive_table_is_not_accessible_and_occupied_table_cannot_accept_new_orders(): void
    {
        $table = $this->table();
        $category = Category::create(['name' => 'Minuman', 'is_active' => true]);
        $menu = $this->item($category);
        $payload = $this->payload($menu);

        $table->update(['status' => TableStatus::Inactive]);
        $this->getJson("/api/qr/{$table->qr_token}/menu")->assertNotFound();
        $this->postJson("/api/qr/{$table->qr_token}/orders", $payload)->assertNotFound();

        $table->update(['status' => TableStatus::Occupied]);
        $this->getJson("/api/qr/{$table->qr_token}/menu")
            ->assertOk()->assertJsonPath('can_order', false);
        $this->postJson("/api/qr/{$table->qr_token}/orders", $payload)->assertStatus(409);
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_guest_can_create_one_pending_order_with_server_prices_and_update_table_lifecycle(): void
    {
        $table = $this->table();
        $category = Category::create(['name' => 'Makanan', 'is_active' => true]);
        $first = $this->item($category, 'Nasi', '12500.75');
        $second = $this->item($category, 'Minum', '7500.10');
        $payload = $this->payload($first);
        $payload['items'] = [
            ['menu_item_id' => $first->id, 'quantity' => 2, 'notes' => 'Tidak pedas'],
            ['menu_item_id' => $second->id, 'quantity' => 1],
        ];

        $created = $this->postJson("/api/qr/{$table->qr_token}/orders", $payload)
            ->assertCreated()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertJsonPath('status', OrderStatus::Pending->value)
            ->assertJsonPath('total', '32501.60')
            ->assertJsonPath('subtotal', '32501.60')
            ->assertJsonPath('tax', '0.00')
            ->assertJsonPath('service_charge', '0.00')
            ->assertJsonPath('items.0.unit_price', '12500.75')
            ->assertJsonPath('items.1.unit_price', '7500.10')
            ->assertJsonMissingPath('table.qr_token')
            ->assertDontSee($table->qr_token);

        $order = Order::firstOrFail();
        $this->assertStringStartsWith('QR-', $created->json('order_number'));
        $this->assertSame(OrderSource::Qr, $order->source);
        $this->assertSame(OrderStatus::Pending, $order->status);
        $this->assertSame('32501.60', $order->total);
        $this->assertSame($table->id, $order->table_id);
        $this->assertDatabaseHas('order_items', [
            'order_id' => $order->id,
            'menu_item_id' => $first->id,
            'quantity' => 2,
            'unit_price' => '12500.75',
        ]);
        $this->assertDatabaseCount('order_items', 2);
        $this->assertSame($order->id, $table->fresh()->current_order_id);
        $this->assertSame(TableStatus::Occupied, $table->fresh()->status);

        $this->postJson("/api/qr/{$table->qr_token}/orders", $payload)->assertStatus(409);
        $this->assertDatabaseCount('orders', 1);
    }

    public function test_public_order_validation_rejects_tampered_totals_duplicate_items_and_excess_guests(): void
    {
        $table = $this->table();
        $category = Category::create(['name' => 'Snacks', 'is_active' => true]);
        $item = $this->item($category);
        $payload = $this->payload($item);

        $this->postJson("/api/qr/{$table->qr_token}/orders", [
            ...$payload,
            'total' => '0.01',
            'items' => [['menu_item_id' => $item->id, 'quantity' => 1, 'unit_price' => '0.01']],
        ])->assertUnprocessable()->assertJsonValidationErrors(['total', 'items.0.unit_price']);

        $this->postJson("/api/qr/{$table->qr_token}/orders", [
            ...$payload,
            'items' => [
                ['menu_item_id' => $item->id, 'quantity' => 1],
                ['menu_item_id' => $item->id, 'quantity' => 2],
            ],
        ])->assertUnprocessable()->assertJsonValidationErrors('items.0.menu_item_id');

        $this->postJson("/api/qr/{$table->qr_token}/orders", [
            ...$payload,
            'guests' => 5,
        ])->assertUnprocessable()->assertJsonValidationErrors('guests');

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_unavailable_or_inactive_catalog_items_cannot_be_ordered(): void
    {
        $table = $this->table();
        $category = Category::create(['name' => 'Aktif', 'is_active' => true]);
        $hiddenCategory = Category::create(['name' => 'Nonaktif', 'is_active' => false]);
        $unavailable = $this->item($category, 'Habis', '15000.00', false);
        $hidden = $this->item($hiddenCategory, 'Tersembunyi', '12000.00');

        $this->postJson("/api/qr/{$table->qr_token}/orders", $this->payload($unavailable))
            ->assertUnprocessable()->assertJsonValidationErrors('items');
        $this->postJson("/api/qr/{$table->qr_token}/orders", $this->payload($hidden))
            ->assertUnprocessable()->assertJsonValidationErrors('items');
        $this->postJson("/api/qr/{$table->qr_token}/orders", [
            'customer_name' => 'Pengunjung',
            'guests' => 1,
            'items' => [['menu_item_id' => 900099, 'quantity' => 1]],
        ])->assertUnprocessable()->assertJsonValidationErrors('items');
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_inconsistent_active_order_blocks_new_order_even_if_table_marked_available(): void
    {
        $table = $this->table();
        $category = Category::create(['name' => 'Minuman', 'is_active' => true]);
        $item = $this->item($category);

        Order::create([
            'order_number' => 'EXISTING-PENDING',
            'table_id' => $table->id,
            'customer_name' => 'Pertama',
            'type' => 'dine_in',
            'status' => OrderStatus::Pending,
            'source' => 'manual',
            'guests' => 1,
            'subtotal' => '0.00',
            'total' => '0.00',
        ]);

        $this->getJson("/api/qr/{$table->qr_token}/menu")->assertOk()->assertJsonPath('can_order', false);
        $this->postJson("/api/qr/{$table->qr_token}/orders", $this->payload($item))->assertStatus(409);
        $this->assertDatabaseCount('orders', 1);
    }

    private function table(): RestaurantTable
    {
        return RestaurantTable::create([
            'code' => 'A01',
            'name' => 'Meja A01',
            'area' => 'Indoor',
            'seats' => 4,
            'qr_token' => Str::random(64),
            'status' => TableStatus::Available,
        ]);
    }

    private function item(
        Category $category,
        string $name = 'Es Teh',
        string $price = '5000.00',
        bool $available = true,
    ): MenuItem {
        return MenuItem::create([
            'category_id' => $category->id,
            'name' => $name,
            'price' => $price,
            'is_available' => $available,
        ]);
    }

    /** @return array<string, mixed> */
    private function payload(MenuItem $item): array
    {
        return [
            'customer_name' => 'Pengunjung',
            'guests' => 2,
            'items' => [['menu_item_id' => $item->id, 'quantity' => 1]],
        ];
    }
}
