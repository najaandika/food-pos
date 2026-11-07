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
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class PosDashboardReportConsistencyTest extends TestCase
{
    use RefreshDatabase;

    private function setupPos(): array
    {
        $owner = User::factory()->create([
            'role' => Role::Owner,
            'is_active' => true,
        ]);

        $category = Category::create([
            'name' => 'Makanan',
            'is_active' => true,
        ]);
        $menu = MenuItem::create([
            'category_id' => $category->id,
            'name' => 'Nasi Goreng',
            'price' => '25000.50',
            'is_available' => true,
        ]);
        $manual = RestaurantTable::create([
            'code' => 'MAN01',
            'name' => 'Meja Manual',
            'area' => 'Indoor',
            'seats' => 4,
            'status' => TableStatus::Available,
            'qr_token' => Str::random(64),
        ]);
        $qr = RestaurantTable::create([
            'code' => 'QR01',
            'name' => 'Meja QR',
            'area' => 'Indoor',
            'seats' => 4,
            'status' => TableStatus::Available,
            'qr_token' => Str::random(64),
        ]);

        return compact('owner', 'menu', 'manual', 'qr');
    }

    private function settleOrder(Order $order): void
    {
        foreach ([
            OrderStatus::Accepted,
            OrderStatus::Preparing,
            OrderStatus::Ready,
            OrderStatus::Served,
            OrderStatus::WaitingPayment,
        ] as $next) {
            $this->patchJson("/pos/orders/{$order->id}/status", [
                'status' => $next->value,
            ])->assertOk();
        }

        $this->postJson("/pos/orders/{$order->id}/cash-payment", [
            'method' => 'cash',
            'received_amount' => (string) $order->total,
            'expected_total' => (string) $order->total,
        ])->assertOk()->assertJsonPath('status', OrderStatus::Paid->value);
    }

    public function test_manual_and_qr_cash_payments_reconcile_across_owner_dashboard_report_and_history(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-06 15:00:00', 'Asia/Jakarta'));
        ['owner' => $owner, 'menu' => $menu, 'manual' => $manual, 'qr' => $qr] = $this->setupPos();

        $this->actingAs($owner)
            ->postJson('/pos/manual-orders', [
                'type' => 'dine_in',
                'table_code' => $manual->code,
                'customer_name' => 'Pelanggan Manual',
                'guests' => 2,
                'items' => [['menu_item_id' => $menu->id, 'quantity' => 2]],
            ])
            ->assertCreated()
            ->assertJsonPath('source', 'manual')
            ->assertJsonPath('total', 50001);

        $this->postJson("/api/qr/{$qr->qr_token}/orders", [
            'customer_name' => 'Pelanggan QR',
            'guests' => 1,
            'items' => [['menu_item_id' => $menu->id, 'quantity' => 1]],
        ])->assertCreated();

        $created = Order::query()->orderBy('id')->get();
        $this->assertCount(2, $created);

        $overview = $this->getJson('/dashboard/overview')->assertOk()
            ->assertJsonPath('dashboard.revenueToday', 0)
            ->assertJsonPath('dashboard.activeOrders', 2)
            ->assertJsonPath('dashboard.qrOrders', 1)
            ->assertJsonPath('ordersToday', 2)
            ->json();
        $this->assertSame(0, $overview['dashboard']['paidToday']);

        $before = $this->getJson('/dashboard/report?from=2026-11-06&to=2026-11-06')
            ->assertOk()
            ->assertJsonPath('summary.revenue', 0)
            ->assertJsonPath('summary.ordersCreated', 2)
            ->assertJsonPath('channels.manual', 1)
            ->assertJsonPath('channels.qr', 1)
            ->json();
        $this->assertSame(0, $before['summary']['successfulPayments']);

        foreach ($created as $order) {
            $this->settleOrder($order);
        }

        $this->assertDatabaseCount('payments', 2);
        $this->assertDatabaseHas('tables', [
            'id' => $manual->id,
            'status' => TableStatus::Available->value,
            'current_order_id' => null,
        ]);
        $this->assertDatabaseHas('tables', [
            'id' => $qr->id,
            'status' => TableStatus::Available->value,
            'current_order_id' => null,
        ]);

        $dashboard = $this->getJson('/dashboard/overview')
            ->assertOk()
            ->assertJsonPath('dashboard.revenueToday', 75001.5)
            ->assertJsonPath('dashboard.paidToday', 2)
            ->assertJsonPath('dashboard.activeOrders', 0)
            ->assertJsonPath('statusCounts.paid', 2)
            ->assertJsonPath('ordersToday', 2)
            ->assertJsonPath('dashboard.qrOrders', 1)
            ->json();

        $report = $this->getJson('/dashboard/report?from=2026-11-06&to=2026-11-06')
            ->assertOk()
            ->assertJsonPath('summary.revenue', 75001.5)
            ->assertJsonPath('summary.paidOrders', 2)
            ->assertJsonPath('summary.successfulPayments', 2)
            ->assertJsonPath('summary.ordersCreated', 2)
            ->assertJsonPath('summary.itemsSold', 3)
            ->assertJsonPath('channels.manual', 1)
            ->assertJsonPath('channels.qr', 1)
            ->assertJsonPath('methods.0.method', 'cash')
            ->assertJsonPath('methods.0.amount', 75001.5)
            ->assertJsonPath('series.0.revenue', 75001.5)
            ->assertJsonPath('transactions.total', 2)
            ->json();

        $history = $this->getJson('/dashboard/history')
            ->assertOk()
            ->assertJsonPath('totals.revenue', 75001.5)
            ->assertJsonPath('totals.payments', 2)
            ->assertJsonPath('totals.orders', 2)
            ->json();

        $this->assertSame($dashboard['dashboard']['revenueToday'], $report['summary']['revenue']);
        $this->assertSame($report['summary']['revenue'], $history['totals']['revenue']);
        $this->assertSame($report['summary']['ordersCreated'], $history['totals']['orders']);
        $this->assertSame(3, $dashboard['topDishes'][0]['soldToday']);
        $this->assertSame(2, $report['transactions']['total']);
    }

    public function test_revenue_tracks_payment_date_in_jakarta_and_not_order_created_date(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-06 23:55:00', 'Asia/Jakarta'));
        ['owner' => $owner, 'menu' => $menu, 'manual' => $manual] = $this->setupPos();

        $this->actingAs($owner)->postJson('/pos/manual-orders', [
            'type' => 'dine_in',
            'table_code' => $manual->code,
            'customer_name' => 'Pelanggan Lintas Hari',
            'guests' => 1,
            'items' => [['menu_item_id' => $menu->id, 'quantity' => 1]],
        ])->assertCreated();
        $order = Order::query()->firstOrFail();

        $this->travelTo(CarbonImmutable::parse('2026-11-07 00:05:00', 'Asia/Jakarta'));
        $this->settleOrder($order);

        $this->getJson('/dashboard/overview')
            ->assertOk()
            ->assertJsonPath('date', '2026-11-07')
            ->assertJsonPath('dashboard.revenueToday', 25000.5)
            ->assertJsonPath('ordersToday', 0);

        $this->getJson('/dashboard/report?from=2026-11-06&to=2026-11-06')
            ->assertOk()
            ->assertJsonPath('summary.revenue', 0)
            ->assertJsonPath('summary.ordersCreated', 1);

        $this->getJson('/dashboard/report?from=2026-11-07&to=2026-11-07')
            ->assertOk()
            ->assertJsonPath('summary.revenue', 25000.5)
            ->assertJsonPath('summary.ordersCreated', 0)
            ->assertJsonPath('summary.paidOrders', 1);
    }
}
