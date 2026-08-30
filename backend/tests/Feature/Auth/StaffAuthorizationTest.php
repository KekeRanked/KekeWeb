<?php

namespace Tests\Feature\Auth;

use App\Models\Permission;
use App\Models\Role;
use App\Models\StaffMember;
use App\Models\User;
use App\Services\StaffAuthorizationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StaffAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_assigns_the_public_staff_role_to_the_linked_account(): void
    {
        $permission = Permission::query()->create([
            'key' => 'staff.manage',
            'name' => 'Administrar staff',
        ]);
        $role = Role::query()->create([
            'key' => 'manager',
            'name' => 'Manager',
            'priority' => 80,
        ]);
        $role->permissions()->attach($permission);

        $user = User::factory()->create([
            'minecraft_uuid' => '11111111-1111-4111-8111-111111111111',
        ]);
        StaffMember::query()->create([
            'minecraft_uuid' => $user->minecraft_uuid,
            'role' => 'manager',
            'is_sponsor' => false,
            'display_order' => 1,
            'is_active' => true,
        ]);

        $synced = app(StaffAuthorizationService::class)->sync($user)->load('roles.permissions');

        $this->assertSame(['manager'], $synced->roles->pluck('key')->all());
        $this->assertSame(['staff.manage'], $synced->roles->flatMap->permissions->pluck('key')->all());
    }

    public function test_it_removes_access_when_the_public_staff_member_is_inactive(): void
    {
        $role = Role::query()->create([
            'key' => 'moderator',
            'name' => 'Moderador',
            'priority' => 40,
        ]);
        $user = User::factory()->create([
            'minecraft_uuid' => '22222222-2222-4222-8222-222222222222',
        ]);
        $user->roles()->attach($role);
        StaffMember::query()->create([
            'minecraft_uuid' => $user->minecraft_uuid,
            'role' => 'moderator',
            'is_sponsor' => false,
            'display_order' => 2,
            'is_active' => false,
        ]);

        $synced = app(StaffAuthorizationService::class)->sync($user);

        $this->assertCount(0, $synced->roles()->get());
    }

    public function test_it_supports_the_legacy_administrator_role_name(): void
    {
        $role = Role::query()->create([
            'key' => 'admin',
            'name' => 'Administrador',
            'priority' => 60,
        ]);
        $user = User::factory()->create([
            'minecraft_uuid' => '33333333-3333-4333-8333-333333333333',
        ]);
        StaffMember::query()->create([
            'minecraft_uuid' => $user->minecraft_uuid,
            'role' => 'administrator',
            'is_sponsor' => false,
            'display_order' => 3,
            'is_active' => true,
        ]);

        $synced = app(StaffAuthorizationService::class)->sync($user);

        $this->assertTrue($synced->roles()->whereKey('admin')->exists());
    }
}
