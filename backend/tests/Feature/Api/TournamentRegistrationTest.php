<?php

namespace Tests\Feature\Api;

use App\Models\Content;
use App\Models\Minecraft\RankedPlayer;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class TournamentRegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ValidateCsrfToken::class);

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
        ]);
        $secondTeammate = User::factory()->create([
            'minecraft_uuid' => '77777777-7777-4777-8777-777777777777',
            'minecraft_username' => 'LinkedSecond',
            'discord_id' => '100000000000000007',
            'discord_username' => 'linked.second',
        ]);
        $this->verifiedPlayer($captain);
        $this->verifiedPlayer($teammate);
        $this->verifiedPlayer($secondTeammate);

        $this->actingAs($captain)->postJson("/api/events/{$event->slug}/registration", [
            'team_name' => 'Team Cupcake',
            'team_tag' => 'CAKE',
            'members' => [
                ['user_id' => $teammate->id],
                ['user_id' => $secondTeammate->id],
            ],
        ])->assertCreated()
            ->assertJsonPath('data.team_name', 'Team Cupcake')
            ->assertJsonPath('data.members.0.role', 'captain')
            ->assertJsonPath('data.members.1.is_verified', true)
            ->assertJsonPath('data.members.2.minecraft_username', 'LinkedSecond')
            ->assertJsonPath('data.members.2.user.discord_username', 'linked.second');

        $this->assertDatabaseHas('tournament_registrations', [
            'content_id' => $event->id,
            'captain_id' => $captain->id,
            'team_tag' => 'CAKE',
        ]);
        $this->assertDatabaseCount('tournament_registration_members', 3);
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
            'members' => [['minecraft_username' => 'OnlyOne']],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('members');
    }

    public function test_search_only_returns_local_users_that_are_still_verified(): void
    {
        $event = $this->tournament();
        $captain = User::factory()->create();
        $verified = User::factory()->create([
            'minecraft_uuid' => '44444444-4444-4444-8444-444444444444',
            'minecraft_username' => 'Searchable',
            'discord_username' => 'searchable.discord',
        ]);
        User::factory()->create([
            'minecraft_uuid' => '55555555-5555-4555-8555-555555555555',
            'minecraft_username' => 'SearchGhost',
        ]);
        $this->verifiedPlayer($verified);

        $this->actingAs($captain)
            ->getJson("/api/events/{$event->slug}/registration-players?q=Search")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.minecraft_username', 'Searchable')
            ->assertJsonPath('data.0.discord_username', 'searchable.discord');
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

        $this->actingAs($captain)->postJson("/api/events/{$event->slug}/registration", [
            'team_name' => 'Visible Team',
            'notes' => 'Esta nota solo corresponde al staff.',
            'members' => [
                ['user_id' => $firstMember->id],
                ['user_id' => $secondMember->id],
            ],
        ])->assertCreated();

        $this->getJson("/api/events/{$event->slug}/teams")
            ->assertOk()
            ->assertJsonPath('data.0.team_name', 'Visible Team')
            ->assertJsonPath('data.0.members.0.role', 'captain')
            ->assertJsonPath('data.0.members.1.user.discord_username', 'public.one')
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
                'players_per_team' => 3,
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
}
