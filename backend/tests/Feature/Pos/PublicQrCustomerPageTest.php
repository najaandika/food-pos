<?php

namespace Tests\Feature\Pos;

use App\Enums\TableStatus;
use App\Models\Category;
use App\Models\MenuItem;
use App\Models\RestaurantTable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PublicQrCustomerPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_valid_table_qr_opens_public_inertia_customer_page(): void
    {
        $table = $this->table();
        $category = Category::create(['name' => 'Makanan', 'sort_order' => 0, 'is_active' => true]);
        MenuItem::create([
            'category_id' => $category->id,
            'name' => 'Nasi Goreng',
            'price' => '12500.75',
            'is_available' => true,
        ]);

        $this->get('/table/'.$table->qr_token)
            ->assertOk()
            ->assertHeader('Referrer-Policy', 'no-referrer')
            ->assertInertia(fn (Assert $page) => $page
                ->component('customer/order'))
            ->assertSee('Nasi Goreng')
            ->assertSee('12500.75');

        $this->get('/api/qr/'.$table->qr_token.'/menu')
            ->assertOk()
            ->assertJsonPath('table.code', 'A01')
            ->assertJsonPath('can_order', true);
    }

    public function test_short_table_codes_and_unrecognized_qr_tokens_cannot_open_order_page(): void
    {
        $this->table();

        $this->get('/table/A01')->assertNotFound();
        $this->get('/table/'.Str::random(64))->assertNotFound();
    }

    public function test_rotated_and_inactive_qr_codes_cannot_open_page(): void
    {
        $table = $this->table();
        $original = $table->qr_token;

        $table->update(['qr_token' => Str::random(64)]);
        $this->get('/table/'.$original)->assertNotFound();

        $table->update(['status' => TableStatus::Inactive]);
        $this->get('/table/'.$table->qr_token)->assertNotFound();
    }

    private function table(): RestaurantTable
    {
        return RestaurantTable::create([
            'code' => 'A01',
            'name' => 'Meja A01',
            'area' => 'Indoor',
            'seats' => 4,
            'qr_token' => Str::random(64),
            'status' => TableStatus::Available,
        ]);
    }
}
