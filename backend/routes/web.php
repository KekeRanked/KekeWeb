<?php

use App\Http\Controllers\Auth\DiscordAuthController;
use App\Http\Controllers\Auth\SessionController;
use App\Http\Controllers\Admin\ContentAdminController;
use App\Http\Controllers\Admin\EventAdminController;
use App\Http\Controllers\Admin\RoleAdminController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'name' => 'KEKE API',
        'status' => 'online',
        'documentation' => '/api',
    ]);
});

Route::get('/login', fn () => response()->json(['message' => 'Autenticación requerida.'], 401))->name('login');

Route::prefix('auth')->group(function (): void {
    Route::get('/csrf', [SessionController::class, 'csrf']);
    Route::get('/discord', [DiscordAuthController::class, 'redirect']);
    Route::get('/discord/callback', [DiscordAuthController::class, 'callback']);

    Route::middleware('auth')->group(function (): void {
        Route::get('/me', [SessionController::class, 'me']);
        Route::post('/logout', [SessionController::class, 'logout']);
    });
});

Route::prefix('api')->middleware('auth')->group(function (): void {
        Route::apiResource('/admin/content', ContentAdminController::class)
            ->middleware('permission:content.manage');

        // These admin endpoints live in the web middleware stack so the
        // Discord session cookie is available to the permission checks.
        Route::get('/admin/event-players', [EventAdminController::class, 'searchVerifiedPlayers'])
            ->middleware('permission:events.manage');
        Route::post('/admin/event-banners', [EventAdminController::class, 'uploadBanner'])
            ->middleware('permission:events.manage');
        Route::apiResource('/admin/events', EventAdminController::class)
            ->parameters(['events' => 'content'])
            ->middleware('permission:events.manage');
        Route::get('/admin/roles', [RoleAdminController::class, 'index'])
            ->middleware('permission:staff.manage');
        Route::post('/admin/roles/definitions', [RoleAdminController::class, 'createRole'])
            ->middleware('permission:staff.manage');
        Route::put('/admin/roles/definitions/{role}', [RoleAdminController::class, 'updateRole'])
            ->middleware('permission:staff.manage');
        Route::delete('/admin/roles/definitions/{role}', [RoleAdminController::class, 'deleteRole'])
            ->middleware('permission:staff.manage');
        Route::get('/admin/roles/verified-players', [RoleAdminController::class, 'searchVerified'])
            ->middleware('permission:staff.manage');
        Route::post('/admin/roles/users', [RoleAdminController::class, 'store'])
            ->middleware('permission:staff.manage');
        Route::put('/admin/roles/users/{user}', [RoleAdminController::class, 'update'])
            ->middleware('permission:staff.manage');
        Route::put('/admin/staff-members/{minecraftUuid}', [RoleAdminController::class, 'updatePublicStaff'])
            ->middleware('permission:staff.manage');
        Route::delete('/admin/staff-members/{minecraftUuid}', [RoleAdminController::class, 'deletePublicStaff'])
            ->middleware('permission:staff.manage');
});
