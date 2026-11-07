<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_login_instead_of_laravel_welcome(): void
    {
        $this->get(route('home'))->assertRedirect(route('login'));
    }

    public function test_logged_in_staff_are_redirected_to_pos_dashboard(): void
    {
        $staff = User::factory()->create(['role' => Role::Owner]);

        $this->actingAs($staff)
            ->get(route('home'))
            ->assertRedirect(route('dashboard'));
    }
}
