<?php

namespace App\Http\Controllers\Pos;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

abstract class PosManagementController extends Controller
{
    protected function authorizeManagement(Request $request): void
    {
        $user = $request->user();

        abort_unless($user && $user->role === Role::Owner && $user->is_active, 403);
    }
}
