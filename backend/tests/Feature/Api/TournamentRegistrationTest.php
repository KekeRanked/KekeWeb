<?php

namespace Tests\Feature\Api;

use App\Models\Content;
use App\Models\Minecraft\RankedPlayer;
use App\Models\Permission;
use App\Models\Role;
use App\Models\TournamentRegistration;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class TournamentRegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withSession(['_token' => 'tournament-registration-test-token']);
        $this->withHeader('X-CSRF-TOKEN', 'tournament-registration-test-token');

        config(['database.connections.minecraft_stats' => [
            'driver' => 'sqlite',
            'database' => ':memory:',
            'prefix' => '',
            'foreign_key_constraints' => true,
        ]]);

        Schema::connection('minecraft_stats')->create('ranked_players', function (Blueprint $table): void {
            $table->id();
            $table->uuid('minecraft_uuid')->unique();
            $table->string('minecraft_username', 16);
            $table->string('discord_id', 20)->nullable();
            $table->boolean('is_verified')->default(false);
            $table->timestamps();
        });
    }

    public function test_verified_captain_can_register_a_linked_roster(): void
    {
        $event = $this->tournament();
        $captain = User::factory()->create([
            'minecraft_uuid' => '11111111-1111-4111-8111-111111111111',
            'minecraft_username' => 'CaptainOne',
            'discord_id' => '100000000000000001',
        ]);
        $teammate = User::factory()->create([
            'minecraft_uuid' => '22222222-2222-4222-8222-222222222222',
            'minecraft_username' => 'LinkedMate',
            'discord_id' => '100000000000000002',
            'discord_username' => 'linked.mate',
        ]);
        $this->verifiedPlayer($captain);
        $this->verifiedPlayer($teammate);
        RankedPlayer::query()->create([
            'minecraft_uuid' => '77777777-7777-4777-8777-777777777777',
            'minecraft_username' => 'PluginOnly',
            'discord_id' => '100000000000000007',
            'is_verified' => true,
        ]);
        $extraMembers = $this->pluginMembers(3, 'ExtraLinked');

        $this->actingAs($captain)->postJson("/api/events/{$event->slug}/registration", [
            'team_name' => 'Team Cupcake',
            'team_tag' => 'CAKE',
            'members' => [
                ['minecraft_uuid' => $teammate->minecraft_uuid, 'minecraft_username' => $teammate->minecraft_username],
                ['minecraft_uuid' => '77777777-7777-4777-8777-777777777777', 'minecraft_username' => 'PluginOnly'],
                ...$extraMembers,
            ],
        ])->assertCreated()
            ->assertJsonPath('data.team_name', 'Team Cupcake')
            ->assertJsonPath('data.members.0.role', 'captain')
            ->assertJsonPath('data.members.1.is_verified', true)
            ->assertJsonPath('data.members.1.discord_username', 'linked.mate')
            ->assertJsonPath('data.members.2.minecraft_username', 'PluginOnly')
            ->assertJsonPath('data.members.2.discord_id', '100000000000000007')
            ->assertJsonPath('data.members.2.user_id', null);

        $this->assertDatabaseHas('tournament_registrations', [
            'content_id' => $event->id,
            'captain_id' => $captain->id,
            'team_tag' => 'CAKE',
        ]);
        $this->assertDatabaseCount('tournament_registration_members', 6);
    }

    public function test_team_must_match_the_size_set_by_staff(): void
    {
        $event = $this->tournament();
        $captain = User::factory()->create([
            'minecraft_uuid' => '33333333-3333-4333-8333-333333333333',
            'minecraft_username' => 'CaptainTwo',
            'discord_id' => '100000000000000003',
        ]);
        $this->verifiedPlayer($captain);

        $this->actingAs($captain)->postJson("/api/events/{$event->slug}/registration", [
            'team_name' => 'Incomplete Team',
            'members' => [],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('members');
    }

    public function test_captain_can_use_manual_discord_and_edit_until_registration_closes(): void
    {
        Http::fake([
            'api.mojang.com/users/profiles/minecraft/*' => function (ClientRequest $request) {
                $username = rawurldecode(basename($request->url()));

                return Http::response(['id' => md5(strtolower($username)), 'name' => $username], 200);
            },
        ]);

        $event = $this->tournament();
        $captain = User::factory()->create([
            'minecraft_uuid' => 'abababab-abab-4bab-8bab-abababababab',
            'minecraft_username' => 'ManualCaptain',
            'discord_id' => '100000000000000020',
        ]);
        $this->verifiedPlayer($captain);
        $members = collect(range(1, 5))->map(fn (int $index): array => [
            'minecraft_username' => "Premium{$index}",
            'discord_username' => "manual.user{$index}",
        ])->all();

        $this->actingAs($captain)->postJson("/api/events/{$event->slug}/registration", [
            'team_name' => 'Manual Team',
            'members' => $members,
        ])->assertCreated()
            ->assertJsonPath('data.members.1.minecraft_username', 'Premium1')
            ->assertJsonPath('data.members.1.discord_username', 'manual.user1')
            ->assertJsonPath('data.members.1.is_verified', false);

        $this->actingAs($captain)->postJson("/api/events/{$event->slug}/registration", [
            'team_name' => 'Manual Team Updated',
            'members' => $members,
        ])->assertOk()->assertJsonPath('data.team_name', 'Manual Team Updated');

        $metadata = $event->metadata;
        $metadata['registration_open'] = false;
        $event->update(['metadata' => $metadata]);

        $this->actingAs($captain)->postJson("/api/events/{$event->slug}/registration", [
            'team_name' => 'Closed Edit',
            'members' => $members,
        ])->assertUnprocessable();
    }

    public function test_captain_can_delete_own_team_only_while_registration_is_open(): void
    {
        $event = $this->tournament();
        $captain = User::factory()->create();
        $registration = TournamentRegistration::query()->create([
            'content_id' => $event->id,
            'captain_id' => $captain->id,
            'team_name' => 'Equipo Retirable',
            'status' => 'pending',
        ]);
        $registration->members()->create([
            'content_id' => $event->id,
            'user_id' => $captain->id,
            'minecraft_uuid' => '12121212-1212-4212-8212-121212121212',
            'minecraft_username' => 'DeleteCaptain',
            'is_verified' => true,
            'role' => 'captain',
            'position' => 1,
        ]);

        $this->actingAs($captain)
            ->deleteJson("/api/events/{$event->slug}/registration")
            ->assertOk()
            ->assertJsonPath('meta.registered_teams', 0)
            ->assertJsonPath('meta.spots_left', 8);

        $this->assertDatabaseMissing('tournament_registrations', ['id' => $registration->id]);
        $this->assertDatabaseCount('tournament_registration_members', 0);

        $closedRegistration = TournamentRegistration::query()->create([
            'content_id' => $event->id,
            'captain_id' => $captain->id,
            'team_name' => 'Equipo Cerrado',
            'status' => 'pending',
        ]);
        $metadata = $event->metadata;
        $metadata['registration_open'] = false;
        $event->update(['metadata' => $metadata]);

        $this->actingAs($captain)
            ->deleteJson("/api/events/{$event->slug}/registration")
            ->assertUnprocessable();
        $this->assertDatabaseHas('tournament_registrations', ['id' => $closedRegistration->id]);
    }

    public function test_event_admin_can_delete_any_registered_team(): void
    {
        $event = $this->tournament();
        $captain = User::factory()->create();
        $registration = TournamentRegistration::query()->create([
            'content_id' => $event->id,
            'captain_id' => $captain->id,
            'team_name' => 'Equipo Administrable',
            'status' => 'pending',
        ]);
        $permission = Permission::query()->create([
            'key' => 'events.manage',
            'name' => 'Administrar eventos',
        ]);
        $role = Role::query()->create([
            'key' => 'admin-delete-team',
            'name' => 'Administrador de equipos',
            'priority' => 60,
        ]);
        $role->permissions()->attach($permission);
        $admin = User::factory()->create();
        $admin->roles()->attach($role);

        $this->actingAs($captain)
            ->deleteJson("/api/admin/events/{$event->slug}/registrations/{$registration->id}")
            ->assertForbidden();

        $this->actingAs($admin)
            ->deleteJson("/api/admin/events/{$event->slug}/registrations/{$registration->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('tournament_registrations', ['id' => $registration->id]);
    }

    public function test_search_reads_verified_discord_links_directly_from_rankedminecraft(): void
    {
        $event = $this->tournament();
        $captain = User::factory()->create();
        $verified = User::factory()->create([
            'minecraft_uuid' => '44444444-4444-4444-8444-444444444444',
            'minecraft_username' => 'Searchable',
            'discord_id' => '100000000000000004',
            'discord_username' => 'searchable.discord',
        ]);
        $this->verifiedPlayer($verified);
        RankedPlayer::query()->create([
            'minecraft_uuid' => '55555555-5555-4555-8555-555555555555',
            'minecraft_username' => 'SearchPluginOnly',
            'discord_id' => '100000000000000005',
            'is_verified' => true,
        ]);

        $this->actingAs($captain)
            ->getJson("/api/events/{$event->slug}/registration-players?q=Search")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment([
                'minecraft_username' => 'Searchable',
                'discord_username' => 'searchable.discord',
            ])
            ->assertJsonFragment([
                'minecraft_username' => 'SearchPluginOnly',
                'discord_id' => '100000000000000005',
                'user_id' => null,
            ]);
    }

    public function test_public_can_list_registered_teams_without_private_notes(): void
    {
        $event = $this->tournament();
        $captain = User::factory()->create([
            'minecraft_uuid' => '66666666-6666-4666-8666-666666666666',
            'minecraft_username' => 'PublicCaptain',
            'discord_id' => '100000000000000006',
        ]);
        $this->verifiedPlayer($captain);
        $firstMember = User::factory()->create([
            'minecraft_uuid' => '88888888-8888-4888-8888-888888888888',
            'minecraft_username' => 'PublicMateOne',
            'discord_id' => '100000000000000008',
            'discord_username' => 'public.one',
        ]);
        $secondMember = User::factory()->create([
            'minecraft_uuid' => '99999999-9999-4999-8999-999999999999',
            'minecraft_username' => 'PublicMateTwo',
            'discord_id' => '100000000000000009',
            'discord_username' => 'public.two',
        ]);
        $this->verifiedPlayer($firstMember);
        $this->verifiedPlayer($secondMember);
        $extraMembers = $this->pluginMembers(3, 'PublicExtra');

        $this->actingAs($captain)->postJson("/api/events/{$event->slug}/registration", [
            'team_name' => 'Visible Team',
            'notes' => 'Esta nota solo corresponde al staff.',
            'members' => [
                ['minecraft_uuid' => $firstMember->minecraft_uuid, 'minecraft_username' => $firstMember->minecraft_username],
                ['minecraft_uuid' => $secondMember->minecraft_uuid, 'minecraft_username' => $secondMember->minecraft_username],
                ...$extraMembers,
            ],
        ])->assertCreated();

        $this->getJson("/api/events/{$event->slug}/teams")
            ->assertOk()
            ->assertJsonPath('data.0.team_name', 'Visible Team')
            ->assertJsonPath('data.0.members.0.role', 'captain')
            ->assertJsonPath('data.0.members.1.discord_username', 'public.one')
            ->assertJsonMissing(['notes' => 'Esta nota solo corresponde al staff.'])
            ->assertJsonPath('meta.registered_teams', 1)
            ->assertJsonPath('meta.max_teams', 8);
    }

    private function tournament(): Content
    {
        return Content::query()->create([
            'type' => 'event',
            'slug' => 'copa-prueba',
            'title' => 'Copa de prueba',
            'body' => 'Detalles',
            'status' => 'published',
            'published_at' => now(),
            'metadata' => [
                'type' => 'tournament',
                'is_history' => false,
                'registration_open' => true,
                'team_count' => 8,
                'players_per_team' => 8,
            ],
        ]);
    }

    private function verifiedPlayer(User $user): void
    {
        RankedPlayer::query()->create([
            'minecraft_uuid' => $user->minecraft_uuid,
            'minecraft_username' => $user->minecraft_username,
            'discord_id' => $user->discord_id,
            'is_verified' => true,
        ]);
    }

    private function pluginMembers(int $count, string $prefix): array
    {
        return collect(range(1, $count))->map(function (int $index) use ($prefix): array {
            $suffix = str_pad((string) $index, 12, '0', STR_PAD_LEFT);
            $uuid = "aaaaaaaa-aaaa-4aaa-8aaa-{$suffix}";
            RankedPlayer::query()->create([
                'minecraft_uuid' => $uuid,
                'minecraft_username' => "{$prefix}{$index}",
                'discord_id' => '20000000'.str_pad((string) $index, 10, '0', STR_PAD_LEFT),
                'is_verified' => true,
            ]);

            return ['minecraft_uuid' => $uuid, 'minecraft_username' => "{$prefix}{$index}"];
        })->all();
    }
}
