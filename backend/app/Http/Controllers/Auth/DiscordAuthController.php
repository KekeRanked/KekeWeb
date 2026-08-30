<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\MinecraftIdentityService;
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
        $clientSecret = config('services.discord.client_secret');

        abort_if(! $clientId || ! $clientSecret, 503, 'Discord OAuth todavía no está configurado.');

        $state = Str::random(64);
        $request->session()->put('discord_oauth_state', $state);
        $request->session()->put('discord_oauth_return_to', $this->safeReturnTo(
            $request->string('return_to')->toString()
        ));

        $query = http_build_query([
            'client_id' => $clientId,
            'redirect_uri' => config('services.discord.redirect'),
            'response_type' => 'code',
            'scope' => 'identify email',
            'state' => $state,
        ]);

        return redirect()->away('https://discord.com/oauth2/authorize?'.$query);
    }

    public function callback(Request $request, MinecraftIdentityService $minecraftIdentity): RedirectResponse
    {
        $frontend = rtrim((string) config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');
        $expectedState = (string) $request->session()->pull('discord_oauth_state', '');
        $returnTo = $this->safeReturnTo((string) $request->session()->pull('discord_oauth_return_to', '/'));
        $receivedState = $request->string('state')->toString();

        if ($request->filled('error') || ! $request->filled('code') || $expectedState === '' || ! hash_equals($expectedState, $receivedState)) {
            return redirect()->away($this->frontendRedirect($frontend, $returnTo, 'error'));
        }

        $tokenResponse = Http::asForm()->acceptJson()->timeout(10)->post('https://discord.com/api/oauth2/token', [
            'client_id' => config('services.discord.client_id'),
            'client_secret' => config('services.discord.client_secret'),
            'grant_type' => 'authorization_code',
            'code' => $request->string('code')->toString(),
            'redirect_uri' => config('services.discord.redirect'),
        ]);

        if ($tokenResponse->failed()) {
            report(new \RuntimeException('Discord rechazó el intercambio OAuth.'));

            return redirect()->away($this->frontendRedirect($frontend, $returnTo, 'error'));
        }

        $discordResponse = Http::withToken($tokenResponse->json('access_token'))->acceptJson()->timeout(10)
            ->get('https://discord.com/api/users/@me');

        if ($discordResponse->failed() || ! $discordResponse->json('id')) {
            report(new \RuntimeException('Discord no devolvió el perfil del usuario.'));

            return redirect()->away($this->frontendRedirect($frontend, $returnTo, 'error'));
        }

        $discord = $discordResponse->json();
        $displayName = ($discord['global_name'] ?? null) ?: $discord['username'];

        $user = User::query()->updateOrCreate(
            ['discord_id' => (string) $discord['id']],
            [
                'name' => $displayName,
                'email' => $discord['email'] ?? null,
                'discord_username' => $discord['username'],
                'discord_avatar' => $discord['avatar'] ?? null,
            ],
        );

        $user = $minecraftIdentity->sync($user);

        Auth::login($user, true);
        $request->session()->regenerate();

        return redirect()->away($this->frontendRedirect($frontend, $returnTo, 'success'));
    }

    private function safeReturnTo(string $returnTo): string
    {
        if ($returnTo === '' || strlen($returnTo) > 500 || ! str_starts_with($returnTo, '/') || str_starts_with($returnTo, '//')) {
            return '/';
        }

        return preg_match('/[\x00-\x1F\x7F]/', $returnTo) ? '/' : $returnTo;
    }

    private function frontendRedirect(string $frontend, string $returnTo, string $status): string
    {
        $separator = str_contains($returnTo, '?') ? '&' : '?';

        return $frontend.$returnTo.$separator.'login='.$status;
    }
}
