<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\Permission;
use App\Models\StaffMember;
use App\Models\User;
use App\Models\Minecraft\RankedPlayer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class RoleAdminController extends Controller
{
    public function index(): JsonResponse
    {
        $staffMembers = StaffMember::query()->orderBy('display_order')->get();
        try {
            $staffPlayers = RankedPlayer::query()
                ->whereIn('minecraft_uuid', $staffMembers->pluck('minecraft_uuid'))
                ->get(['minecraft_uuid', 'minecraft_username'])
                ->keyBy('minecraft_uuid');
        } catch (Throwable) {
            $staffPlayers = collect();
        }

        return response()->json([
            'actor_priority' => (int) auth()->user()->roles()->max('priority'),
            'actor_minecraft_uuid' => auth()->user()->minecraft_uuid,
            'roles' => Role::query()->with('permissions:id,key,name')->orderByDesc('priority')->get(['id', 'key', 'name', 'priority']),
            'users' => User::query()->with('roles:id,key,name')->orderBy('name')->get([
                'id', 'name', 'discord_username', 'minecraft_username', 'minecraft_uuid',
            ]),
            'staff_members' => $staffMembers->map(fn (StaffMember $member): array => [
                'minecraft_uuid' => $member->minecraft_uuid,
                'minecraft_username' => $staffPlayers->get($member->minecraft_uuid)?->minecraft_username,
                'role' => $member->role === 'administrator' ? 'admin' : $member->role,
                'is_sponsor' => $member->is_sponsor,
                'display_order' => $member->display_order,
                'is_active' => $member->is_active,
            ])->values(),
        ]);
    }

    public function searchVerified(Request $request): JsonResponse
    {
        $term = trim($request->string('q')->toString());
        if (mb_strlen($term) < 2) return response()->json(['data' => []]);
        try {
            $players = RankedPlayer::query()
                ->where('is_verified', 1)
                ->where(function ($query) use ($term): void {
                    $query->where('minecraft_username', 'like', "%{$term}%")
                        ->orWhere('discord_id', 'like', "%{$term}%")
                        ->orWhere('minecraft_uuid', 'like', "%{$term}%");
                })->limit(20)->get(['minecraft_uuid', 'minecraft_username', 'discord_id']);
        } catch (Throwable) {
            return response()->json(['data' => []]);
        }
        $discordIds = $players->pluck('discord_id')->filter()->values();
        $existing = User::query()->whereIn('discord_id', $discordIds)->with('roles:id,key,name')->get()->keyBy('discord_id');
        return response()->json(['data' => $players->map(fn ($player) => [
            'minecraft_uuid' => $player->minecraft_uuid,
            'minecraft_username' => $player->minecraft_username,
            'discord_id' => $player->discord_id,
            'user' => $existing->get($player->discord_id),
        ])->values()]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate(['roles' => ['required', 'array'], 'roles.*' => ['string', 'exists:roles,key']]);
        $actorPriority = (int) $request->user()->roles()->max('priority');
        $selectedRoles = Role::query()->whereIn('key', $data['roles'])->get();
        abort_if($selectedRoles->contains(fn (Role $role): bool => $role->priority >= $actorPriority), 403, 'No puedes asignar un rol de nivel igual o superior al tuyo.');
        $user->roles()->sync($selectedRoles->pluck('id'));

        if ($user->minecraft_uuid && $selectedRoles->count() === 1) {
            StaffMember::query()->where('minecraft_uuid', $user->minecraft_uuid)
                ->update(['role' => $selectedRoles->first()->key]);
        }

        return response()->json(['data' => $user->fresh()->load('roles:id,key,name')]);
    }

    public function updatePublicStaff(Request $request, string $minecraftUuid): JsonResponse
    {
        $data = $request->validate([
            'role' => ['required', 'string', 'exists:roles,key'],
            'is_sponsor' => ['required', 'boolean'],
            'display_order' => ['required', 'integer', 'min:0', 'max:65535'],
            'is_active' => ['required', 'boolean'],
        ]);
        $actor = $request->user();
        $actorPriority = (int) $actor->roles()->max('priority');
        $targetPriority = (int) Role::query()->where('key', $data['role'])->value('priority');
        $isSelf = $actor->minecraft_uuid === $minecraftUuid;
        abort_if($targetPriority > $actorPriority || ($targetPriority === $actorPriority && ! $isSelf), 403, 'No puedes administrar un miembro de nivel igual o superior al tuyo.');

        $verified = RankedPlayer::query()
            ->where('minecraft_uuid', $minecraftUuid)
            ->where('is_verified', 1)
            ->exists();
        abort_unless($verified, 422, 'El jugador debe estar verificado.');

        $member = StaffMember::query()->updateOrCreate(
            ['minecraft_uuid' => $minecraftUuid],
            $data,
        );

        return response()->json(['data' => [
            'minecraft_uuid' => $member->minecraft_uuid,
            'minecraft_username' => RankedPlayer::query()->where('minecraft_uuid', $member->minecraft_uuid)->value('minecraft_username'),
            'role' => $member->role,
            'is_sponsor' => $member->is_sponsor,
            'display_order' => $member->display_order,
            'is_active' => $member->is_active,
        ]]);
    }

    public function deletePublicStaff(Request $request, string $minecraftUuid): JsonResponse
    {
        $member = StaffMember::query()->where('minecraft_uuid', $minecraftUuid)->firstOrFail();
        $roleKey = $member->role === 'administrator' ? 'admin' : $member->role;
        $targetPriority = (int) Role::query()->where('key', $roleKey)->value('priority');
        $actor = $request->user();
        $actorPriority = (int) $actor->roles()->max('priority');
        $isSelf = $actor->minecraft_uuid === $minecraftUuid;
        abort_if($targetPriority > $actorPriority || ($targetPriority === $actorPriority && ! $isSelf), 403, 'No puedes retirar un miembro de nivel igual o superior al tuyo.');
        $member->delete();

        return response()->json([], 204);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'discord_id' => ['required', 'string', 'max:20', 'unique:users,discord_id'],
            'minecraft_uuid' => ['nullable', 'uuid', 'unique:users,minecraft_uuid'],
            'minecraft_username' => ['nullable', 'string', 'max:16'],
            'role' => ['required', 'string', 'exists:roles,key'],
        ]);

        $role = $data['role'];
        unset($data['role']);
        $actorPriority = (int) $request->user()->roles()->max('priority');
        abort_if((int) Role::where('key', $role)->value('priority') >= $actorPriority, 403, 'No puedes asignar un rol de nivel igual o superior al tuyo.');
        $user = User::query()->create($data);
        $user->roles()->sync([Role::query()->where('key', $role)->value('id')]);

        return response()->json(['data' => $user->fresh()->load('roles:id,key,name')], 201);
    }

    public function createRole(Request $request): JsonResponse
    {
        $data = $request->validate([
            'key' => ['required', 'string', 'alpha_dash', 'max:40', 'unique:roles,key'],
            'name' => ['required', 'string', 'max:80'], 'priority' => ['nullable', 'integer', 'min:1', 'max:99'],
            'permissions' => ['array'],
            'permissions.*' => ['string', 'exists:permissions,key'],
        ]);
        $actorPriority = (int) $request->user()->roles()->max('priority');
        $priority = (int) ($data['priority'] ?? 10); abort_if($priority >= $actorPriority, 403, 'No puedes crear un rol de tu mismo nivel o superior.');
        $role = Role::create(['key' => strtolower($data['key']), 'name' => $data['name'], 'priority' => $priority]);
        $role->permissions()->sync(Permission::whereIn('key', $data['permissions'] ?? [])->pluck('id'));
        return response()->json(['data' => $role->fresh()->load('permissions:id,key,name')], 201);
    }

    public function updateRole(Request $request, Role $role): JsonResponse
    {
        abort_if($role->key === 'owner' || $role->priority >= (int) $request->user()->roles()->max('priority'), 403, 'No puedes modificar un rol de nivel igual o superior.');
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:80'], 'priority' => ['sometimes', 'integer', 'min:1', 'max:99'],
            'permissions' => ['array'],
            'permissions.*' => ['string', 'exists:permissions,key'],
        ]);
        if (isset($data['priority'])) abort_if($data['priority'] >= (int) $request->user()->roles()->max('priority'), 403, 'No puedes asignar un nivel igual o superior al tuyo.');
        $role->update(['name' => $data['name'] ?? $role->name, 'priority' => $data['priority'] ?? $role->priority]);
        $role->permissions()->sync(Permission::whereIn('key', $data['permissions'] ?? [])->pluck('id'));
        return response()->json(['data' => $role->fresh()->load('permissions:id,key,name')]);
    }

    public function deleteRole(Role $role): JsonResponse
    {
        abort_if($role->priority >= (int) request()->user()->roles()->max('priority'), 403, 'No puedes eliminar un rol de nivel igual o superior.');
        $role->users()->detach();
        $role->permissions()->detach();
        $role->delete();
        return response()->json([], 204);
    }
}
