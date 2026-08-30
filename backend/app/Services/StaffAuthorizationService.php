<?php

namespace App\Services;

use App\Models\Role;
use App\Models\StaffMember;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class StaffAuthorizationService
{
    public function sync(User $user): User
    {
        if (! $user->minecraft_uuid) {
            return $user;
        }

        $member = StaffMember::query()
            ->where('minecraft_uuid', $user->minecraft_uuid)
            ->first();

        if (! $member) {
            return $user;
        }

        if (! $member->is_active) {
            $user->roles()->detach();

            return $user->refresh();
        }

        $roleKey = $this->normalizeRoleKey($member->role);
        $role = Role::query()->where('key', $roleKey)->first();

        if (! $role) {
            Log::warning('No fue posible sincronizar el acceso de un miembro del Staff.', [
                'minecraft_uuid' => $user->minecraft_uuid,
                'role' => $roleKey,
            ]);

            return $user;
        }

        $user->roles()->sync([$role->id]);

        return $user->refresh();
    }

    public function revoke(User $user): User
    {
        $user->roles()->detach();

        return $user->refresh();
    }

    public function normalizeRoleKey(string $role): string
    {
        return $role === 'administrator' ? 'admin' : $role;
    }
}
