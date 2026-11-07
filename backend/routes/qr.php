<?php

use App\Http\Controllers\Pos\PublicQrOrderingController;
use App\Services\Pos\PublicQrOrderingService;
use App\Services\Pos\RestaurantTableService;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Customer page: the QR bearer token (not a guessable table code) authorizes access.
// Validate it before rendering; never put the table's QR token into public menus.
Route::get('table/{token}', function (string $token, PublicQrOrderingService $service, RestaurantTableService $tables) {
    $catalog = $service->menu($token);
    $tables->recordQrScan($token);

    $response = Inertia::render('customer/order', [
        'token' => $token,
        'initialMenu' => $catalog,
        'csrfToken' => csrf_token(),
    ])->toResponse(request());
    $response->headers->set('Cache-Control', 'private, no-store');
    $response->headers->set('Referrer-Policy', 'no-referrer');

    return $response;
})->where('token', '[A-Za-z0-9]{64}')
    ->middleware('throttle:60,1')
    ->name('qr.page');

// Public guest API: the QR token authorizes the table, not a staff session.
// These routes use the web stack, including CSRF verification on POST.
Route::prefix('api/qr/{token}')
    ->where(['token' => '[A-Za-z0-9]{64}'])
    ->name('qr.')
    ->group(function (): void {
        Route::get('menu', [PublicQrOrderingController::class, 'menu'])
            ->middleware('throttle:60,1')
            ->name('menu');

        Route::post('orders', [PublicQrOrderingController::class, 'store'])
            ->middleware('throttle:10,1')
            ->name('orders.store');
    });
