<?php

namespace Tests\Feature\Pos;

use App\Enums\Role;
use App\Models\Category;
use App\Models\RestaurantTable;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class PosMasterDataRoutingTest extends TestCase
{
    use RefreshDatabase;

    public function test_all_master_data_routes_are_behind_verified_owner_middleware(): void
    {
        // Only catalog/table CRUD routes are Owner-only. Operational
        // Orders and Service Workspace routes intentionally permit staff.
        $routes = collect(Route::getRoutes()->getRoutes())
            ->filter(fn ($route) => collect([
                'pos/categories',
                'pos/menu-items',
                'pos/tables',
            ])->contains(fn ($prefix) => str_starts_with($route->uri(), $prefix)));

        $this->assertCount(17, $routes);

        foreach ($routes as $route) {
            $this->assertContains('auth', $route->gatherMiddleware(), $route->uri());
            $this->assertContains('verified', $route->gatherMiddleware(), $route->uri());
            $this->assertContains('staff.role:owner', $route->gatherMiddleware(), $route->uri());
        }

        $this->assertSame(
            'pos.categories.index',
            Route::getRoutes()->match(request()->create('/pos/categories', 'GET'))->getName(),
        );
    }

    public function test_unauthenticated_staff_and_unverified_owner_are_denied(): void
    {
        $table = RestaurantTable::create([
            'code' => 'X01',
            'name' => 'X01',
            'qr_token' => 'private-route-token',
        ]);
        $category = Category::create(['name' => 'Kopi']);

        $this->getJson('/pos/categories')->assertUnauthorized();
        $this->postJson('/pos/categories', ['name' => 'Tambah'])->assertUnauthorized();

        foreach ([Role::Kasir, Role::Waiters] as $role) {
            $staff = User::factory()->create(['role' => $role->value]);

            $this->actingAs($staff)->getJson('/pos/categories')->assertForbidden();
            $this->actingAs($staff)->postJson('/pos/menu-items', [
                'category_id' => $category->id,
                'name' => 'Coffee',
                'price' => '10000.00',
            ])->assertForbidden();
            $this->actingAs($staff)->patchJson("/pos/categories/{$category->id}", [
                'name' => 'Berubah',
            ])->assertForbidden();
            $this->actingAs($staff)->deleteJson("/pos/tables/{$table->id}")->assertForbidden();
            $this->actingAs($staff)->getJson("/pos/tables/{$table->id}/qr-token")->assertForbidden();
            $this->actingAs($staff)->postJson("/pos/tables/{$table->id}/rotate-qr-token")->assertForbidden();
        }

        $unverified = User::factory()->unverified()->create(['role' => Role::Owner->value]);
        $this->actingAs($unverified)->getJson('/pos/categories')->assertForbidden();

        $this->assertDatabaseHas('categories', ['id' => $category->id, 'name' => 'Kopi']);
        $this->assertSame('private-route-token', $table->fresh()->qr_token);
    }

    public function test_active_verified_owner_can_use_real_named_routes(): void
    {
        $owner = User::factory()->create(['role' => Role::Owner->value]);

        $this->actingAs($owner)
            ->postJson(route('pos.categories.store'), ['name' => 'Dessert'])
            ->assertCreated()
            ->assertJsonPath('name', 'Dessert');

        $this->getJson(route('pos.categories.index'))
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Dessert');

        $this->assertNotNull(Route::getRoutes()->getByName('pos.tables.rotate-qr-token'));
    }
}
