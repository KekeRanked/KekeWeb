<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StaffMember;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class StaffController extends Controller
{
    public function __invoke(): JsonResponse
    {
        try {
            $members = StaffMember::query()
                ->where('is_active', true)
                ->orderBy('display_order')
                ->get();

            $players = DB::connection('minecraft_stats')
                ->table('ranked_players')
                ->whereIn('minecraft_uuid', $members->pluck('minecraft_uuid'))
                ->where('is_verified', true)
                ->get(['minecraft_uuid', 'minecraft_username', 'is_verified'])
                ->keyBy('minecraft_uuid');
            $users = User::query()->with('roles.permissions')
                ->whereIn('minecraft_uuid', $members->pluck('minecraft_uuid'))
                ->get()->keyBy('minecraft_uuid');

            return response()->json(['data' => $members->map(function (StaffMember $member) use ($players, $users): array {
                $player = $players->get($member->minecraft_uuid);
                $user = $users->get($member->minecraft_uuid);
                $storedRole = $member->role === 'administrator' ? 'admin' : $member->role;
                $accessRole = match ($storedRole) {
                    'owner' => 'owner',
                    'manager' => 'manager',
                    'admin' => 'admin',
                    'screensharer' => 'screensharer',
                    'sponsor' => 'sponsor',
                    default => 'support',
                };

                return [
                    'minecraft_uuid' => $member->minecraft_uuid,
                    'minecraft_username' => $player ? $player->minecraft_username : null,
                    'is_verified' => (bool) ($player ? $player->is_verified : false),
                    'role' => $storedRole,
                    'role_name' => $user?->roles?->firstWhere('key', $storedRole)?->name
                        ?? match ($storedRole) {
                            'owner' => 'Owner',
                            'manager' => 'Manager',
                            'admin' => 'Administrador',
                            'moderator' => 'Moderador',
                            'screensharer' => 'Screensharer',
                            'builder' => 'Builder',
                            'sponsor' => 'Sponsor',
                            default => ucfirst(str_replace('_', ' ', $storedRole)),
                        },
                    'access_role' => $user?->roles->pluck('key')->first() ?? $accessRole,
                    'access_permissions' => $user?->roles->flatMap->permissions->pluck('key')->unique()->values() ?? collect(),
                    'account_linked' => $user !== null,
                    'is_sponsor' => $member->is_sponsor,
                    'display_order' => $member->display_order,
                ];
            })->filter(fn (array $member): bool => $member['minecraft_username'] !== null)->values()]);
        } catch (QueryException $exception) {
            report($exception);

            return response()->json(['message' => 'No se pudo cargar el equipo.'], 503);
        }
    }
}
