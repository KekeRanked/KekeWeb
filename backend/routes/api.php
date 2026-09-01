<?php

use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\PublicContentController;
use App\Http\Controllers\Api\RankedController;
use App\Http\Controllers\Api\ServerSnapshotController;
use App\Http\Controllers\Api\StaffController;
use App\Http\Controllers\Api\StoreController;
use Illuminate\Support\Facades\Route;

Route::get('/', HealthController::class);
Route::get('/health', HealthController::class);

Route::get('/news', [PublicContentController::class, 'news']);
Route::get('/rules', [PublicContentController::class, 'rules']);
Route::get('/events', [PublicContentController::class, 'events']);
Route::get('/events/{content:slug}', [PublicContentController::class, 'event']);
Route::get('/event-banners/{filename}', [PublicContentController::class, 'eventBanner'])
    ->where('filename', '[0-9a-f-]+\\.(?:jpg|jpeg|png|webp)');
Route::get('/store/products', StoreController::class);
Route::get('/staff', StaffController::class);

Route::prefix('ranked')->group(function (): void {
    Route::get('/leaderboards', [RankedController::class, 'leaderboard']);
    Route::get('/players/{identifier}', [RankedController::class, 'player']);
    Route::get('/players/{identifier}/matches', [RankedController::class, 'playerMatches']);
    Route::get('/servers', [RankedController::class, 'servers']);
    Route::get('/matches', [RankedController::class, 'matches']);
    Route::get('/matches/{matchId}', [RankedController::class, 'match']);
});

Route::put('/internal/servers/{serverKey}/snapshot', ServerSnapshotController::class)
    ->where('serverKey', 'ranked-[1-3]');
