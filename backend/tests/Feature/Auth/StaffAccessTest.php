<?php

namespace Tests\Feature\Auth;

use App\Enums\Role;
use App\Models\User;
use App\Policies\UserPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class StaffAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_all_three_active_roles_can_access_the_dashboard(): void
    {
        foreach (Role::cases() as $role) {
            $staff = User::factory()->create(['role' => $role]);

            $this->actingAs($staff)->get('/dashboard')->assertOk();
        }
    }

    public function test_guests_are_not_allowed_to_access_a_role_protected_route(): void
    {
        Route::middleware(['web', 'auth', 'staff.role:owner'])->get('/_test_owner_only', fn () => response()->noContent());

        $this->get('/_test_owner_only')->assertRedirect('/login');
    }

    public function test_owner_only_routes_reject_kasir_and_waiters(): void
    {
        Route::middleware(['web', 'auth', 'staff.role:owner'])->get('/_test_owner_only', fn () => response()->noContent());

        $owner = User::factory()->create(['role' => Role::Owner]);
        $kasir = User::factory()->create(['role' => Role::Kasir]);
        $waiters = User::factory()->create(['role' => Role::Waiters]);

        $this->actingAs($owner)->get('/_test_owner_only')->assertNoContent();
        $this->actingAs($kasir)->get('/_test_owner_only')->assertForbidden();
        $this->actingAs($waiters)->get('/_test_owner_only')->assertForbidden();
    }

    public function test_kasir_and_waiters_have_independent_routes(): void
    {
        Route::middleware(['web', 'auth', 'staff.role:kasir'])->get('/_test_kasir_only', fn () => response()->noContent());
        Route::middleware(['web', 'auth', 'staff.role:waiters'])->get('/_test_waiters_only', fn () => response()->noContent());

        $kasir = User::factory()->create(['role' => Role::Kasir]);
        $waiters = User::factory()->create(['role' => Role::Waiters]);

        $this->actingAs($kasir)->get('/_test_kasir_only')->assertNoContent();
        $this->actingAs($kasir)->get('/_test_waiters_only')->assertForbidden();
        $this->actingAs($waiters)->get('/_test_waiters_only')->assertNoContent();
        $this->actingAs($waiters)->get('/_test_kasir_only')->assertForbidden();
    }

    public function test_an_inactive_account_cannot_login_even_with_the_right_password(): void
    {
        $staff = User::factory()->create(['is_active' => false, 'role' => Role::Kasir]);

        $this->post('/login', [
            'email' => $staff->email,
            'password' => 'password',
        ])->assertSessionHasErrors('email');

        $this->assertGuest();
    }

    public function test_disabling_an_existing_user_revokes_their_web_session(): void
    {
        $owner = User::factory()->create(['role' => Role::Owner]);

        $this->actingAs($owner)->get('/dashboard')->assertOk();

        $owner->update(['name' => 'Still Active']);
        $owner->forceFill(['is_active' => false])->save();

        $this->get('/dashboard')->assertRedirect('/login');
        $this->assertGuest();
    }

    public function test_deleted_staff_account_cannot_keep_using_its_session(): void
    {
        $staff = User::factory()->create(['role' => Role::Waiters]);

        $this->actingAs($staff)->get('/dashboard')->assertOk();
        $staff->delete();

        $this->get('/dashboard')->assertRedirect('/login');
        $this->assertGuest();
    }

    public function test_role_change_is_effective_without_a_fresh_login(): void
    {
        Route::middleware(['web', 'auth', 'staff.role:owner'])->get('/_test_owner_only', fn () => response()->noContent());

        $staff = User::factory()->create(['role' => Role::Kasir]);

        $this->actingAs($staff)->get('/_test_owner_only')->assertForbidden();
        $staff->forceFill(['role' => Role::Owner])->save();

        $this->get('/_test_owner_only')->assertNoContent();
    }

    public function test_only_active_owner_can_manage_staff_accounts(): void
    {
        $owner = User::factory()->create(['role' => Role::Owner]);
        $kasir = User::factory()->create(['role' => Role::Kasir]);
        $waiters = User::factory()->create(['role' => Role::Waiters]);
        $inactiveOwner = User::factory()->create(['role' => Role::Owner, 'is_active' => false]);

        $this->assertSame(Role::Owner, $owner->role);
        $this->assertTrue($owner->is_active);
        $this->assertInstanceOf(UserPolicy::class, Gate::getPolicyFor(User::class));
        $this->assertTrue((new UserPolicy)->viewAny($owner));
        $this->assertTrue(Gate::forUser($owner)->allows('viewAny', User::class));
        $this->assertTrue(Gate::forUser($owner)->allows('create', User::class));
        $this->assertTrue(Gate::forUser($owner)->allows('update', $kasir));
        $this->assertTrue(Gate::forUser($owner)->allows('delete', $kasir));
        $this->assertFalse(Gate::forUser($owner)->allows('delete', $owner));
        $this->assertFalse(Gate::forUser($owner)->allows('delete', $inactiveOwner));

        $this->assertFalse(Gate::forUser($kasir)->allows('viewAny', User::class));
        $this->assertFalse(Gate::forUser($kasir)->allows('create', User::class));
        $this->assertFalse(Gate::forUser($waiters)->allows('update', $kasir));
        $this->assertFalse(Gate::forUser($inactiveOwner)->allows('create', User::class));
        $this->assertTrue(Gate::forUser($kasir)->allows('view', $kasir));
    }
}
