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
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OwnerReportTest extends TestCase
{
    use RefreshDatabase;

    private function login(): void
    {
        $this->actingAs(User::factory()->create(['role' => Role::Owner]));
    }

    private function order(string $number, string $status = 'paid', string $date = '2026-11-05 09:00:00'): Order
    {
        $order = Order::create([
            'order_number' => $number,
            'customer_name' => 'Customer '.$number,
            'status' => OrderStatus::from($status),
            'source' => OrderSource::Qr,
            'total' => '25000.00',
        ]);
        $order->forceFill(['created_at' => CarbonImmutable::parse($date, 'Asia/Jakarta')->setTimezone('UTC')])->save();

        return $order;
    }

    private function payment(Order $order, string $amount, string $date, PaymentStatus $status = PaymentStatus::Paid, PaymentMethod $method = PaymentMethod::Qris): Payment
    {
        return Payment::create([
            'order_id' => $order->id, 'amount' => $amount,
            'status' => $status, 'method' => $method,
            'paid_at' => CarbonImmutable::parse($date, 'Asia/Jakarta')->setTimezone('UTC'),
        ]);
    }

    public function test_only_owner_can_read_or_export(): void
    {
        foreach (['/dashboard/report', '/dashboard/report/export', '/dashboard/report/print'] as $url) {
            $this->get($url)->assertRedirect('/login');
        }
        $this->actingAs(User::factory()->create(['role' => Role::Kasir]))
            ->getJson('/dashboard/report')->assertForbidden();
        $this->actingAs(User::factory()->create(['role' => Role::Waiters]))
            ->get('/dashboard/report/export')->assertForbidden();
        $this->login();
        $this->getJson('/dashboard/report')->assertOk();
    }

    public function test_empty_history_returns_zero_and_daily_series_without_demo_values(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-06 14:00:00', 'Asia/Jakarta'));
        $this->login();
        $this->getJson('/dashboard/report?from=2026-11-01&to=2026-11-06')
            ->assertOk()
            ->assertJsonPath('source', 'database')
            ->assertJsonPath('timezone', 'Asia/Jakarta')
            ->assertJsonPath('summary.revenue', 0)
            ->assertJsonPath('summary.paidOrders', 0)
            ->assertJsonPath('summary.itemsSold', 0)
            ->assertJsonPath('transactions.total', 0)
            ->assertJsonCount(6, 'series');
    }

    public function test_paid_payments_are_counted_by_paid_date_without_double_counting_items(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-06 14:00:00', 'Asia/Jakarta'));
        $category = Category::create(['name' => 'Makanan']);
        $menu = MenuItem::create(['category_id' => $category->id, 'name' => 'Nasi Goreng', 'price' => '12500.00']);

        $order = $this->order('R-001', 'paid', '2026-11-05 09:00:00');
        $order->items()->create(['menu_item_id' => $menu->id, 'quantity' => 2, 'unit_price' => '12500.00']);
        $this->payment($order, '12500.25', '2026-11-06 00:30:00');
        $this->payment($order, '12500.25', '2026-11-06 09:30:00');
        $this->payment($order, '99000.00', '2026-11-06 09:30:00', PaymentStatus::Pending);
        $this->payment($order, '5000.00', '2026-11-06 09:30:00', PaymentStatus::Refunded);
        $this->payment($order, '1000.00', '2026-10-01 09:30:00');
        $this->order('R-002', 'pending');

        $this->login();
        $response = $this->getJson('/dashboard/report?from=2026-11-05&to=2026-11-06')
            ->assertOk()
            ->assertJsonPath('summary.revenue', 25000.5)
            ->assertJsonPath('summary.successfulPayments', 2)
            ->assertJsonPath('summary.paidOrders', 1)
            ->assertJsonPath('summary.ordersCreated', 2)
            ->assertJsonPath('summary.itemsSold', 2)
            ->assertJsonPath('channels.qr', 2)
            ->assertJsonPath('transactions.total', 4)
            ->json();

        $this->assertSame(2, $response['categories'][0]['quantity']);
        $nov6 = collect($response['series'])->firstWhere('date', '2026-11-06');
        $this->assertSame(25000.5, $nov6['revenue']);
        $this->assertSame(2, $nov6['payments']);
        $nov5 = collect($response['series'])->firstWhere('date', '2026-11-05');
        $this->assertSame(2, $nov5['orders']);
    }

    public function test_filters_and_pagination_affect_transactions_but_do_not_invent_growth(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-06 14:00:00', 'Asia/Jakarta'));
        for ($i = 1; $i <= 13; $i++) {
            $order = $this->order('PAGE-'.$i);
            $this->payment($order, (string) (1500 + $i).'.00', '2026-11-06 11:30:00');
        }
        $this->login();
        $this->getJson('/dashboard/report?from=2026-11-06&to=2026-11-06&page=2')
            ->assertOk()
            ->assertJsonPath('transactions.total', 13)
            ->assertJsonPath('transactions.page', 2)
            ->assertJsonPath('transactions.lastPage', 2)
            ->assertJsonCount(3, 'transactions.items');
        $this->getJson('/dashboard/report?from=2026-11-06&to=2026-11-06&method=cash')
            ->assertOk()
            ->assertJsonPath('summary.revenue', 0)
            ->assertJsonPath('transactions.total', 0);
        $this->getJson('/dashboard/report?from=2026-11-06&to=2026-11-06&search=PAGE-3')
            ->assertOk()
            ->assertJsonPath('transactions.total', 1)
            ->assertJsonPath('summary.successfulPayments', 13);

        $this->getJson('/dashboard/report?from=2026-11-06&to=2026-11-06&sort=amount_desc')
            ->assertOk()
            ->assertJsonPath('transactions.items.0.orderNumber', 'PAGE-13');
        $this->getJson('/dashboard/report?from=2026-11-06&to=2026-11-06&sort=amount_asc')
            ->assertOk()
            ->assertJsonPath('transactions.items.0.orderNumber', 'PAGE-1');
        $this->getJson('/dashboard/report?from=2026-11-06&to=2026-11-06&status=pending')
            ->assertOk()
            ->assertJsonPath('transactions.total', 0)
            ->assertJsonPath('summary.successfulPayments', 13);
    }

    public function test_invalid_date_ranges_are_rejected(): void
    {
        $this->login();
        $this->getJson('/dashboard/report?from=2026-11-07&to=2026-11-06')->assertUnprocessable();
        $this->getJson('/dashboard/report?from=2024-01-01&to=2026-11-06')->assertUnprocessable();
        $this->getJson('/dashboard/report?method=untrusted')->assertUnprocessable();
    }

    public function test_browser_default_query_with_empty_search_accepts_valid_30_day_range(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-06 14:00:00', 'Asia/Jakarta'));
        $this->login();

        $this->getJson('/dashboard/report?from=2026-10-08&to=2026-11-06&method=all&status=all&search=&sort=recent&page=1')
            ->assertOk()
            ->assertJsonPath('range.days', 30)
            ->assertJsonPath('filters.search', '')
            ->assertJsonCount(30, 'series');

        $this->get('/dashboard/report/export?from=2026-10-08&to=2026-11-06&search=')
            ->assertOk();
        $this->get('/dashboard/report/print?from=2026-10-08&to=2026-11-06&search=')
            ->assertOk();
    }

    public function test_report_supports_one_and_366_day_ranges_but_rejects_367_days(): void
    {
        $this->login();

        $this->getJson('/dashboard/report?from=2026-11-06&to=2026-11-06')
            ->assertOk()
            ->assertJsonPath('range.days', 1)
            ->assertJsonCount(1, 'series');

        $this->getJson('/dashboard/report?from=2025-11-06&to=2026-11-06')
            ->assertOk()
            ->assertJsonPath('range.days', 366)
            ->assertJsonCount(366, 'series');

        $this->getJson('/dashboard/report?from=2025-11-05&to=2026-11-06')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('from');
    }

    public function test_csv_export_and_print_are_owner_only_and_use_valid_filters(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-06 14:00:00', 'Asia/Jakarta'));
        $order = $this->order('EXPORT-1');
        $this->payment($order, '27500.25', '2026-11-06 11:30:00');
        $this->login();
        $csv = $this->get('/dashboard/report/export?from=2026-11-06&to=2026-11-06');
        $csv->assertOk();
        $this->assertStringContainsString('text/csv', $csv->headers->get('content-type') ?? '');
        $this->get('/dashboard/report/print?from=2026-11-06&to=2026-11-06')
            ->assertOk()->assertSee('EXPORT-1');
    }
}
