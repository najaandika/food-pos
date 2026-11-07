<?php

namespace Tests\Feature\Pos;

use App\Enums\OrderSource;
use App\Enums\OrderStatus;
use App\Enums\OrderType;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\TableStatus;
use App\Models\Category;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Payment;
use App\Models\RestaurantTable;
use App\Services\Pos\OrderManagementService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class OrderReadModelRegressionTest extends TestCase
{
    use RefreshDatabase;

    private function service(): OrderManagementService
    {
        return app(OrderManagementService::class);
    }

    private function order(
        string $number,
        OrderStatus $status = OrderStatus::Ready,
        OrderSource $source = OrderSource::Qr,
        OrderType $type = OrderType::DineIn,
        ?RestaurantTable $table = null,
    ): Order {
        return Order::create([
            'order_number' => $number,
            'customer_name' => 'Customer '.$number,
            'status' => $status,
            'source' => $source,
            'type' => $type,
            'table_id' => $table?->id,
            'guests' => 2,
            'subtotal' => '12500.25',
            'tax' => '0.00',
            'service_charge' => '0.00',
            'total' => '12500.25',
        ]);
    }

    private function payment(Order $order, string $amount, string $date, PaymentMethod $method = PaymentMethod::Cash): void
    {
        Payment::create([
            'order_id' => $order->id,
            'amount' => $amount,
            'method' => $method,
            'status' => PaymentStatus::Paid,
            'paid_at' => CarbonImmutable::parse($date, 'Asia/Jakarta')->setTimezone('UTC'),
        ]);
    }

    public function test_paginate_keeps_newest_first_tie_breaker_and_eager_loading(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-06 11:00:00', 'Asia/Jakarta'));
        $old = $this->order('OLD');
        $old->forceFill(['created_at' => now()->subDay()])->save();
        $first = $this->order('FIRST');
        $last = $this->order('LAST');

        $page = $this->service()->paginate(2);
        $this->assertSame(3, $page->total());
        $this->assertSame(2, $page->lastPage());
        $this->assertSame([$last->id, $first->id], collect($page->items())->pluck('id')->all());
        foreach ($page->items() as $order) {
            $this->assertTrue($order->relationLoaded('table'));
            $this->assertTrue($order->relationLoaded('items'));
            $this->assertTrue($order->relationLoaded('payments'));
        }
    }

    public function test_cashier_queue_keeps_payable_status_filters_search_order_and_eager_loading(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-06 11:00:00', 'Asia/Jakarta'));
        $table = RestaurantTable::create([
            'code' => 'A42', 'name' => 'Meja A42',
            'qr_token' => Str::random(64), 'status' => TableStatus::Available,
        ]);
        $ready = $this->order('QUEUE-READY', OrderStatus::Ready, table: $table);
        $served = $this->order('QUEUE-SERVED', OrderStatus::Served, OrderSource::Manual, OrderType::Takeaway);
        $waiting = $this->order('QUEUE-WAIT', OrderStatus::WaitingPayment);
        $this->order('QUEUE-PENDING', OrderStatus::Pending);
        $this->order('QUEUE-PAID', OrderStatus::Paid);
        $demo = $this->order('DEMO-QUEUE', OrderStatus::WaitingPayment);

        $service = $this->service();
        $this->assertSame([$ready->id, $served->id, $waiting->id, $demo->id], collect($service->cashierQueue(25, 'all', '')->items())->pluck('id')->all());
        $this->assertSame([$ready->id, $served->id], collect($service->cashierQueue(25, 'ready', '')->items())->pluck('id')->all());
        $this->assertSame([$ready->id, $waiting->id, $demo->id], collect($service->cashierQueue(25, 'qr', '')->items())->pluck('id')->all());
        $this->assertSame([$served->id], collect($service->cashierQueue(25, 'takeaway', '')->items())->pluck('id')->all());
        $this->assertSame([$ready->id], collect($service->cashierQueue(25, 'all', 'A42')->items())->pluck('id')->all());
        $this->assertSame([$served->id], collect($service->cashierQueue(25, 'all', 'Customer QUEUE-SERVED')->items())->pluck('id')->all());
        $this->assertSame([$waiting->id], collect($service->cashierQueue(25, 'all', 'QUEUE-WAIT')->items())->pluck('id')->all());

        $page = $service->cashierQueue(2, 'all', '');
        $this->assertSame(4, $page->total());
        $this->assertSame(2, $page->lastPage());
        foreach ($page->items() as $order) {
            $this->assertTrue($order->relationLoaded('table'));
            $this->assertTrue($order->relationLoaded('items'));
        }
    }

    public function test_cashier_stats_preserve_wib_day_boundary_demo_split_and_decimal_money_text(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-06 11:00:00', 'Asia/Jakarta'));
        $ready = $this->order('REAL-READY');
        $this->order('REAL-WAIT', OrderStatus::WaitingPayment);
        $this->order('DEMO-WAIT', OrderStatus::WaitingPayment);
        $this->order('DEMO-READY', OrderStatus::Ready);
        $this->payment($ready, '100000000.10', '2026-11-06 00:30:00');
        $this->payment($ready, '0.20', '2026-11-06 23:59:59', PaymentMethod::Qris);
        $this->payment($ready, '500.00', '2026-11-05 23:59:59');
        $this->payment($ready, '600.00', '2026-11-07 00:00:00');
        $this->payment($this->order('DEMO-PAID', OrderStatus::Paid), '9999.00', '2026-11-06 12:00:00');

        $stats = $this->service()->cashierStats();
        $this->assertSame([
            'unpaidCount' => 2,
            'waitingCount' => 1,
            'demoUnpaidCount' => 2,
            'demoWaitingCount' => 1,
            'paidCount' => 2,
            'paidTotal' => '100000000.30',
            'cashPaidCount' => 1,
            'cashPaidTotal' => '100000000.10',
        ], $stats);
    }

    public function test_production_read_filters_exclude_demo_orders_and_hide_demo_stats(): void
    {
        $this->order('REAL-PROD');
        $this->order('DEMO-PROD');
        $previousEnvironment = app()->environment();
        try {
            app()->detectEnvironment(static fn (): string => 'production');
            $this->assertSame(['REAL-PROD'], collect($this->service()->cashierQueue(25, 'all', '')->items())->pluck('order_number')->all());
            $stats = $this->service()->cashierStats();
            $this->assertSame(1, $stats['unpaidCount']);
            $this->assertSame(0, $stats['demoUnpaidCount']);
            $this->assertSame(0, $stats['demoWaitingCount']);
        } finally {
            app()->detectEnvironment(static fn (): string => $previousEnvironment);
        }
    }

    public function test_present_retains_complete_dto_casts_paid_method_and_loads_missing_relations(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-06 11:00:00', 'Asia/Jakarta'));
        $table = RestaurantTable::create([
            'code' => 'T22', 'name' => 'Meja T22',
            'qr_token' => Str::random(64), 'status' => TableStatus::Available,
        ]);
        $order = $this->order('PRES-001', OrderStatus::Paid, table: $table);
        $category = Category::create(['name' => 'Minuman']);
        $menu = MenuItem::create(['category_id' => $category->id, 'name' => 'Es Teh', 'price' => '12500.25']);
        $item = $order->items()->create(['menu_item_id' => $menu->id, 'quantity' => 2, 'unit_price' => '12500.25']);
        Payment::create([
            'order_id' => $order->id, 'method' => PaymentMethod::Qris,
            'amount' => '25000.50', 'status' => PaymentStatus::Pending,
        ]);
        $this->payment($order, '25000.50', '2026-11-06 10:00:00');
        $fresh = $order->fresh();
        $this->assertFalse($fresh->relationLoaded('payments'));
        $dto = $this->service()->present($fresh);
        $this->assertSame([
            'id', 'orderNumber', 'tableCode', 'customerName', 'type', 'source',
            'status', 'guests', 'subtotal', 'tax', 'serviceCharge', 'total',
            'notes', 'paymentMethod', 'createdAt', 'updatedAt', 'items',
        ], array_keys($dto));
        $this->assertSame('T22', $dto['tableCode']);
        $this->assertSame('paid', $dto['status']);
        $this->assertSame('cash', $dto['paymentMethod']);
        $this->assertSame(12500.25, $dto['total']);
        $this->assertSame((int) $item->id, $dto['items'][0]['id']);
        $this->assertSame('Es Teh', $dto['items'][0]['name']);
        $this->assertSame(2, $dto['items'][0]['quantity']);
        $this->assertSame(25000.5, $dto['items'][0]['lineTotal']);
        $this->assertSame(CarbonImmutable::parse($fresh->created_at, 'UTC')->toIso8601String(), $dto['createdAt']);
        $this->assertTrue($fresh->relationLoaded('payments'));
        $this->assertTrue($fresh->relationLoaded('items'));
        $this->assertTrue($fresh->relationLoaded('table'));
    }
}
