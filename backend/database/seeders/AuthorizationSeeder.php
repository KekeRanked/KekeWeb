<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class AuthorizationSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = collect([
            'content.manage' => 'Administrar contenido',
            'rules.manage' => 'Administrar reglas',
            'events.manage' => 'Administrar eventos',
            'staff.manage' => 'Administrar staff',
            'store.manage' => 'Administrar tienda',
            'tournaments.manage' => 'Administrar torneos y drafts',
        ])->map(fn (string $name, string $key) => Permission::query()->updateOrCreate(
            ['key' => $key],
            ['name' => $name],
        ));

        $roles = [
            'owner' => ['Dueño', 100, $permissions->keys()->all()],
            'manager' => ['Manager', 80, ['content.manage', 'rules.manage', 'events.manage', 'staff.manage', 'store.manage', 'tournaments.manage']],
            'admin' => ['Administrador', 60, ['content.manage', 'rules.manage', 'events.manage', 'staff.manage', 'store.manage', 'tournaments.manage']],
            'moderator' => ['Moderador', 40, ['rules.manage', 'events.manage']],
            'screensharer' => ['Screensharer', 40, ['rules.manage']],
            'sponsor' => ['Sponsor', 10, []],
            'builder' => ['Builder', 40, []],
        ];

        foreach ($roles as $key => [$name, $priority, $permissionKeys]) {
            $role = Role::query()->updateOrCreate(['key' => $key], ['name' => $name, 'priority' => $priority]);
            $role->permissions()->sync($permissions->whereIn('key', $permissionKeys)->pluck('id'));
        }
    }
}
