<?php

namespace Tests\Feature\Pos\RefactorRound8;

use App\Enums\OrderSource;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\Role;
use App\Models\Category;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Payment;
use App\Models\RestaurantTable;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class OwnerOverviewRefactorTest extends TestCase
{
    use RefreshDatabase;

    private function asOwner(): void
    {
        $this->actingAs(User::factory()->create(['role' => Role::Owner]));
    }

    private function order(string $number, OrderStatus $status = OrderStatus::Paid, ?RestaurantTable $table = null): Order
    {
        return Order::create([
            'order_number' => $number,
            'customer_name' => 'Customer '.$number,
            'status' => $status,
            'source' => OrderSource::Qr,
            'table_id' => $table?->id,
            'total' => '123.45',
        ]);
    }

    private function at(Order $order, string $localDateTime): void
    {
        $order->forceFill([
            'created_at' => CarbonImmutable::parse($localDateTime, 'Asia/Jakarta')->utc(),
        ])->save();
    }

    private function paidAt(Order $order, string $localDateTime, string $amount = '123.45'): void
    {
        Payment::create([
            'order_id' => $order->id,
            'method' => PaymentMethod::Cash,
            'status' => PaymentStatus::Paid,
            'amount' => $amount,
            'paid_at' => CarbonImmutable::parse($localDateTime, 'Asia/Jakarta')->utc(),
        ]);
    }

    public function test_exact_json_keys_header_generated_at_and_jakarta_midnight_boundaries(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-07 00:15:00', 'Asia/Jakarta'));
        $yesterday = $this->order('R81-YESTERDAY');
        $today = $this->order('R81-TODAY');
        $tomorrow = $this->order('R81-TOMORROW');
        $this->at($yesterday, '2026-11-06 23:59:59');
        $this->at($today, '2026-11-07 00:00:00');
        $this->at($tomorrow, '2026-11-08 00:00:00');
        $this->paidAt($yesterday, '2026-11-06 23:59:59');
        $this->paidAt($today, '2026-11-07 00:00:00');
        $this->paidAt($tomorrow, '2026-11-08 00:00:00');

        $this->asOwner();
        $json = $this->getJson('/dashboard/overview')
            ->assertOk()
            ->assertHeader('Cache-Control', 'max-age=0, no-store, private')
            ->assertJsonPath('source', 'database')
            ->assertJsonPath('timezone', 'Asia/Jakarta')
            ->assertJsonPath('date', '2026-11-07')
            ->assertJsonPath('generatedAt', '2026-11-06T17:15:00+00:00')
            ->assertJsonPath('dashboard.revenueToday', 123.45)
            ->assertJsonPath('dashboard.paidToday', 1)
            ->assertJsonPath('dashboard.qrOrders', 1)
            ->assertJsonPath('ordersToday', 1)
            ->assertJsonPath('totalOrders', 3)
            ->json();

        $this->assertSame([
            'source', 'timezone', 'date', 'generatedAt', 'dashboard',
            'statusCounts', 'totalOrders', 'ordersToday', 'recentLimit',
            'recentOrders', 'priorityOrders', 'activeTableCount', 'activeTableOrders', 'topDishes',
        ], array_keys($json));
        $this->assertSame([
            'revenueToday', 'paidToday', 'activeOrders', 'qrOrders', 'needAction', 'waitingPayment',
        ], array_keys($json['dashboard']));
        $this->assertSame(array_column(OrderStatus::cases(), 'value'), array_keys($json['statusCounts']));
        $this->assertSame(['R81-TOMORROW', 'R81-TODAY', 'R81-YESTERDAY'],
            array_column($json['recentOrders'], 'orderNumber'));
        $this->assertSame([
            'id', 'orderNumber', 'tableCode', 'customerName', 'type', 'status',
            'source', 'guests', 'subtotal', 'tax', 'serviceCharge', 'total',
            'notes', 'createdAt', 'updatedAt', 'items',
        ], array_keys($json['recentOrders'][0]));
        $this->assertSame(100, $json['recentLimit']);
    }

    public function test_priority_sort_and_active_tables_use_latest_active_order_id_and_limit_five(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-07 10:00:00', 'Asia/Jakarta'));
        $statuses = [
            OrderStatus::Pending, OrderStatus::Ready, OrderStatus::WaitingPayment,
            OrderStatus::Accepted, OrderStatus::Preparing, OrderStatus::Served,
        ];
        $tables = [];
        foreach ($statuses as $index => $status) {
            $tables[] = RestaurantTable::create([
                'code' => 'R81-T'.($index + 1),
                'name' => 'Meja '.($index + 1),
                'qr_token' => Str::random(64),
            ]);
            $this->order('R81-ACTIVE-'.($index + 1), $status, $tables[$index]);
        }
        $this->order('R81-LATEST-1', OrderStatus::Ready, $tables[0]);
        $this->order('R81-PAID-6', OrderStatus::Paid, $tables[5]);

        $this->asOwner();
        $json = $this->getJson('/dashboard/overview')
            ->assertOk()
            ->assertJsonPath('activeTableCount', 6)
            ->assertJsonPath('dashboard.activeOrders', 7)
            ->assertJsonPath('dashboard.needAction', 4)
            ->assertJsonPath('dashboard.waitingPayment', 1)
            ->assertJsonCount(4, 'priorityOrders')
            ->assertJsonCount(5, 'activeTableOrders')
            ->json();

        $this->assertSame([
            'R81-ACTIVE-1', 'R81-ACTIVE-2', 'R81-LATEST-1', 'R81-ACTIVE-3',
        ], array_column($json['priorityOrders'], 'orderNumber'));
        $this->assertSame([
            'R81-LATEST-1', 'R81-ACTIVE-6', 'R81-ACTIVE-5', 'R81-ACTIVE-4', 'R81-ACTIVE-3',
        ], array_column($json['activeTableOrders'], 'orderNumber'));
    }

    public function test_top_dishes_preserve_tie_break_limit_five_category_and_money_serialization(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-07 11:00:00', 'Asia/Jakarta'));
        $category = Category::create(['name' => 'Drinks']);
        $order = $this->order('R81-TOP');
        $quantities = [5, 4, 4, 3, 2, 1];
        $menus = [];
        foreach ($quantities as $index => $quantity) {
            $menu = MenuItem::create([
                'category_id' => $category->id,
                'name' => 'Menu '.($index + 1),
                'description' => $index === 0 ? 'Featured drink' : null,
                'price' => '12500.25',
                'old_price' => $index === 0 ? '15000.50' : null,
                'image_url' => $index === 0 ? '/images/featured.png' : null,
                'is_available' => $index !== 0,
                'is_best_seller' => $index === 0,
                'badge' => $index === 0 ? 'HOT' : null,
            ]);
            $menus[] = $menu;
            $order->items()->create([
                'menu_item_id' => $menu->id,
                'quantity' => $quantity,
                'unit_price' => '12500.25',
            ]);
        }
        $this->paidAt($order, '2026-11-07 10:30:00');

        $this->asOwner();
        $json = $this->getJson('/dashboard/overview')
            ->assertOk()
            ->assertJsonCount(5, 'topDishes')
            ->assertJsonPath('dashboard.revenueToday', 123.45)
            ->assertJsonPath('dashboard.paidToday', 1)
            ->json();

        $this->assertSame(['Menu 1', 'Menu 2', 'Menu 3', 'Menu 4', 'Menu 5'],
            array_column($json['topDishes'], 'name'));
        $this->assertSame([
            'id', 'categoryId', 'category', 'name', 'description', 'price',
            'oldPrice', 'imageUrl', 'isAvailable', 'isBestSeller', 'badge', 'soldToday',
        ], array_keys($json['topDishes'][0]));
        $this->assertSame($menus[0]->id, $json['topDishes'][0]['id']);
        $this->assertSame('Drinks', $json['topDishes'][0]['category']);
        $this->assertSame('Featured drink', $json['topDishes'][0]['description']);
        $this->assertSame(12500.25, $json['topDishes'][0]['price']);
        $this->assertSame(15000.5, $json['topDishes'][0]['oldPrice']);
        $this->assertSame('/images/featured.png', $json['topDishes'][0]['imageUrl']);
        $this->assertFalse($json['topDishes'][0]['isAvailable']);
        $this->assertTrue($json['topDishes'][0]['isBestSeller']);
        $this->assertSame('HOT', $json['topDishes'][0]['badge']);
        $this->assertSame(5, $json['topDishes'][0]['soldToday']);
        $this->assertSame(62501.25, $json['recentOrders'][0]['items'][0]['lineTotal']);
    }
}
