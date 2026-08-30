<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Services\MinecraftIdentityService;

class SessionController extends Controller
{
    public function csrf(): JsonResponse
    {
        return response()->json(['token' => csrf_token()]);
    }

    public function me(Request $request, MinecraftIdentityService $minecraftIdentity): JsonResponse
    {
        $user = $minecraftIdentity->sync($request->user())->load('roles.permissions');

        return response()->json([
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'discord_id' => $user->discord_id,
                'discord_username' => $user->discord_username,
                'discord_avatar' => $user->discord_avatar,
                'minecraft_uuid' => $user->minecraft_uuid,
                'minecraft_username' => $user->minecraft_username,
                'roles' => $user->roles->pluck('key')->values(),
                'permissions' => $user->roles
                    ->flatMap->permissions
                    ->pluck('key')
                    ->unique()
                    ->values(),
            ],
        ])->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Sesión cerrada.']);
    }
}
