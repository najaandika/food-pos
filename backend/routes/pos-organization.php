<?php

use App\Http\Controllers\Pos\OwnerStaffController;
use App\Http\Controllers\Pos\RestaurantSettingsController;
use Illuminate\Support\Facades\Route;

// Internal Owner-only organization management; uses existing users/app_settings tables.
Route::middleware(['auth', 'verified', 'staff.role:owner'])
    ->prefix('pos')
    ->name('pos.')
    ->group(function (): void {
        Route::get('staff', [OwnerStaffController::class, 'index'])->name('staff.index');
        Route::post('staff', [OwnerStaffController::class, 'store'])->name('staff.store');
        Route::patch('staff/{staffUser}', [OwnerStaffController::class, 'update'])->name('staff.update');
        Route::patch('staff/{staffUser}/disable', [OwnerStaffController::class, 'disable'])->name('staff.disable');

        Route::get('restaurant-settings', [RestaurantSettingsController::class, 'show'])
            ->name('restaurant-settings.show');
        Route::put('restaurant-settings', [RestaurantSettingsController::class, 'update'])
            ->name('restaurant-settings.update');
    });
