<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SessionController extends Controller
{
    public function csrf(): JsonResponse
    {
        return response()->json(['token' => csrf_token()]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('roles.permissions');

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
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Sesión cerrada.']);
    }
}
