<?php

namespace Tests\Feature\Pos;

use App\Enums\OrderStatus;
use App\Enums\Role;
use App\Enums\TableStatus;
use App\Models\Category;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\RestaurantTable;
use App\Models\User;
use App\Services\Pos\RestaurantTableService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PosCatalogManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_active_owner_can_manage_catalog_and_qr_secrets(): void
    {
        $category = Category::create(['name' => 'Minuman']);
        $table = $this->table('A01');
        $waiter = User::factory()->create(['role' => Role::Waiters->value]);
        $inactiveOwner = User::factory()->create(['role' => Role::Owner->value, 'is_active' => false]);

        $this->getJson('/pos/categories')->assertUnauthorized();
        $this->actingAs($waiter)->getJson('/pos/categories')->assertForbidden();
        $this->actingAs($waiter)->postJson('/pos/categories', ['name' => 'Lainnya'])->assertForbidden();
        $this->actingAs($waiter)->deleteJson("/pos/categories/{$category->id}")->assertForbidden();
        $this->actingAs($waiter)->getJson("/pos/tables/{$table->id}/qr-token")->assertForbidden();
        $this->actingAs($waiter)->postJson("/pos/tables/{$table->id}/rotate-qr-token")->assertForbidden();
        $this->actingAs($inactiveOwner)->getJson('/pos/menu-items')->assertUnauthorized();
        $this->assertDatabaseHas('categories', ['id' => $category->id]);

        // Tests now exercise the registered owner-only routes.
        $this->actingAs($this->owner())->getJson('/pos/categories')->assertOk();
    }

    public function test_category_crud_and_uniqueness_without_timestamps(): void
    {
        $this->actingAs($this->owner());
        $created = $this->postJson('/pos/categories', [
            'name' => 'Makanan',
            'sort_order' => 3,
            'is_active' => true,
        ])->assertCreated()->assertJsonPath('name', 'Makanan');
        $id = $created->json('id');

        $this->assertDatabaseHas('categories', ['id' => $id, 'sort_order' => 3]);
        $this->getJson('/pos/categories')->assertOk()->assertJsonPath('data.0.id', $id);
        $this->getJson("/pos/categories/{$id}")->assertOk()->assertJsonPath('name', 'Makanan');
        $this->patchJson("/pos/categories/{$id}", [
            'name' => 'Makanan Berat',
            'is_active' => false,
        ])->assertOk()->assertJsonPath('is_active', false);
        $this->postJson('/pos/categories', ['name' => 'Makanan Berat'])
            ->assertUnprocessable()->assertJsonValidationErrors('name');

        $this->deleteJson("/pos/categories/{$id}")->assertNoContent();
        $this->assertDatabaseMissing('categories', ['id' => $id]);
    }

    public function test_category_delete_rejects_referenced_menu_items(): void
    {
        $this->actingAs($this->owner());
        $category = Category::create(['name' => 'Snacks']);
        $menu = $this->menu($category);

        $this->deleteJson("/pos/categories/{$category->id}")->assertStatus(409);
        $this->assertDatabaseHas('categories', ['id' => $category->id]);
        $this->assertDatabaseHas('menu_items', ['id' => $menu->id]);
    }

    public function test_menu_item_crud_validates_category_prices_and_optional_fields(): void
    {
        $this->actingAs($this->owner());
        $category = Category::create(['name' => 'Sarapan']);

        $created = $this->postJson('/pos/menu-items', [
            'category_id' => $category->id,
            'name' => 'Nasi Goreng',
            'description' => 'Porsi besar',
            'price' => '12500.75',
            'old_price' => '15000.00',
            'image_url' => '/storage/menu/nasi-goreng-kampung.webp',
            'is_best_seller' => true,
        ])->assertCreated()->assertJsonPath('price', '12500.75')
            ->assertJsonPath('image_url', '/storage/menu/nasi-goreng-kampung.webp')
            ->assertJsonPath('category.id', $category->id);
        $id = $created->json('id');

        $this->getJson("/pos/menu-items/{$id}")->assertOk()->assertJsonPath('price', '12500.75');
        $this->patchJson("/pos/menu-items/{$id}", [
            'price' => '13250.50',
            'description' => null,
            'image_url' => '/storage/menu/edited.webp',
            'is_available' => false,
        ])->assertOk()->assertJsonPath('price', '13250.50')
            ->assertJsonPath('image_url', '/storage/menu/edited.webp')
            ->assertJsonPath('is_available', false);

        $this->postJson('/pos/menu-items', [
            'category_id' => 987654,
            'name' => 'Invalid',
            'price' => '1.999',
        ])->assertUnprocessable()->assertJsonValidationErrors(['category_id', 'price']);
        $this->patchJson("/pos/menu-items/{$id}", ['price' => '10000000000.00'])
            ->assertUnprocessable()->assertJsonValidationErrors('price');
        $this->patchJson("/pos/menu-items/{$id}", ['image_url' => 'javascript:alert(1)'])
            ->assertUnprocessable()->assertJsonValidationErrors('image_url');

        $this->deleteJson("/pos/menu-items/{$id}")->assertNoContent();
        $this->assertDatabaseMissing('menu_items', ['id' => $id]);
    }

    public function test_menu_item_delete_rejects_sales_history_but_disabling_is_allowed(): void
    {
        $this->actingAs($this->owner());
        $menu = $this->menu(Category::create(['name' => 'Drinks']));
        $order = $this->order(null, 'HISTORY-1');
        OrderItem::create([
            'order_id' => $order->id,
            'menu_item_id' => $menu->id,
            'quantity' => 1,
            'unit_price' => '12000.00',
        ]);

        $this->deleteJson("/pos/menu-items/{$menu->id}")->assertStatus(409);
        $this->patchJson("/pos/menu-items/{$menu->id}", ['is_available' => false])
            ->assertOk()->assertJsonPath('is_available', false);
        $this->assertDatabaseHas('menu_items', ['id' => $menu->id]);
    }

    public function test_menu_listing_filters_by_category(): void
    {
        $this->actingAs($this->owner());
        $first = Category::create(['name' => 'A']);
        $second = Category::create(['name' => 'B']);
        $menu = $this->menu($first);
        $this->menu($second);

        $this->getJson("/pos/menu-items?category_id={$first->id}&per_page=10")
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $menu->id);
        $this->getJson('/pos/menu-items?per_page=1000')
            ->assertUnprocessable()->assertJsonValidationErrors('per_page');
    }

    public function test_table_crud_generates_token_and_never_exposes_secret_in_regular_responses(): void
    {
        $this->actingAs($this->owner());
        $created = $this->postJson('/pos/tables', [
            'code' => 'B01',
            'name' => 'Meja B01',
            'area' => 'Terrace',
            'seats' => 4,
        ])->assertCreated()->assertJsonMissingPath('qr_token')
            ->assertJsonPath('status', TableStatus::Available->value);
        $id = $created->json('id');
        $this->assertSame(64, strlen(RestaurantTable::findOrFail($id)->qr_token));

        $this->getJson('/pos/tables')->assertOk()->assertJsonMissingPath('data.0.qr_token');
        $this->getJson("/pos/tables/{$id}")->assertOk()->assertJsonMissingPath('qr_token');
        $this->patchJson("/pos/tables/{$id}", [
            'name' => 'Meja B01 - Baru',
            'seats' => 6,
        ])->assertOk()->assertJsonMissingPath('qr_token')
            ->assertJsonPath('seats', 6);
        $this->postJson('/pos/tables', ['code' => 'B01', 'name' => 'Duplicate'])
            ->assertUnprocessable()->assertJsonValidationErrors('code');

        $this->deleteJson("/pos/tables/{$id}")->assertNoContent();
        $this->assertDatabaseMissing('tables', ['id' => $id]);
    }

    public function test_table_form_request_rejects_manipulation_of_operational_fields(): void
    {
        $this->actingAs($this->owner());
        $table = $this->table('C01');
        $this->postJson('/pos/tables', [
            'code' => 'C02', 'name' => 'C02', 'qr_token' => 'attacker-chosen',
        ])->assertUnprocessable()->assertJsonValidationErrors('qr_token');
        $this->patchJson("/pos/tables/{$table->id}", [
            'current_order_id' => 123,
            'scans_today' => 999,
        ])->assertUnprocessable()->assertJsonValidationErrors(['current_order_id', 'scans_today']);
        $this->patchJson("/pos/tables/{$table->id}", ['status' => 'undefined'])
            ->assertUnprocessable()->assertJsonValidationErrors('status');
    }

    public function test_qr_token_is_retrievable_rotatable_and_case_sensitive(): void
    {
        $this->actingAs($this->owner());
        $table = $this->table('D01');
        $oldToken = $table->qr_token;
        $service = app(RestaurantTableService::class);

        $this->getJson("/pos/tables/{$table->id}/qr-token")
            ->assertOk()->assertJsonPath('qr_token', $oldToken);
        $rotated = $this->postJson("/pos/tables/{$table->id}/rotate-qr-token")
            ->assertOk();
        $newToken = $rotated->json('qr_token');

        $this->assertNotSame($oldToken, $newToken);
        $this->assertSame(64, strlen($newToken));
        $this->assertNull($service->resolveQrToken($oldToken));
        $this->assertSame($table->id, $service->resolveQrToken($newToken)?->id);
        $this->assertNull($service->resolveQrToken(strtolower($newToken)));

        // Rotating an Owner QR must revoke the actual guest entry page too,
        // not just its menu API. Historical orders remain intact.
        $this->get("/table/{$oldToken}")->assertNotFound();
        $this->get("/table/{$newToken}")->assertOk();

        $this->postJson("/pos/tables/{$table->id}/rotate-qr-token", [
            'qr_token' => 'client-selected',
        ])->assertUnprocessable()->assertJsonValidationErrors('qr_token');
        $this->assertSame($newToken, $table->fresh()->qr_token);
    }

    public function test_active_order_prevents_table_status_edit_and_deletion(): void
    {
        $this->actingAs($this->owner());
        $table = $this->table('E01');
        $order = $this->order($table, 'ACTIVE-1');

        $this->patchJson("/pos/tables/{$table->id}", ['status' => TableStatus::Available->value])
            ->assertStatus(409);
        $this->deleteJson("/pos/tables/{$table->id}")->assertStatus(409);

        // Even a stale logical current_order_id pointer must not be ignored.
        $order->update(['status' => OrderStatus::Paid]);
        $table->update(['current_order_id' => $order->id]);
        $this->deleteJson("/pos/tables/{$table->id}")->assertStatus(409);
    }

    public function test_deleting_table_detaches_historical_orders_without_deleting_them(): void
    {
        $this->actingAs($this->owner());
        $table = $this->table('F01');
        $order = $this->order($table, 'HISTORY-2', OrderStatus::Paid);

        $this->deleteJson("/pos/tables/{$table->id}")->assertNoContent();
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'table_id' => null]);
    }

    public function test_menu_list_sold_today_counts_paid_units_not_pending_orders(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-06 14:00:00', 'Asia/Jakarta'));
        $this->actingAs($this->owner());
        $menu = $this->menu(Category::create(['name' => 'Laris Hari Ini']));

        $paid = $this->order(null, 'PAID-TODAY-1', OrderStatus::Paid);
        $pending = $this->order(null, 'PENDING-TODAY-1');
        $yesterday = $this->order(null, 'PAID-YESTERDAY-1', OrderStatus::Paid);
        $yesterday->forceFill([
            'created_at' => now('Asia/Jakarta')->subDay()->utc(),
        ])->save();

        foreach ([[$paid, 3], [$pending, 5], [$yesterday, 9]] as [$order, $quantity]) {
            OrderItem::create([
                'order_id' => $order->id,
                'menu_item_id' => $menu->id,
                'quantity' => $quantity,
                'unit_price' => '12000.00',
            ]);
        }

        $this->getJson('/pos/menu-items?per_page=100')
            ->assertOk()
            ->assertJsonPath('data.0.sold_today', 3);
    }

    public function test_qr_landing_page_records_real_scans_and_resets_counter_at_jakarta_midnight(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-06 14:00:00', 'Asia/Jakarta'));
        $this->actingAs($this->owner());
        $table = $this->table('SCAN01');
        $table->update(['qr_token' => str_repeat('Q', 64)]);

        $this->getJson("/api/qr/{$table->qr_token}/menu")->assertOk();
        $this->getJson('/pos/tables')->assertOk()->assertJsonPath('data.0.scans_today', 0);

        $this->get("/table/{$table->qr_token}")->assertOk();
        $this->get("/table/{$table->qr_token}")->assertOk();
        $this->getJson("/api/qr/{$table->qr_token}/menu")->assertOk();
        $this->getJson('/pos/tables')->assertOk()->assertJsonPath('data.0.scans_today', 2);
        $this->assertDatabaseCount('qr_scan_events', 2);

        $this->travelTo(CarbonImmutable::parse('2026-11-07 00:01:00', 'Asia/Jakarta'));
        $this->getJson('/pos/tables')->assertOk()->assertJsonPath('data.0.scans_today', 0);
        $this->get("/table/{$table->qr_token}")->assertOk();
        $this->getJson('/pos/tables')->assertOk()->assertJsonPath('data.0.scans_today', 1);
        $this->assertDatabaseCount('qr_scan_events', 3);
    }

    private function owner(): User
    {
        return User::factory()->create(['role' => Role::Owner->value, 'is_active' => true]);
    }

    private function table(string $code): RestaurantTable
    {
        return RestaurantTable::create([
            'code' => $code, 'name' => "Meja {$code}", 'qr_token' => "test-token-{$code}",
        ]);
    }

    private function menu(Category $category): MenuItem
    {
        return $category->menuItems()->create(['name' => 'Test Menu', 'price' => '12000.00']);
    }

    private function order(?RestaurantTable $table, string $number, OrderStatus $status = OrderStatus::Pending): Order
    {
        return Order::create([
            'order_number' => $number,
            'customer_name' => 'Guest',
            'table_id' => $table?->id,
            'status' => $status,
        ]);
    }
}
