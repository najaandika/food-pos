<?php

namespace App\Console\Commands;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class BootstrapPosOwner extends Command
{
    protected $signature = 'pos:bootstrap-owner';

    protected $description = 'Create the first active Food POS Owner using private interactive prompts';

    public function handle(): int
    {
        if (User::query()->where('role', Role::Owner->value)->exists()) {
            $this->error('An Owner already exists. Bootstrap is only for the first Owner.');

            return self::FAILURE;
        }

        // Prevent unattended commands, scripts and CLI logs from carrying a password.
        if (! $this->input->isInteractive()) {
            $this->error('Run this command interactively in a terminal.');

            return self::FAILURE;
        }

        $name = trim((string) $this->ask('Owner name'));
        $email = mb_strtolower(trim((string) $this->ask('Owner email')));
        $password = (string) $this->secret('Password (at least 12 characters, mixed case, number, symbol)');
        $confirmation = (string) $this->secret('Confirm password');

        $validator = Validator::make([
            'name' => $name,
            'email' => $email,
            'password' => $password,
            'password_confirmation' => $confirmation,
        ], [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:160', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(12)->mixedCase()->numbers()->symbols()],
        ]);

        if ($validator->fails()) {
            $this->error($validator->errors()->first());

            return self::FAILURE;
        }

        // Serialise simultaneous bootstrap attempts without affecting other DBs.
        $lock = Cache::lock('pos:bootstrap-owner', 30);

        if (! $lock->get()) {
            $this->error('Another Owner bootstrap is in progress.');

            return self::FAILURE;
        }

        try {
            $created = DB::transaction(function () use ($name, $email, $password): bool {
                if (User::query()->where('role', Role::Owner->value)->exists()) {
                    return false;
                }

                $user = new User;
                $user->name = $name;
                $user->email = $email;
                // User's 'hashed' cast stores a hash, never plaintext.
                $user->password = $password;
                $user->role = Role::Owner;
                $user->is_active = true;
                $user->email_verified_at = Carbon::now();
                $user->save();

                return true;
            });
        } finally {
            $lock->release();
        }

        if (! $created) {
            $this->error('An Owner already exists. No changes were made.');

            return self::FAILURE;
        }

        $this->info('Initial Owner created. Sign in with the email and private password you entered.');

        return self::SUCCESS;
    }
}
