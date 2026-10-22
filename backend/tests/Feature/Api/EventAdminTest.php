<?php

namespace Tests\Feature\Api;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Content;
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
            ->assertJsonPath('data.metadata.winners', []);

        $this->assertDatabaseHas('content', [
            'type' => 'event',
            'status' => 'published',
            'title' => 'Copa KEKE — Torneo de prueba',
        ]);
    }

    public function test_staff_can_open_and_update_an_event_draft(): void
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
        $draft = Content::query()->create([
            'type' => 'event',
            'slug' => 'torneo-borrador',
            'title' => 'Torneo borrador',
            'excerpt' => 'Descripción inicial',
            'body' => 'Información inicial',
            'status' => 'draft',
            'author_id' => $user->id,
            'metadata' => [
                'type' => 'tournament',
                'format' => '5v5 CTW',
                'team_count' => 8,
                'players_per_team' => 5,
            ],
        ]);

        $this->actingAs($user)
            ->getJson("/api/admin/events/{$draft->id}")
            ->assertOk()
            ->assertJsonPath('data.title', 'Torneo borrador')
            ->assertJsonPath('data.metadata.format', '5v5 CTW');

        $this->actingAs($user)
            ->putJson("/api/admin/events/{$draft->id}", [
                'title' => 'Avengers: Doomsday',
                'excerpt' => 'Descripción actualizada',
                'body' => 'Información actualizada',
                'status' => 'draft',
                'metadata' => [
                    'type' => 'tournament',
                    'format' => '5v5 CTW',
                    'team_count' => 8,
                    'players_per_team' => 5,
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.title', 'Avengers: Doomsday');

        $this->assertDatabaseHas('content', [
            'id' => $draft->id,
            'title' => 'Avengers: Doomsday',
            'status' => 'draft',
        ]);
    }

    public function test_staff_can_hide_republish_and_delete_an_event(): void
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
        $event = Content::query()->create([
            'type' => 'event',
            'slug' => 'evento-visible',
            'title' => 'Evento visible',
            'body' => 'Información',
            'status' => 'published',
            'published_at' => now(),
            'author_id' => $user->id,
            'metadata' => ['type' => 'tournament', 'is_history' => false],
        ]);

        $this->actingAs($user)
            ->putJson("/api/admin/events/{$event->id}", ['status' => 'draft'])
            ->assertOk()
            ->assertJsonPath('data.status', 'draft');

        $this->getJson("/api/events/{$event->slug}")->assertNotFound();

        $this->actingAs($user)
            ->putJson("/api/admin/events/{$event->id}", ['status' => 'published'])
            ->assertOk()
            ->assertJsonPath('data.status', 'published');

        $this->getJson("/api/events/{$event->slug}")->assertOk();

        $this->actingAs($user)
            ->deleteJson("/api/admin/events/{$event->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('content', ['id' => $event->id]);
    }
}
