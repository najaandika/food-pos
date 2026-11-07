<?php

namespace Tests\Feature\Pos;

use App\Enums\OrderSource;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\Role;
use App\Enums\TableStatus;
use App\Models\Order;
use App\Models\Payment;
use App\Models\RestaurantTable;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class OwnerReportPipelineRegressionTest extends TestCase
{
    use RefreshDatabase;

    private function owner(): void
    {
        $this->actingAs(User::factory()->create(['role' => Role::Owner]));
    }

    private function order(string $number, string $customer, ?RestaurantTable $table = null): Order
    {
        return Order::create([
            'order_number' => $number,
            'customer_name' => $customer,
            'table_id' => $table?->id,
            'status' => OrderStatus::Paid,
            'source' => OrderSource::Qr,
            'total' => '12500.25',
        ]);
    }

    public function test_json_contract_keeps_payment_date_separate_from_order_creation_date(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-06 14:00:00', 'Asia/Jakarta'));
        $order = $this->order('REG-001', 'Customer');
        $order->forceFill([
            'created_at' => CarbonImmutable::parse('2026-11-05 10:00:00', 'Asia/Jakarta')->utc(),
        ])->save();
        $paidAt = CarbonImmutable::parse('2026-11-06 00:30:00', 'Asia/Jakarta')->utc();
        Payment::create([
            'order_id' => $order->id,
            'amount' => '12500.25',
            'method' => PaymentMethod::Qris,
            'status' => PaymentStatus::Paid,
            'paid_at' => $paidAt,
        ]);

        $this->owner();
        $data = $this->getJson('/dashboard/report?from=2026-11-06&to=2026-11-06')
            ->assertOk()
            ->assertHeader('Cache-Control', 'max-age=0, no-store, private')
            ->assertJsonPath('range', ['from' => '2026-11-06', 'to' => '2026-11-06', 'days' => 1])
            ->assertJsonPath('summary.revenue', 12500.25)
            ->assertJsonPath('summary.successfulPayments', 1)
            ->assertJsonPath('summary.paidOrders', 1)
            ->assertJsonPath('summary.ordersCreated', 0)
            ->assertJsonPath('series.0.date', '2026-11-06')
            ->assertJsonPath('series.0.revenue', 12500.25)
            ->assertJsonPath('series.0.orders', 0)
            ->assertJsonPath('transactions.items.0.at', $paidAt->toIso8601String())
            ->assertJsonPath('transactions.items.0.dateBasis', 'paid_at')
            ->json();

        $this->assertSame(
            ['source', 'timezone', 'range', 'filters', 'generatedAt', 'summary', 'series', 'methods', 'categories', 'channels', 'serviceTypes', 'transactions'],
            array_keys($data),
        );
        $this->assertSame(
            ['revenue', 'successfulPayments', 'paidOrders', 'ordersCreated', 'itemsSold', 'averagePaidOrder'],
            array_keys($data['summary']),
        );
        $this->assertSame(
            ['id', 'orderNumber', 'customerName', 'tableCode', 'source', 'method', 'status', 'amount', 'at', 'dateBasis'],
            array_keys($data['transactions']['items'][0]),
        );
    }

    public function test_csv_preserves_columns_timezone_and_spreadsheet_formula_escaping(): void
    {
        $table = RestaurantTable::create([
            'code' => '@TABLE', 'name' => 'Test Table', 'qr_token' => Str::random(64),
            'status' => TableStatus::Available,
        ]);
        $order = $this->order('=1+1', '+CUSTOMER', $table);
        Payment::create([
            'order_id' => $order->id, 'amount' => '12500.25',
            'method' => PaymentMethod::Qris, 'status' => PaymentStatus::Paid,
            'paid_at' => CarbonImmutable::parse('2026-11-06 00:30:00', 'Asia/Jakarta')->utc(),
        ]);

        $this->owner();
        $response = $this->get('/dashboard/report/export?from=2026-11-06&to=2026-11-06')->assertOk();
        $this->assertStringContainsString('text/csv', (string) $response->headers->get('Content-Type'));
        $this->assertStringContainsString('food-pos-report-2026-11-06-2026-11-06.csv', (string) $response->headers->get('Content-Disposition'));

        $content = $response->streamedContent();
        $this->assertStringStartsWith("\xEF\xBB\xBF", $content);
        $lines = array_values(array_filter(explode("\n", substr($content, 3)), static fn (string $line): bool => $line !== ''));
        $this->assertCount(2, $lines);
        $this->assertSame(
            ['Order', 'Customer', 'Table', 'Method', 'Status', 'Amount (IDR)', 'Timestamp (WIB)', 'Date basis'],
            str_getcsv($lines[0]),
        );
        $this->assertSame(
            ["'=1+1", "'+CUSTOMER", "'@TABLE", 'qris', 'paid', '12500.25', '2026-11-06 00:30:00', 'paid_at'],
            str_getcsv($lines[1]),
        );
    }

    public function test_print_remains_capped_at_500_while_csv_streams_all_filtered_rows(): void
    {
        $order = $this->order('LIMIT-001', 'Customer');
        $rows = [];
        for ($index = 0; $index < 502; $index++) {
            $rows[] = [
                'order_id' => $order->id, 'amount' => '100.00',
                'method' => PaymentMethod::Cash->value,
                'status' => PaymentStatus::Pending->value,
                'paid_at' => null, 'created_at' => '2026-11-06 12:00:00',
            ];
        }
        foreach (array_chunk($rows, 100) as $chunk) {
            DB::table('payments')->insert($chunk);
        }

        $this->owner();
        $range = '?from=2026-11-06&to=2026-11-06&status=pending';
        $this->getJson('/dashboard/report'.$range)
            ->assertOk()
            ->assertJsonPath('transactions.total', 502)
            ->assertJsonCount(10, 'transactions.items');
        $print = $this->get('/dashboard/report/print'.$range)->assertOk();
        $this->assertCount(500, $print->viewData('rows'));
        $this->assertStringContainsString('maksimum 500', $print->getContent());

        $csv = $this->get('/dashboard/report/export'.$range)->assertOk()->streamedContent();
        $lines = array_values(array_filter(explode("\n", substr($csv, 3)), static fn (string $line): bool => $line !== ''));
        $this->assertCount(503, $lines);
        $this->assertSame('created_at', str_getcsv($lines[1])[7]);
    }
}
