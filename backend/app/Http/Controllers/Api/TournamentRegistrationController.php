<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Content;
use App\Models\Minecraft\RankedPlayer;
use App\Models\TournamentRegistration;
use App\Models\User;
use App\Services\MinecraftIdentityService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

class TournamentRegistrationController extends Controller
{
    public function show(Request $request, Content $content, MinecraftIdentityService $identity): JsonResponse
    {
        $this->ensureTournament($content);
        $user = $identity->sync($request->user());
        $registration = TournamentRegistration::query()
            ->where('content_id', $content->id)
            ->where('captain_id', $user->id)
            ->with('members')
            ->first();

        return response()->json([
            'data' => $registration,
            'meta' => $this->meta($content),
        ])->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    }

    public function searchPlayers(Request $request, Content $content): JsonResponse
    {
        $this->ensureTournament($content);
        $term = trim($request->string('q')->toString());
        if (mb_strlen($term) < 2) {
            return response()->json(['data' => []]);
        }

        try {
            $players = RankedPlayer::query()
                ->where('is_verified', 1)
                ->whereNotNull('discord_id')
                ->where('discord_id', '<>', '')
                ->where(function ($query) use ($term): void {
                    $query->where('minecraft_username', 'like', "%{$term}%")
                        ->orWhere('discord_id', 'like', "%{$term}%")
                        ->orWhere('minecraft_uuid', 'like', "%{$term}%");
                })
                ->orderBy('minecraft_username')
                ->limit(20)
                ->get(['minecraft_uuid', 'minecraft_username', 'discord_id']);
        } catch (Throwable $exception) {
            return response()->json(['message' => 'No se pudo comprobar la base de jugadores verificados.'], 503);
        }

        $usersByDiscord = User::query()
            ->whereIn('discord_id', $players->pluck('discord_id')->filter())
            ->get(['id', 'discord_id', 'discord_username'])
            ->keyBy('discord_id');

        return response()->json(['data' => $players->map(function (RankedPlayer $player) use ($usersByDiscord): array {
            $user = $usersByDiscord->get((string) $player->discord_id);

            return [
                'user_id' => $user?->id,
                'minecraft_uuid' => $player->minecraft_uuid,
                'minecraft_username' => $player->minecraft_username,
                'discord_id' => (string) $player->discord_id,
                'discord_username' => $user?->discord_username,
            ];
        })->values()]);
    }

