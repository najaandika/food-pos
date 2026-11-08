<?php

namespace Tests\Feature\Pos\RefactorRound8;

use App\Enums\Role;
use App\Enums\TableStatus;
use App\Models\Category;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\RestaurantTable;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TableQrContractTest extends TestCase
{
    use RefreshDatabase;

    private function table(string $token): RestaurantTable
    {
        return RestaurantTable::create([
            'code' => 'R82-T01',
            'name' => 'Meja R82',
            'area' => 'Indoor',
            'seats' => 4,
            'status' => TableStatus::Available,
            'qr_token' => $token,
        ]);
    }

    /** @return array<string, mixed> */
    private function validOrderPayload(): array
    {
        $category = Category::create(['name' => 'R82 menu', 'is_active' => true]);
        $item = MenuItem::create([
            'category_id' => $category->id,
            'name' => 'R82 tea',
            'price' => '12500.50',
            'is_available' => true,
        ]);

        return [
            'customer_name' => 'Test guest',
            'guests' => 2,
            'items' => [['menu_item_id' => $item->id, 'quantity' => 1]],
        ];
    }

    public function test_http_rotation_revokes_old_token_for_order_post_and_does_not_count_rejected_visits(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-07 13:00:00', 'Asia/Jakarta'));
        $oldToken = str_repeat('Ab', 32);
        $table = $this->table($oldToken);
        $payload = $this->validOrderPayload();
        $this->actingAs(User::factory()->create(['role' => Role::Owner]));

        $rotated = $this->postJson("/pos/tables/{$table->id}/rotate-qr-token")
            ->assertOk()
            ->assertJsonPath('table_id', $table->id);
        $newToken = $rotated->json('qr_token');
        $this->assertIsString($newToken);
        $this->assertMatchesRegularExpression('/^[A-Za-z0-9]{64}$/', $newToken);
        $this->assertNotSame($oldToken, $newToken);

        $this->get('/table/'.$oldToken)->assertNotFound();
        $this->getJson('/api/qr/'.$oldToken.'/menu')->assertNotFound();
        $this->postJson('/api/qr/'.$oldToken.'/orders', $payload)->assertNotFound();
        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseCount('qr_scan_events', 0);

        $this->get('/table/'.$newToken)->assertOk();
        $this->getJson('/api/qr/'.$newToken.'/menu')->assertOk();
        $this->getJson('/pos/tables')->assertOk()->assertJsonPath('data.0.scans_today', 1);
        $this->assertDatabaseCount('qr_scan_events', 1);

        $this->postJson('/api/qr/'.$newToken.'/orders', $payload)
            ->assertCreated()
            ->assertJsonPath('status', 'pending')
            ->assertJsonPath('total', '12500.50');
        $this->assertDatabaseCount('orders', 1);
        $this->assertDatabaseCount('qr_scan_events', 1);
        $this->assertSame($table->id, Order::query()->sole()->table_id);
    }

    public function test_case_changed_token_is_rejected_by_all_guest_endpoints_and_creates_no_scans(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-07 13:00:00', 'Asia/Jakarta'));
        $token = str_repeat('Ab', 32);
        $changedCase = str_repeat('aB', 32);
        $this->table($token);
        $payload = $this->validOrderPayload();

        $this->get('/table/'.$changedCase)->assertNotFound();
        $this->getJson('/api/qr/'.$changedCase.'/menu')->assertNotFound();
        $this->postJson('/api/qr/'.$changedCase.'/orders', $payload)->assertNotFound();
        $this->assertDatabaseCount('qr_scan_events', 0);
        $this->assertDatabaseCount('orders', 0);

        $this->get('/table/'.$token)->assertOk();
        $this->getJson('/api/qr/'.$token.'/menu')->assertOk();
        $this->assertDatabaseCount('qr_scan_events', 1);
    }
}
