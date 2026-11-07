<?php

namespace Tests\Feature\Pos;

use App\Enums\OrderSource;
use App\Enums\OrderStatus;
use App\Enums\OrderType;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\Role;
use App\Enums\TableStatus;
use App\Models\AppSetting;
use App\Models\Category;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\RestaurantTable;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class PosSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_all_legacy_pos_tables_and_indexes_exist(): void
    {
        foreach ([
            'users', 'categories', 'tables', 'menu_items', 'orders',
            'order_items', 'payments', 'app_settings',
        ] as $name) {
            $this->assertTrue(Schema::hasTable($name), "Missing table {$name}");
        }

        $this->assertTrue(Schema::hasColumns('users', ['role', 'is_active', 'password']));
        $this->assertTrue(Schema::hasColumns('tables', ['qr_token', 'current_order_id']));
        $this->assertTrue(Schema::hasColumns('orders', ['service_charge', 'table_id']));

        foreach ([
            'categories' => ['categories_is_active_sort_order_idx'],
            'tables' => ['tables_status_idx', 'tables_current_order_id_idx'],
            'menu_items' => ['menu_items_category_id_is_available_idx'],
            'orders' => ['orders_status_created_at_idx', 'orders_created_at_idx', 'orders_table_id_idx'],
            'order_items' => ['order_items_order_id_idx', 'order_items_menu_item_id_idx'],
            'payments' => ['payments_order_id_status_idx'],
        ] as $table => $indexes) {
            foreach ($indexes as $index) {
                $this->assertTrue(Schema::hasIndex($table, $index), "Missing index {$index}");
            }
        }
    }

    public function test_order_relationships_enum_and_decimal_casts_work(): void
    {
        $category = Category::create(['name' => 'Makanan', 'sort_order' => 2]);
        $table = RestaurantTable::create([
            'code' => 'A01',
            'name' => 'Meja A01',
            'qr_token' => 'secret-qr-token-001',
        ]);
        $menu = $category->menuItems()->create([
            'name' => 'Nasi Goreng',
            'price' => '25000.50',
            'old_price' => '30000.00',
        ]);
        $order = $table->orders()->create([
            'order_number' => 'POS-TEST-000001',
            'customer_name' => 'Pelanggan',
            'type' => OrderType::DineIn,
            'status' => OrderStatus::Pending,
            'source' => OrderSource::Qr,
            'subtotal' => '50001.00',
            'tax' => '5000.10',
            'service_charge' => '0.00',
            'total' => '55001.10',
        ]);
        $item = $order->items()->create([
            'menu_item_id' => $menu->id,
            'quantity' => 2,
            'unit_price' => $menu->price,
        ]);
        $payment = $order->payments()->create([
            'method' => PaymentMethod::Qris,
            'amount' => '55001.10',
            'status' => PaymentStatus::Pending,
        ]);
        $table->update(['current_order_id' => $order->id, 'status' => TableStatus::Occupied]);
        $setting = AppSetting::create([
            'key' => 'tax_options',
            'value' => ['enabled' => true, 'percentage' => 10],
        ]);

        $this->assertSame('25000.50', $menu->fresh()->price);
        $this->assertSame('55001.10', $order->fresh()->total);
        $this->assertSame(OrderSource::Qr, $order->fresh()->source);
        $this->assertSame(OrderStatus::Pending, $order->fresh()->status);
        $this->assertSame(TableStatus::Occupied, $table->fresh()->status);
        $this->assertSame($order->id, $table->fresh()->currentOrder->id);
        $this->assertSame($table->id, $order->fresh()->table->id);
        $this->assertSame($category->id, $menu->fresh()->category->id);
        $this->assertSame($menu->id, $item->fresh()->menuItem->id);
        $this->assertSame($order->id, $item->fresh()->order->id);
        $this->assertSame(PaymentMethod::Qris, $payment->fresh()->method);
        $this->assertSame(PaymentStatus::Pending, $payment->fresh()->status);
        $this->assertSame($order->id, $payment->fresh()->order->id);
        $this->assertSame(['enabled' => true, 'percentage' => 10], $setting->fresh()->value);

        $this->assertFalse(Schema::hasColumn('order_items', 'updated_at'));
        $this->assertFalse(Schema::hasColumn('payments', 'updated_at'));
        $this->assertFalse(Schema::hasColumn('categories', 'created_at'));
    }

    public function test_order_deletion_cascades_items_but_is_restricted_by_payment(): void
    {
        $category = Category::create(['name' => 'Drinks']);
        $menu = MenuItem::create([
            'category_id' => $category->id,
            'name' => 'Teh',
            'price' => '7000.00',
        ]);
        $order = Order::create([
            'order_number' => 'POS-TEST-000002',
            'customer_name' => 'Pelanggan B',
        ]);
        $item = OrderItem::create([
            'order_id' => $order->id,
            'menu_item_id' => $menu->id,
            'quantity' => 1,
            'unit_price' => '7000.00',
        ]);
        $payment = Payment::create([
            'order_id' => $order->id,
            'method' => PaymentMethod::Cash,
            'amount' => '7000.00',
        ]);

        try {
            $order->delete();
            $this->fail('Order with payment should not be deletable');
        } catch (QueryException) {
            $this->assertDatabaseHas('orders', ['id' => $order->id]);
        }

        $payment->delete();
        $order->delete();

        $this->assertDatabaseMissing('orders', ['id' => $order->id]);
        $this->assertDatabaseMissing('order_items', ['id' => $item->id]);
        $this->assertDatabaseHas('menu_items', ['id' => $menu->id]);
    }

    public function test_deleting_table_detaches_order_without_deleting_it(): void
    {
        $table = RestaurantTable::create([
            'code' => 'B01',
            'name' => 'B01',
            'qr_token' => 'secret-qr-token-002',
        ]);
        $order = $table->orders()->create([
            'order_number' => 'POS-TEST-000003',
            'customer_name' => 'Pelanggan C',
        ]);

        $table->delete();

        $this->assertNull($order->fresh()->table_id);
        $this->assertDatabaseHas('orders', ['id' => $order->id]);
    }

    public function test_pos_user_role_defaults_to_waiters_without_breaking_auth_password(): void
    {
        $user = User::factory()->create(['name' => 'POS Operator']);

        $this->assertSame(Role::Waiters, $user->fresh()->role);
        $this->assertTrue($user->fresh()->is_active);
        $this->assertNotEmpty($user->password);
        $this->assertTrue(password_verify('password', $user->password));
    }

    public function test_unique_qr_token_is_enforced(): void
    {
        RestaurantTable::create([
            'code' => 'C01',
            'name' => 'C01',
            'qr_token' => 'reused-token',
        ]);

        $this->expectException(QueryException::class);

        RestaurantTable::create([
            'code' => 'C02',
            'name' => 'C02',
            'qr_token' => 'reused-token',
        ]);
    }
}
