<?php

use App\Http\Controllers\Pos\CategoryController;
use App\Http\Controllers\Pos\MenuImageUploadController;
use App\Http\Controllers\Pos\MenuItemController;
use App\Http\Controllers\Pos\OrderManagementController;
use App\Http\Controllers\Pos\RestaurantTableController;
use App\Http\Controllers\Pos\ServiceWorkspaceController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| POS master data (owner-only)
|--------------------------------------------------------------------------
| Do not expose QR secrets or management operations to kasir/waiters.
| The auth/verified/staff.role alias are provided by Agent A.
*/
/*
|---------------------------------------------------------------------------
| POS operational orders — all active staff can read; only Owner or Waiters
| may progress service stages, Kasir can prepare bills and record cash.
| All transitions are validated again in OrderManagementService.
|---------------------------------------------------------------------------
*/
Route::middleware(['auth', 'verified', 'staff.role:owner,kasir,waiters'])
    ->prefix('pos')
    ->name('pos.')
    ->group(function (): void {
        Route::get('orders', [OrderManagementController::class, 'index'])->name('orders.index');
        Route::get('orders/{order}', [OrderManagementController::class, 'show'])->name('orders.show');
        Route::patch('orders/{order}/status', [OrderManagementController::class, 'updateStatus'])->name('orders.status');
        Route::get('service-catalog', [ServiceWorkspaceController::class, 'catalog'])->name('service.catalog');
        Route::get('service-tables', [ServiceWorkspaceController::class, 'tables'])->name('service.tables');
    });

Route::middleware(['auth', 'verified', 'staff.role:owner,kasir'])
    ->prefix('pos')
    ->name('pos.')
    ->post('manual-orders', [ServiceWorkspaceController::class, 'placeManual'])
    ->name('manual-orders.store');

Route::middleware(['auth', 'verified', 'staff.role:owner,waiters'])
    ->prefix('pos')
    ->name('pos.')
    ->patch('service-tables/{restaurantTable}/acknowledge', [ServiceWorkspaceController::class, 'acknowledge'])
    ->name('service-tables.acknowledge');

Route::middleware(['auth', 'verified', 'staff.role:owner,kasir'])
    ->prefix('pos')
    ->name('pos.')
    ->group(function (): void {
        Route::post('orders/{order}/cash-payment', [OrderManagementController::class, 'recordCashPayment'])
            ->name('orders.cash-payment');
        Route::get('cashier/orders', [OrderManagementController::class, 'cashierIndex'])
            ->name('cashier.index');
        Route::get('cashier/orders/{order}', [OrderManagementController::class, 'cashierShow'])
            ->name('cashier.show');
        Route::get('cashier/orders/{order}/receipt', [OrderManagementController::class, 'cashierReceipt'])
            ->name('cashier.receipt');
    });

Route::middleware(['auth', 'verified', 'staff.role:owner'])
    ->prefix('pos')
    ->name('pos.')
    ->group(function (): void {
        Route::apiResource('categories', CategoryController::class);
        Route::post('menu-images', MenuImageUploadController::class)->name('menu-images.store');

        Route::apiResource('menu-items', MenuItemController::class)
            ->parameters(['menu-items' => 'menuItem']);
        Route::apiResource('tables', RestaurantTableController::class)
            ->parameters(['tables' => 'restaurantTable']);

        Route::get('tables/{restaurantTable}/qr-token', [RestaurantTableController::class, 'qrToken'])
            ->name('tables.qr-token');
        Route::post('tables/{restaurantTable}/rotate-qr-token', [RestaurantTableController::class, 'rotateQrToken'])
            ->middleware('throttle:10,1')
            ->name('tables.rotate-qr-token');
    });
