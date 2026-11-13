<?php

use App\Http\Controllers\Pos\OwnerHistoryController;
use App\Http\Controllers\Pos\OwnerOverviewController;
use App\Http\Controllers\Pos\OwnerReportController;
use Illuminate\Support\Facades\Route;

// Food POS entrypoint: the Laravel starter welcome page is not our homepage.
Route::get('/', fn () => redirect()->route(auth()->check() ? 'dashboard' : 'login'))
    ->name('home');

Route::middleware(['auth', 'verified', 'staff.role:owner,kasir,waiters'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

Route::middleware(['auth', 'verified', 'staff.role:owner'])
    ->get('/dashboard/history', OwnerHistoryController::class)
    ->name('dashboard.history');

Route::middleware(['auth', 'verified', 'staff.role:owner'])
    ->get('/dashboard/overview', OwnerOverviewController::class)
    ->name('dashboard.overview');

Route::middleware(['auth', 'verified', 'staff.role:owner'])->group(function () {
    Route::get('/dashboard/report', [OwnerReportController::class, 'index'])->name('dashboard.report');
    Route::get('/dashboard/report/export', [OwnerReportController::class, 'exportCsv'])->name('dashboard.report.csv');
    Route::get('/dashboard/report/print', [OwnerReportController::class, 'print'])->name('dashboard.report.print');
});

require __DIR__.'/settings.php';
require __DIR__.'/pos.php';
require __DIR__.'/pos-organization.php';
require __DIR__.'/qr.php';
