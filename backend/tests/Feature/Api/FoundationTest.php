<?php

namespace Tests\Feature\Api;

use App\Models\Content;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FoundationTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_endpoint_describes_the_api(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertJsonPath('name', 'KEKE API')
            ->assertJsonPath('status', 'online');
    }

    public function test_only_published_news_is_public(): void
    {
        Content::query()->create([
            'type' => 'news',
            'slug' => 'publicada',
            'title' => 'Publicada',
            'body' => 'Contenido público',
            'status' => 'published',
            'published_at' => now(),
        ]);

        Content::query()->create([
            'type' => 'news',
            'slug' => 'borrador',
            'title' => 'Borrador',
            'body' => 'Contenido privado',
            'status' => 'draft',
        ]);

        $this->getJson('/api/news')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.slug', 'publicada');
    }

    public function test_three_ranked_servers_are_seeded(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this->assertDatabaseCount('match_servers', 3);
        $this->getJson('/api/ranked/servers')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_match_server_can_publish_a_snapshot(): void
    {
        config(['ranked.server_tokens.ranked-1' => 'test-secret']);

        $this->withHeader('X-Server-Token', 'test-secret')
            ->putJson('/api/internal/servers/ranked-1/snapshot', [
                'status' => 'playing',
                'player_count' => 3,
                'match' => [
                    'match_id' => 'match-test-1',
                    'queue_key' => '5v5ctw',
                    'rating_key' => 'ranked_5v5_ctw',
                    'map_name' => 'Citadel',
                    'phase' => 'playing',
                    'participants' => [
                        ['minecraft_username' => 'PlayerOne', 'team' => 'red', 'role' => 'player'],
                        ['minecraft_username' => 'PlayerTwo', 'team' => 'blue', 'role' => 'player'],
                        ['minecraft_username' => 'Observer', 'role' => 'observer'],
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('server', 'ranked-1');

        $this->assertDatabaseHas('live_matches', ['match_id' => 'match-test-1']);
        $this->assertDatabaseCount('live_match_participants', 3);
    }
}
