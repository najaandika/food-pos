<?php

namespace App\Http\Controllers\Pos;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OwnerStaffController extends PosManagementController
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizeManagement($request);

        return $this->privateJson([
            'data' => User::query()->orderBy('id')->get()->map(
                fn (User $staff): array => $this->present($staff)
            )->all(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeManagement($request);
        $request->merge(['email' => mb_strtolower(trim((string) $request->input('email')))]);

        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'role' => ['required', Rule::enum(Role::class)],
            'password' => ['required', 'string', 'min:8', 'max:255'],
            'isActive' => ['required', 'boolean'],
        ]);

        $staff = new User;
        $staff->name = $data['name'];
        $staff->email = $data['email'];
        $staff->password = $data['password']; // User's hashed cast; never return a password.
        $staff->role = Role::from($data['role']);
        $staff->is_active = $data['isActive'];
        // The account is explicitly provisioned by the authenticated Owner.
        $staff->email_verified_at = Carbon::now();
        $staff->save();

        return $this->privateJson($this->present($staff), 201);
    }

    public function update(Request $request, User $staffUser): JsonResponse
    {
        $this->authorizeManagement($request);
        $request->merge(['email' => mb_strtolower(trim((string) $request->input('email')))]);

        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($staffUser->id)],
            'role' => ['required', Rule::enum(Role::class)],
            'password' => ['sometimes', 'required', 'string', 'min:8', 'max:255'],
            'isActive' => ['required', 'boolean'],
        ]);

        $staff = DB::transaction(function () use ($request, $staffUser, $data): User {
            $staff = User::query()->lockForUpdate()->findOrFail($staffUser->id);
            $newRole = Role::from($data['role']);
            $newActive = (bool) $data['isActive'];

            if ($staff->is($request->user()) && ($newRole !== Role::Owner || ! $newActive)) {
                throw ValidationException::withMessages([
                    'role' => 'Akun Owner yang sedang digunakan tidak dapat menonaktifkan atau menurunkan hak akses sendiri.',
                ]);
            }

            $this->protectLastActiveOwner($staff, $newRole, $newActive);

            $staff->name = $data['name'];
            $staff->email = $data['email'];
            $staff->role = $newRole;
            $staff->is_active = $newActive;
            if (array_key_exists('password', $data)) {
                $staff->password = $data['password'];
            }
            $staff->save();

            return $staff;
        });

        return $this->privateJson($this->present($staff));
    }

    public function disable(Request $request, User $staffUser): JsonResponse
    {
        $this->authorizeManagement($request);

        $staff = DB::transaction(function () use ($request, $staffUser): User {
            $staff = User::query()->lockForUpdate()->findOrFail($staffUser->id);
            if ($staff->is($request->user())) {
                throw ValidationException::withMessages([
                    'staff' => 'Akun yang sedang digunakan tidak dapat dinonaktifkan.',
                ]);
            }

            $this->protectLastActiveOwner($staff, $staff->role, false);
            $staff->is_active = false;
            $staff->save();

            return $staff;
        });

        return $this->privateJson($this->present($staff));
    }

    private function protectLastActiveOwner(User $staff, Role $nextRole, bool $nextActive): void
    {
        if ($staff->role !== Role::Owner || ! $staff->is_active) {
            return;
        }

        if ($nextRole === Role::Owner && $nextActive) {
            return;
        }

        if (User::query()->where('role', Role::Owner->value)->where('is_active', true)->count() <= 1) {
            throw ValidationException::withMessages([
                'role' => 'Minimal satu akun Owner aktif harus dipertahankan.',
            ]);
        }
    }

    /** @return array{id:int,name:string,email:string,role:string,isActive:bool,createdAt:string,updatedAt:string} */
    private function present(User $staff): array
    {
        return [
            'id' => (int) $staff->id,
            'name' => $staff->name,
            'email' => $staff->email,
            'role' => $staff->role->value,
            'isActive' => (bool) $staff->is_active,
            'createdAt' => $staff->created_at?->toIso8601String() ?? '',
            'updatedAt' => $staff->updated_at?->toIso8601String() ?? '',
        ];
    }

    /** @param array<string, mixed> $data */
    private function privateJson(array $data, int $status = 200): JsonResponse
    {
        return response()->json($data, $status)
            ->header('Cache-Control', 'private, no-store, max-age=0');
    }
}
