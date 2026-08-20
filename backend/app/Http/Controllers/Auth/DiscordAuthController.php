<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class DiscordAuthController extends Controller
{
    public function redirect(Request $request): RedirectResponse
    {
        $clientId = config('services.discord.client_id');

        abort_if(! $clientId, 503, 'Discord OAuth todavía no está configurado.');

        $state = Str::random(64);
        $request->session()->put('discord_oauth_state', $state);

        $query = http_build_query([
            'client_id' => $clientId,
            'redirect_uri' => config('services.discord.redirect'),
            'response_type' => 'code',
            'scope' => 'identify email',
            'state' => $state,
            'prompt' => 'none',
        ]);

        return redirect()->away('https://discord.com/oauth2/authorize?'.$query);
    }

    public function callback(Request $request): RedirectResponse
    {
        $frontend = rtrim((string) config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');
        $expectedState = (string) $request->session()->pull('discord_oauth_state', '');
        $receivedState = $request->string('state')->toString();

        if ($request->filled('error') || $expectedState === '' || ! hash_equals($expectedState, $receivedState)) {
            return redirect()->away($frontend.'/?login=error');
        }

        $tokenResponse = Http::asForm()->post('https://discord.com/api/oauth2/token', [
            'client_id' => config('services.discord.client_id'),
            'client_secret' => config('services.discord.client_secret'),
            'grant_type' => 'authorization_code',
            'code' => $request->string('code')->toString(),
            'redirect_uri' => config('services.discord.redirect'),
        ]);

        if ($tokenResponse->failed()) {
            report(new \RuntimeException('Discord rechazó el intercambio OAuth.'));

            return redirect()->away($frontend.'/?login=error');
        }

        $discordResponse = Http::withToken($tokenResponse->json('access_token'))
            ->get('https://discord.com/api/users/@me');

        if ($discordResponse->failed() || ! $discordResponse->json('id')) {
            report(new \RuntimeException('Discord no devolvió el perfil del usuario.'));

            return redirect()->away($frontend.'/?login=error');
        }

        $discord = $discordResponse->json();
        $displayName = $discord['global_name'] ?: $discord['username'];

        $user = User::query()->updateOrCreate(
            ['discord_id' => (string) $discord['id']],
            [
                'name' => $displayName,
                'email' => $discord['email'] ?? null,
                'discord_username' => $discord['username'],
                'discord_avatar' => $discord['avatar'] ?? null,
            ],
        );

        Auth::login($user, true);
        $request->session()->regenerate();

        return redirect()->away($frontend.'/?login=success');
    }
}
