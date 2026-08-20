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
            'owner' => ['Dueño', $permissions->keys()->all()],
            'admin' => ['Administrador', $permissions->keys()->all()],
            'editor' => ['Editor', ['content.manage', 'rules.manage', 'events.manage']],
            'moderator' => ['Moderador', ['rules.manage', 'events.manage']],
            'support' => ['Soporte', []],
        ];

        foreach ($roles as $key => [$name, $permissionKeys]) {
            $role = Role::query()->updateOrCreate(['key' => $key], ['name' => $name]);
            $role->permissions()->sync($permissions->whereIn('key', $permissionKeys)->pluck('id'));
        }
    }
}
