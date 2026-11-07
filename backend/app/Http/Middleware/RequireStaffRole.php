<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireStaffRole
{
    /**
     * Restrict an endpoint to one or more POS roles.
     * Example: middleware('staff.role:owner,kasir')
     */
    public function handle(Request $request, Closure $next, string ...$allowedRoles): Response
    {
        $user = $request->user();

        if (! $user instanceof User) {
            abort(401);
        }

        if (! $user->is_active || ! in_array($user->role->value, $allowedRoles, true)) {
            abort(403);
        }

        return $next($request);
    }
}
