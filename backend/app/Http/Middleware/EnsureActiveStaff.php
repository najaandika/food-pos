<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveStaff
{
    /**
     * Re-fetch the account on every web request so disabling a staff account
     * immediately revokes an existing session and role changes take effect.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user instanceof User) {
            $fresh = $user->fresh();

            if (! $fresh?->is_active) {
                Auth::guard('web')->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                if ($request->expectsJson()) {
                    return response()->json(['message' => 'Unauthenticated.'], 401);
                }

                return redirect()->route('login')->withErrors([
                    'email' => 'Akun tidak aktif. Hubungi Owner restoran.',
                ]);
            }

            Auth::guard('web')->setUser($fresh);
        }

        return $next($request);
    }
}
