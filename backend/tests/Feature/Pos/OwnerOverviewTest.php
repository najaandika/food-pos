<?php

namespace Tests\Feature\Pos;

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
use Tests\TestCase;

class OwnerOverviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_an_active_owner_can_read_the_dashboard(): void
    {
        $this->getJson('/dashboard/overview')->assertUnauthorized();

        foreach ([Role::Kasir, Role::Waiters] as $role) {
            $this->actingAs(User::factory()->create(['role' => $role]))
                ->getJson('/dashboard/overview')->assertForbidden();
        }

        $this->actingAs(User::factory()->create([
            'role' => Role::Owner,
            'is_active' => false,
        ]))->getJson('/dashboard/overview')->assertUnauthorized();

        $this->actingAs(User::factory()->create(['role' => Role::Owner]))
            ->getJson('/dashboard/overview')->assertOk();
    }

    public function test_empty_database_provides_explicit_zeros_and_no_mock_data(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-06 12:00:00', 'Asia/Jakarta'));

        $this->actingAs(User::factory()->create(['role' => Role::Owner]))
            ->getJson('/dashboard/overview')
            ->assertOk()
            ->assertJsonPath('source', 'database')
            ->assertJsonPath('date', '2026-11-06')
            ->assertJsonPath('timezone', 'Asia/Jakarta')
            ->assertJsonPath('dashboard.revenueToday', 0)
            ->assertJsonPath('dashboard.paidToday', 0)
            ->assertJsonPath('dashboard.activeOrders', 0)
            ->assertJsonPath('dashboard.qrOrders', 0)
            ->assertJsonPath('dashboard.needAction', 0)
            ->assertJsonPath('totalOrders', 0)
            ->assertJsonPath('ordersToday', 0)
            ->assertJsonPath('activeTableCount', 0)
            ->assertJsonPath('statusCounts.pending', 0)
            ->assertJsonCount(0, 'recentOrders')
            ->assertJsonCount(0, 'priorityOrders')
            ->assertJsonCount(0, 'topDishes');
    }

    public function test_summary_uses_confirmed_payments_and_paid_order_items_once(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-06 10:00:00', 'Asia/Jakarta'));
        $category = Category::create(['name' => 'Makanan']);
        $menu = MenuItem::create([
            'category_id' => $category->id,
            'name' => 'Nasi Goreng',
            'price' => '25000.00',
        ]);
        $table = RestaurantTable::create([
            'code' => 'A1', 'name' => 'Meja A1', 'qr_token' => 'overview-t1',
        ]);

        $paid = Order::create([
            'order_number' => 'OV-PAID', 'customer_name' => 'Customer A',
            'table_id' => $table->id,
            'status' => OrderStatus::Paid, 'source' => OrderSource::Qr,
            'total' => '25000.00',
        ]);
        $paid->items()->create([
            'menu_item_id' => $menu->id, 'quantity' => 2, 'unit_price' => '12500.00',
        ]);
        $pending = Order::create([
            'order_number' => 'OV-PENDING', 'customer_name' => 'Customer B',
            'table_id' => $table->id,
            'status' => OrderStatus::Pending, 'source' => OrderSource::Qr,
        ]);
        $ready = Order::create([
            'order_number' => 'OV-READY', 'customer_name' => 'Customer C',
            'table_id' => $table->id, 'status' => OrderStatus::Ready,
        ]);
        $waiting = Order::create([
            'order_number' => 'OV-WAIT', 'customer_name' => 'Customer D',
            'status' => OrderStatus::WaitingPayment,
        ]);
        foreach ([
            [PaymentStatus::Paid, '12500.25', '2026-11-06 00:30:00'],
            [PaymentStatus::Paid, '12500.25', '2026-11-06 09:30:00'],
            [PaymentStatus::Pending, '90000.00', '2026-11-06 09:30:00'],
            [PaymentStatus::Refunded, '2000.00', '2026-11-06 09:30:00'],
            [PaymentStatus::Paid, '1000.00', '2026-11-05 09:30:00'],
        ] as [$status, $amount, $date]) {
            Payment::create([
                'order_id' => $paid->id,
                'method' => PaymentMethod::Cash,
                'status' => $status,
                'amount' => $amount,
                'paid_at' => CarbonImmutable::parse($date, 'Asia/Jakarta')
                    ->setTimezone('UTC'),
            ]);
        }

        $result = $this->actingAs(User::factory()->create(['role' => Role::Owner]))
            ->getJson('/dashboard/overview')
            ->assertOk()
            ->assertJsonPath('dashboard.revenueToday', 25000.5)
            ->assertJsonPath('dashboard.paidToday', 2)
            ->assertJsonPath('dashboard.activeOrders', 3)
            ->assertJsonPath('dashboard.needAction', 3)
            ->assertJsonPath('dashboard.waitingPayment', 1)
            ->assertJsonPath('dashboard.qrOrders', 2)
            ->assertJsonPath('totalOrders', 4)
            ->assertJsonPath('activeTableCount', 1)
            ->assertJsonPath('statusCounts.paid', 1)
            ->assertJsonCount(4, 'recentOrders')
            ->json();

        $this->assertSame('Nasi Goreng', $result['topDishes'][0]['name']);
        $this->assertSame(2, $result['topDishes'][0]['soldToday']);
        $this->assertSame('OV-READY', $result['activeTableOrders'][0]['orderNumber']);
        $this->assertSame(['OV-PENDING', 'OV-READY', 'OV-WAIT'],
            collect($result['priorityOrders'])->pluck('orderNumber')->all());
        $this->assertSame('Nasi Goreng', $result['recentOrders'][3]['items'][0]['name']);
    }

    public function test_recent_order_response_is_capped_but_counts_include_every_record(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-06 13:00:00', 'Asia/Jakarta'));
        for ($id = 1; $id <= 103; $id++) {
            Order::create([
                'order_number' => 'OV-CAP-'.$id,
                'customer_name' => 'Guest '.$id,
                'status' => OrderStatus::Paid,
            ]);
        }

        $this->actingAs(User::factory()->create(['role' => Role::Owner]))
            ->getJson('/dashboard/overview')
            ->assertOk()
            ->assertJsonPath('totalOrders', 103)
            ->assertJsonPath('statusCounts.paid', 103)
            ->assertJsonPath('recentLimit', 100)
            ->assertJsonCount(100, 'recentOrders');
    }
}
