<?php

namespace Tests\Feature\Api;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EventAdminTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_can_publish_upcoming_tournament_without_winners(): void
    {
        $permission = Permission::query()->create([
            'key' => 'events.manage',
            'name' => 'Administrar eventos',
        ]);
        $role = Role::query()->create([
            'key' => 'admin',
            'name' => 'Administrador',
            'priority' => 60,
        ]);
        $role->permissions()->attach($permission);
        $user = User::factory()->create();
        $user->roles()->attach($role);

        $this->actingAs($user)->postJson('/api/admin/events', [
            'title' => 'Copa KEKE — Torneo de prueba',
            'excerpt' => 'Inscripciones de prueba',
            'body' => 'Evento para probar el formulario de equipos.',
            'status' => 'published',
            'metadata' => [
                'type' => 'tournament',
                'is_history' => false,
                'registration_open' => true,
                'registration_deadline' => '16 de octubre de 2026 23:59',
                'bracket_type' => 'single_elimination',
                'team_count' => 4,
                'players_per_team' => 3,
                'winners' => [],
                'honorable_mentions' => [],
            ],
        ])->assertCreated()
            ->assertJsonPath('data.status', 'published')
            ->assertJsonPath('data.metadata.type', 'tournament')
            ->assertJsonMissingPath('data.metadata.winners');

        $this->assertDatabaseHas('content', [
            'type' => 'event',
            'status' => 'published',
            'title' => 'Copa KEKE — Torneo de prueba',
        ]);
    }
}
