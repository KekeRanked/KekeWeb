<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DiscordAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_start_discord_oauth(): void
    {
        config([
            'services.discord.client_id' => '123456789',
            'services.discord.client_secret' => 'test-secret',
            'services.discord.redirect' => 'https://keke.live/auth/discord/callback',
        ]);

        $response = $this->get('/auth/discord');

        $response->assertRedirectContains('https://discord.com/oauth2/authorize?');
        $response->assertRedirectContains('client_id=123456789');
        $response->assertRedirectContains(urlencode('https://keke.live/auth/discord/callback'));
        $response->assertSessionHas('discord_oauth_state');
    }

    public function test_invalid_callback_state_returns_to_frontend_with_error(): void
    {
        config(['app.frontend_url' => 'https://keke.live']);

        $this->withSession(['discord_oauth_state' => 'expected'])
            ->get('/auth/discord/callback?code=test&state=invalid')
            ->assertRedirect('https://keke.live/?login=error');
    }

    public function test_oauth_preserves_safe_link_return_path(): void
    {
        config([
            'services.discord.client_id' => '123456789',
            'services.discord.client_secret' => 'test-secret',
        ]);

        $this->get('/auth/discord?return_to='.urlencode('/leaderboards?season=0'))
            ->assertSessionHas('discord_oauth_return_to', '/leaderboards?season=0');
    }

    public function test_session_endpoint_requires_authentication(): void
    {
        $this->getJson('/auth/me')->assertUnauthorized();
    }

    public function test_authenticated_user_can_read_and_close_session(): void
    {
        $user = User::factory()->create([
            'discord_id' => '123456789',
            'discord_username' => 'keke_user',
        ]);

        $this->actingAs($user)
            ->getJson('/auth/me')
            ->assertOk()
            ->assertJsonPath('data.discord_username', 'keke_user');

        $this->actingAs($user)
            ->postJson('/auth/logout')
            ->assertOk();

        $this->assertGuest();
    }
}
