<?php

namespace Tests\Feature\Pos;

use App\Models\User;
use Carbon\CarbonImmutable;
use Database\Seeders\DemoPosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DemoPosSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');

        $this->travelTo(CarbonImmutable::parse('2026-11-06 14:00:00', 'Asia/Jakarta'));
    }

    public function test_demo_data_has_linked_menu_tables_orders_payments_and_reporting_history(): void
    {
        $this->seed(DemoPosSeeder::class);

        $this->assertDatabaseCount('users', 6);
        $this->assertDatabaseCount('categories', 4);
        $this->assertDatabaseCount('menu_items', 20);
        $this->assertCount(20, Storage::disk('public')->allFiles('menu'));
        Storage::disk('public')->assertExists('menu/nasi-goreng-kampung.webp');
        $this->assertSame('/storage/menu/nasi-goreng-kampung.webp', DB::table('menu_items')->where('name', 'Nasi Goreng Kampung')->value('image_url'));
        $this->assertSame(20, DB::table('menu_items')->whereNotNull('image_url')->count());
        $this->assertDatabaseCount('tables', 14);
        $this->assertDatabaseCount('orders', 194);
        $this->assertDatabaseCount('payments', 184);

        $this->assertSame(12, DB::table('orders')->whereIn('status', [
            'pending', 'accepted', 'preparing', 'ready', 'served', 'waiting_payment',
        ])->count());
        $this->assertSame(173, DB::table('orders')->where('status', 'paid')->count());
        $this->assertSame(173, DB::table('payments')->where('status', 'paid')->count());
        $this->assertSame(9, DB::table('tables')->whereNotNull('current_order_id')->count());
        $this->assertSame(14, DB::table('tables')->distinct('qr_token')->count('qr_token'));

        $this->assertSame(0, DB::table('orders')->whereNotNull('table_id')
            ->whereNotIn('table_id', DB::table('tables')->select('id'))->count());
        $this->assertSame(0, DB::table('order_items')->whereNotIn('order_id', DB::table('orders')->select('id'))->count());
        $this->assertSame(0, DB::table('payments')->whereNotIn('order_id', DB::table('orders')->select('id'))->count());

        $invalidTotals = DB::table('orders')->joinSub(
            DB::table('order_items')
                ->select('order_id')
                ->selectRaw('SUM(quantity * unit_price) AS items_total')
                ->groupBy('order_id'),
            'totals',
            'orders.id',
            '=',
            'totals.order_id',
        )->whereColumn('orders.total', '!=', 'totals.items_total')->count();
        $this->assertSame(0, $invalidTotals);

        $owner = User::query()->where('email', 'owner.demo@example.test')->firstOrFail();
        $this->assertSame('owner', $owner->role->value);
        $this->assertTrue(Hash::check('Demo12345!', $owner->password));
        $this->assertNotNull($owner->email_verified_at);

        $menuResponse = $this->actingAs($owner)
            ->getJson('/pos/menu-items?per_page=100')
            ->assertOk()
            ->assertJsonCount(20, 'data');

        $this->assertSame(
            20,
            collect($menuResponse->json('data'))
                ->filter(fn (array $item) => str_starts_with((string) ($item['image_url'] ?? ''), '/storage/menu/'))
                ->count(),
        );

        $this->actingAs($owner)
            ->getJson('/dashboard/overview')
            ->assertOk()
            ->assertJsonPath('source', 'database')
            ->assertJsonPath('dashboard.activeOrders', 12);

        $report = $this->actingAs($owner)->getJson('/dashboard/report');
        $report->assertOk()->assertJsonPath('source', 'database');
        $this->assertGreaterThan(0, $report->json('summary.revenue'));
        $this->assertGreaterThan(0, $report->json('summary.itemsSold'));
    }

    public function test_rerunning_the_demo_seeder_does_not_duplicate_or_reset_edited_records(): void
    {
        $this->seed(DemoPosSeeder::class);

        $countsBefore = [];
        foreach (['users', 'categories', 'menu_items', 'tables', 'orders', 'order_items', 'payments'] as $table) {
            $countsBefore[$table] = DB::table($table)->count();
        }

        $orderId = DB::table('orders')->where('order_number', 'DEMO-261106-001')->value('id');
        $this->assertNotNull($orderId);
        DB::table('orders')->where('id', $orderId)->update(['notes' => 'Sudah diedit staf']);
        DB::table('menu_items')->where('name', 'Cappuccino')->update(['image_url' => '/storage/menu/foto-manual.webp']);

        $this->seed(DemoPosSeeder::class);

        foreach ($countsBefore as $table => $count) {
            $this->assertSame($count, DB::table($table)->count(), 'Duplicated rows in '.$table);
        }
        $this->assertSame('Sudah diedit staf', DB::table('orders')->where('id', $orderId)->value('notes'));
        $this->assertSame('/storage/menu/foto-manual.webp', DB::table('menu_items')->where('name', 'Cappuccino')->value('image_url'));
        $this->assertCount(20, Storage::disk('public')->allFiles('menu'));
    }
}
