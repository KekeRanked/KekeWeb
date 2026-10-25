<?php

namespace Tests\Feature\Api;

use App\Models\Content;
use App\Models\Minecraft\RankedPlayer;
use App\Models\Permission;
use App\Models\Role;
use App\Models\TournamentRegistration;
use App\Models\TournamentRegistrationMember;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
        $pluginUser = User::factory()->create([
            'minecraft_uuid' => '77777777-7777-4777-8777-777777777777',
            'minecraft_username' => 'PluginOnly',
            'discord_id' => '100000000000000007',
        ]);
        $this->verifiedPlayer($pluginUser);
        $extraMembers = $this->registeredMembers(3, 'ExtraLinked');

        $this->actingAs($captain)->postJson("/api/events/{$event->slug}/registration", [
            'team_name' => 'Team Cupcake',
            'team_tag' => 'CAKE',
            'members' => [
                ['user_id' => $teammate->id, 'minecraft_uuid' => $teammate->minecraft_uuid, 'minecraft_username' => $teammate->minecraft_username],
                ['user_id' => $pluginUser->id, 'minecraft_uuid' => $pluginUser->minecraft_uuid, 'minecraft_username' => $pluginUser->minecraft_username],
                ...$extraMembers,
            ],
        ])->assertCreated()
            ->assertJsonPath('data.team_name', 'Team Cupcake')
            ->assertJsonPath('data.members.0.role', 'captain')
            ->assertJsonPath('data.members.1.is_verified', true)
            ->assertJsonPath('data.members.1.invitation_status', 'pending')
            ->assertJsonPath('data.members.1.discord_username', 'linked.mate')
            ->assertJsonPath('data.members.2.minecraft_username', 'PluginOnly')
            ->assertJsonPath('data.members.2.discord_id', '100000000000000007')
            ->assertJsonPath('data.members.2.user_id', $pluginUser->id);

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

    public function test_player_cannot_join_two_teams_in_the_same_tournament(): void
    {
        $event = $this->tournament();
        $firstCaptain = User::factory()->create();
        $occupiedPlayer = User::factory()->create([
            'minecraft_uuid' => '34343434-3434-4434-8434-343434343434',
            'minecraft_username' => 'AlreadyTaken',
            'discord_id' => '100000000000000034',
        ]);
        $this->verifiedPlayer($occupiedPlayer);
        $firstRegistration = TournamentRegistration::query()->create([
            'content_id' => $event->id,
            'captain_id' => $firstCaptain->id,
            'team_name' => 'Primer Equipo',
            'status' => 'pending',
        ]);
        $firstRegistration->members()->create([
            'content_id' => $event->id,
            'user_id' => $occupiedPlayer->id,
            'discord_id' => $occupiedPlayer->discord_id,
            'minecraft_uuid' => $occupiedPlayer->minecraft_uuid,
            'minecraft_username' => $occupiedPlayer->minecraft_username,
            'is_verified' => true,
            'role' => 'member',
            'invitation_status' => 'accepted',
            'position' => 1,
        ]);

        $secondCaptain = User::factory()->create([
            'minecraft_uuid' => '56565656-5656-4565-8565-565656565656',
            'minecraft_username' => 'SecondCaptain',
            'discord_id' => '100000000000000056',
        ]);
        $this->verifiedPlayer($secondCaptain);
        $extraMembers = $this->registeredMembers(4, 'ConflictExtra');

        $this->actingAs($secondCaptain)->postJson("/api/events/{$event->slug}/registration", [
            'team_name' => 'Segundo Equipo',
            'members' => [
                ['user_id' => $occupiedPlayer->id, 'minecraft_uuid' => $occupiedPlayer->minecraft_uuid, 'minecraft_username' => $occupiedPlayer->minecraft_username],
                ...$extraMembers,
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('members')
            ->assertJsonFragment(['AlreadyTaken ya está inscrito en Primer Equipo. Un jugador sólo puede pertenecer a un equipo por torneo.']);

        $this->assertDatabaseMissing('tournament_registrations', ['team_name' => 'Segundo Equipo']);
    }

    public function test_unregistered_members_cannot_be_added_manually(): void
    {
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
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('members.0.user_id');

        $this->assertDatabaseMissing('tournament_registrations', ['team_name' => 'Manual Team']);
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

    public function test_search_only_returns_users_registered_on_the_web(): void
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
            ->assertJsonCount(1, 'data')
            ->assertJsonFragment([
                'minecraft_username' => 'Searchable',
                'discord_username' => 'searchable.discord',
            ])
            ->assertJsonMissing(['minecraft_username' => 'SearchPluginOnly']);
    }

    public function test_invitation_persists_until_member_accepts_it(): void
    {
        $event = $this->tournament();
        $captain = User::factory()->create([
            'minecraft_uuid' => '10101010-1010-4010-8010-101010101010',
            'minecraft_username' => 'InviteCaptain',
            'discord_id' => '100000000000000101',
        ]);
        $invitee = User::factory()->create([
            'minecraft_uuid' => '20202020-2020-4020-8020-202020202020',
            'minecraft_username' => 'InvitedPlayer',
            'discord_id' => '100000000000000202',
        ]);
        $this->verifiedPlayer($captain);
        $this->verifiedPlayer($invitee);
        $otherMembers = $this->registeredMembers(4, 'InviteExtra');

        $this->actingAs($captain)->postJson("/api/events/{$event->slug}/registration", [
            'team_name' => 'Invitation Team',
            'members' => [
                ['user_id' => $invitee->id, 'minecraft_uuid' => $invitee->minecraft_uuid, 'minecraft_username' => $invitee->minecraft_username],
                ...$otherMembers,
            ],
        ])->assertCreated();

        $invitation = TournamentRegistrationMember::query()
            ->where('user_id', $invitee->id)
            ->firstOrFail();

        $this->actingAs($invitee)->getJson('/api/tournament-invitations')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.team_name', 'Invitation Team')
            ->assertJsonPath('data.0.event.slug', $event->slug);

        // A new authenticated request (equivalent to returning after logout)
        // still reads the pending invitation from the database.
        $this->actingAs($invitee)->getJson('/api/tournament-invitations')
            ->assertJsonCount(1, 'data');

        $this->actingAs($invitee)->postJson("/api/tournament-invitations/{$invitation->id}/respond", [
            'action' => 'accept',
        ])->assertOk();

        $this->assertDatabaseHas('tournament_registration_members', [
            'id' => $invitation->id,
            'user_id' => $invitee->id,
            'invitation_status' => 'accepted',
        ]);

        $this->actingAs($captain)->postJson("/api/events/{$event->slug}/registration", [
            'team_name' => 'Invitation Team Updated',
            'members' => [
                ['user_id' => $invitee->id, 'minecraft_uuid' => $invitee->minecraft_uuid, 'minecraft_username' => $invitee->minecraft_username],
                ...$otherMembers,
            ],
        ])->assertOk();

        $this->assertDatabaseHas('tournament_registration_members', [
            'id' => $invitation->id,
            'user_id' => $invitee->id,
            'invitation_status' => 'accepted',
        ]);
        $this->actingAs($invitee)->getJson('/api/tournament-invitations')
            ->assertJsonCount(0, 'data');
    }

    public function test_accepting_one_team_rejects_other_pending_invitations_for_same_tournament(): void
    {
        $event = $this->tournament();
        $invitee = User::factory()->create();
        $firstTeam = TournamentRegistration::query()->create([
            'content_id' => $event->id,
            'captain_id' => User::factory()->create()->id,
            'team_name' => 'First Choice',
            'status' => 'pending',
        ]);
        $secondTeam = TournamentRegistration::query()->create([
            'content_id' => $event->id,
            'captain_id' => User::factory()->create()->id,
            'team_name' => 'Second Choice',
            'status' => 'pending',
        ]);
        $memberData = [
            'content_id' => $event->id,
            'user_id' => $invitee->id,
            'minecraft_uuid' => '40404040-4040-4040-8040-404040404040',
            'minecraft_username' => 'MultipleInvite',
            'is_verified' => true,
            'role' => 'member',
            'invitation_status' => 'pending',
            'position' => 2,
        ];
        $acceptedInvitation = $firstTeam->members()->create($memberData);
        $rejectedInvitation = $secondTeam->members()->create($memberData);

        $this->actingAs($invitee)->postJson("/api/tournament-invitations/{$acceptedInvitation->id}/respond", [
            'action' => 'accept',
        ])->assertOk();

        $this->assertDatabaseHas('tournament_registration_members', [
            'id' => $acceptedInvitation->id,
            'invitation_status' => 'accepted',
        ]);
        $this->assertDatabaseHas('tournament_registration_members', [
            'id' => $rejectedInvitation->id,
            'invitation_status' => 'rejected',
        ]);
    }

    public function test_only_invited_member_can_respond_and_rejection_is_persisted(): void
    {
        $event = $this->tournament();
        $captain = User::factory()->create();
        $invitee = User::factory()->create();
        $stranger = User::factory()->create();
        $registration = TournamentRegistration::query()->create([
            'content_id' => $event->id,
            'captain_id' => $captain->id,
            'team_name' => 'Private Invitation',
            'status' => 'pending',
        ]);
        $invitation = $registration->members()->create([
            'content_id' => $event->id,
            'user_id' => $invitee->id,
            'minecraft_uuid' => '30303030-3030-4030-8030-303030303030',
            'minecraft_username' => 'PrivateInvitee',
            'is_verified' => true,
            'role' => 'member',
            'invitation_status' => 'pending',
            'position' => 2,
        ]);

        $this->actingAs($stranger)->postJson("/api/tournament-invitations/{$invitation->id}/respond", [
            'action' => 'accept',
        ])->assertForbidden();

        $this->actingAs($invitee)->postJson("/api/tournament-invitations/{$invitation->id}/respond", [
            'action' => 'reject',
        ])->assertOk();

        $this->assertDatabaseHas('tournament_registration_members', [
            'id' => $invitation->id,
            'invitation_status' => 'rejected',
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
        $extraMembers = $this->registeredMembers(3, 'PublicExtra');

        $this->actingAs($captain)->postJson("/api/events/{$event->slug}/registration", [
            'team_name' => 'Visible Team',
            'notes' => 'Esta nota solo corresponde al staff.',
            'members' => [
                ['user_id' => $firstMember->id, 'minecraft_uuid' => $firstMember->minecraft_uuid, 'minecraft_username' => $firstMember->minecraft_username],
                ['user_id' => $secondMember->id, 'minecraft_uuid' => $secondMember->minecraft_uuid, 'minecraft_username' => $secondMember->minecraft_username],
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

    private function registeredMembers(int $count, string $prefix): array
    {
        return collect(range(1, $count))->map(function (int $index) use ($prefix): array {
            $suffix = str_pad((string) $index, 12, '0', STR_PAD_LEFT);
            $uuid = "aaaaaaaa-aaaa-4aaa-8aaa-{$suffix}";
            $user = User::factory()->create([
                'minecraft_uuid' => $uuid,
                'minecraft_username' => "{$prefix}{$index}",
                'discord_id' => '20000000'.str_pad((string) $index, 10, '0', STR_PAD_LEFT),
            ]);
            $this->verifiedPlayer($user);

            return ['user_id' => $user->id, 'minecraft_uuid' => $uuid, 'minecraft_username' => "{$prefix}{$index}"];
        })->all();
    }
}
