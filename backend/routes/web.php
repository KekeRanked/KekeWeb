<?php

use App\Http\Controllers\Auth\DiscordAuthController;
use App\Http\Controllers\Auth\SessionController;
use App\Http\Controllers\Admin\ContentAdminController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'name' => 'KEKE API',
        'status' => 'online',
        'documentation' => '/api',
    ]);
});

Route::prefix('api')->group(function (): void {
    Route::get('/auth/csrf', [SessionController::class, 'csrf']);
    Route::get('/auth/discord/redirect', [DiscordAuthController::class, 'redirect']);
    Route::get('/auth/discord/callback', [DiscordAuthController::class, 'callback']);

    Route::middleware('auth')->group(function (): void {
        Route::get('/me', [SessionController::class, 'me']);
        Route::post('/auth/logout', [SessionController::class, 'logout']);

        Route::apiResource('/admin/content', ContentAdminController::class)
            ->middleware('permission:content.manage');
    });
});
