<?php

namespace Tests\Feature\Auth;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class BootstrapOwnerTest extends TestCase
{
    use RefreshDatabase;

    public function test_first_owner_can_be_created_with_an_interactive_secret_password(): void
    {
        $password = 'Strong-Owner-Password#72';

        $this->artisan('pos:bootstrap-owner')
            ->expectsQuestion('Owner name', 'Main Restaurant Owner')
            ->expectsQuestion('Owner email', 'OWNER@food.test')
            ->expectsQuestion('Password (at least 12 characters, mixed case, number, symbol)', $password)
            ->expectsQuestion('Confirm password', $password)
            ->expectsOutput('Initial Owner created. Sign in with the email and private password you entered.')
            ->assertExitCode(0);

        $owner = User::query()->sole();

        $this->assertSame('owner@food.test', $owner->email);
        $this->assertSame(Role::Owner, $owner->role);
        $this->assertTrue($owner->is_active);
        $this->assertNotNull($owner->email_verified_at);
        $this->assertNotSame($password, $owner->password);
        $this->assertTrue(Hash::check($password, $owner->password));
    }

    public function test_existing_owner_prevents_a_second_bootstrap(): void
    {
        User::factory()->create(['role' => Role::Owner]);

        $this->artisan('pos:bootstrap-owner')
            ->expectsOutput('An Owner already exists. Bootstrap is only for the first Owner.')
            ->assertExitCode(1);

        $this->assertDatabaseCount('users', 1);
    }

    public function test_noninteractive_bootstrap_fails_closed(): void
    {
        $exitCode = $this->app->make(Kernel::class)
            ->call('pos:bootstrap-owner', ['--no-interaction' => true]);

        $this->assertSame(1, $exitCode);
        $this->assertDatabaseCount('users', 0);
    }

    public function test_owner_requires_a_strong_password(): void
    {
        $this->artisan('pos:bootstrap-owner')
            ->expectsQuestion('Owner name', 'Owner')
            ->expectsQuestion('Owner email', 'owner@food.test')
            ->expectsQuestion('Password (at least 12 characters, mixed case, number, symbol)', 'weak')
            ->expectsQuestion('Confirm password', 'weak')
            ->assertExitCode(1);

        $this->assertDatabaseCount('users', 0);
    }
}