    public function store(Request $request, Content $content, MinecraftIdentityService $identity): JsonResponse
    {
        $this->ensureTournament($content, true);
        $user = $identity->sync($request->user());
        $data = $request->validate([
            'team_name' => ['required', 'string', 'min:2', 'max:80'],
            'team_tag' => ['nullable', 'string', 'min:2', 'max:8', 'regex:/^[A-Za-z0-9_-]+$/'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'members' => ['required', 'array'],
            'members.*.minecraft_uuid' => ['required', 'uuid', 'distinct'],
        ], [
            'team_tag.regex' => 'La etiqueta solo puede contener letras, números, guion o guion bajo.',
        ]);

        $teamSize = (int) data_get($content->metadata, 'players_per_team', 0);
        if ($teamSize < 1) {
            throw ValidationException::withMessages(['members' => 'El staff todavía no definió el tamaño de los equipos.']);
        }
        if (count($data['members']) !== $teamSize - 1) {
            throw ValidationException::withMessages(['members' => "Debes completar exactamente {$teamSize} integrantes contando al capitán."]);
        }

        $captain = $this->verifiedPlayerFor($user);
        if (! $captain) {
            throw ValidationException::withMessages(['captain' => 'Tu cuenta debe tener un jugador de Minecraft verificado para inscribir un equipo.']);
        }

        $submittedUuids = collect($data['members'])
            ->pluck('minecraft_uuid')
            ->map(fn ($uuid) => strtolower((string) $uuid))
            ->values();
        try {
            $verifiedPlayers = RankedPlayer::query()
                ->where('is_verified', 1)
                ->whereNotNull('discord_id')
                ->whereIn('minecraft_uuid', $submittedUuids)
                ->get(['minecraft_uuid', 'minecraft_username', 'discord_id'])
                ->keyBy(fn (RankedPlayer $player): string => strtolower((string) $player->minecraft_uuid));
        } catch (Throwable $exception) {
            throw ValidationException::withMessages(['members' => 'No se pudo comprobar la base de jugadores verificados.']);
        }
        if ($verifiedPlayers->count() !== $submittedUuids->count()) {
            throw ValidationException::withMessages(['members' => 'Todos los integrantes deben seguir vinculados y verificados en RankedMinecraft.']);
        }

        $usersByDiscord = User::query()
            ->whereIn('discord_id', $verifiedPlayers->pluck('discord_id')->filter())
            ->get(['id', 'discord_id', 'discord_username'])
            ->keyBy('discord_id');

        $members = collect([[
            'user_id' => $user->id,
            'discord_id' => (string) $captain->discord_id,
            'discord_username' => $user->discord_username,
            'minecraft_uuid' => $captain->minecraft_uuid,
            'minecraft_username' => $captain->minecraft_username,
            'is_verified' => true,
            'role' => 'captain',
            'position' => 1,
        ]]);

        foreach ($data['members'] as $index => $submitted) {
            $verifiedPlayer = $verifiedPlayers->get(strtolower((string) $submitted['minecraft_uuid']));
            $referenced = $usersByDiscord->get((string) $verifiedPlayer->discord_id);
            $members->push([
                'user_id' => $referenced?->id,
                'discord_id' => (string) $verifiedPlayer->discord_id,
                'discord_username' => $referenced?->discord_username,
                'minecraft_uuid' => $verifiedPlayer->minecraft_uuid,
                'minecraft_username' => $verifiedPlayer->minecraft_username,
                'is_verified' => true,
                'role' => 'member',
                'position' => $index + 2,
            ]);
        }

        if ($members->pluck('minecraft_username')->map(fn ($name) => strtolower($name))->unique()->count() !== $members->count()) {
            throw ValidationException::withMessages(['members' => 'No puedes repetir integrantes dentro del mismo equipo.']);
        }

        $maxTeams = (int) data_get($content->metadata, 'team_count', 0);
        $existing = TournamentRegistration::query()
            ->where('content_id', $content->id)
            ->where('captain_id', $user->id)
            ->first();
        if (! $existing && $maxTeams > 0 && TournamentRegistration::query()->where('content_id', $content->id)->count() >= $maxTeams) {
            throw ValidationException::withMessages(['team_name' => 'El torneo ya alcanzó el máximo de equipos.']);
        }

        try {
            $registration = DB::transaction(function () use ($content, $user, $data, $members, $existing): TournamentRegistration {
                $registration = $existing ?? new TournamentRegistration();
                $registration->fill([
                    'content_id' => $content->id,
                    'captain_id' => $user->id,
                    'team_name' => trim($data['team_name']),
                    'team_tag' => filled($data['team_tag'] ?? null) ? strtoupper(trim($data['team_tag'])) : null,
                    'notes' => $data['notes'] ?? null,
                    'status' => $existing && $existing->status === 'rejected' ? 'pending' : ($existing ? $existing->status : 'pending'),
                ])->save();

                $registration->members()->delete();
                foreach ($members as $member) {
                    $registration->members()->create($member + ['content_id' => $content->id]);
                }

                return $registration->load('members');
            });
        } catch (QueryException $exception) {
            throw ValidationException::withMessages(['members' => 'El nombre del equipo o uno de sus jugadores ya está inscrito en este torneo.']);
        }

        return response()->json([
            'data' => $registration,
            'meta' => $this->meta($content),
            'message' => $existing ? 'Inscripción actualizada.' : 'Equipo inscrito correctamente.',
        ], $existing ? 200 : 201);
    }

    private function ensureTournament(Content $content, bool $requireOpen = false): void
    {
        abort_unless(
            $content->type === 'event'
            && $content->status === 'published'
            && data_get($content->metadata, 'type') === 'tournament'
            && ! data_get($content->metadata, 'is_history', false),
            404
        );

        if ($requireOpen) {
            abort_unless(data_get($content->metadata, 'registration_open', true), 422, 'Las inscripciones están cerradas.');
        }
    }

    private function verifiedPlayerFor(User $user): ?RankedPlayer
    {
        if (! $user->minecraft_uuid) {
            return null;
        }

        try {
            return RankedPlayer::query()
                ->where('minecraft_uuid', $user->minecraft_uuid)
                ->where('discord_id', $user->discord_id)
                ->where('is_verified', 1)
                ->first(['minecraft_uuid', 'minecraft_username', 'discord_id']);
        } catch (Throwable $exception) {
            throw ValidationException::withMessages(['members' => 'No se pudo comprobar la base de jugadores verificados.']);
        }
    }

    private function meta(Content $content): array
    {
        $registered = TournamentRegistration::query()->where('content_id', $content->id)->count();
        $maxTeams = (int) data_get($content->metadata, 'team_count', 0);

        return [
            'players_per_team' => (int) data_get($content->metadata, 'players_per_team', 0),
            'max_teams' => $maxTeams ?: null,
            'registered_teams' => $registered,
            'spots_left' => $maxTeams ? max(0, $maxTeams - $registered) : null,
            'registration_open' => (bool) data_get($content->metadata, 'registration_open', true),
        ];
    }
}
