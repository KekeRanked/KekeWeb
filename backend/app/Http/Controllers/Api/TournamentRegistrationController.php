<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Content;
use App\Models\Minecraft\RankedPlayer;
use App\Models\TournamentRegistration;
use App\Models\TournamentRegistrationMember;
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

        $users = DB::transaction(function () use ($players) {
            return $players->map(function (RankedPlayer $player): User {
                $discordId = (string) $player->discord_id;
                $uuid = $this->normalizeMinecraftUuid((string) $player->minecraft_uuid);

                User::query()
                    ->where('minecraft_uuid', $uuid)
                    ->where(function ($query) use ($discordId): void {
                        $query->whereNull('discord_id')->orWhere('discord_id', '<>', $discordId);
                    })
                    ->update(['minecraft_uuid' => null, 'minecraft_username' => null]);

                $user = User::query()->firstOrNew(['discord_id' => $discordId]);
                if (! $user->exists) {
                    $user->name = $player->minecraft_username;
                }
                $user->forceFill([
                    'minecraft_uuid' => $uuid,
                    'minecraft_username' => $player->minecraft_username,
                ])->save();

                return $user;
            });
        });

        $discordUsernames = User::query()
            ->whereIn('id', $users->pluck('id'))
            ->whereNotNull('discord_id')
            ->pluck('discord_username', 'id');

        return response()->json(['data' => $users->map(function (User $user) use ($discordUsernames): array {
            return [
                'user_id' => $user->id,
                'minecraft_uuid' => $user->minecraft_uuid,
                'minecraft_username' => $user->minecraft_username,
                'discord_id' => (string) $user->discord_id,
                'discord_username' => $discordUsernames->get($user->id),
            ];
        })->values()]);
    }

    public function store(Request $request, Content $content, MinecraftIdentityService $identity): JsonResponse
    {
        $this->ensureTournament($content, true);
        $user = $identity->sync($request->user());
        $teamSize = (int) data_get($content->metadata, 'players_per_team', 0);
        $minimumTeamSize = 6;
        if ($teamSize < $minimumTeamSize) {
            throw ValidationException::withMessages(['members' => "El staff debe permitir al menos {$minimumTeamSize} jugadores por equipo."]);
        }

        $data = $request->validate([
            'team_name' => ['required', 'string', 'min:2', 'max:80'],
            'team_tag' => ['nullable', 'string', 'min:2', 'max:8', 'regex:/^[A-Za-z0-9_-]+$/'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'members' => ['required', 'array', 'min:'.($minimumTeamSize - 1), 'max:'.($teamSize - 1)],
            'members.*.user_id' => ['required', 'integer', 'distinct', 'exists:users,id'],
            'members.*.minecraft_uuid' => ['required', 'uuid', 'distinct'],
            'members.*.minecraft_username' => ['required', 'string', 'min:2', 'max:16', 'regex:/^[A-Za-z0-9_]+$/'],
        ], [
            'team_tag.regex' => 'La etiqueta solo puede contener letras, números, guion o guion bajo.',
            'members.min' => "Debes registrar al menos {$minimumTeamSize} jugadores contando al capitán.",
            'members.max' => "Puedes registrar como máximo {$teamSize} jugadores contando al capitán.",
            'members.*.minecraft_username.regex' => 'Cada nick de Minecraft solo puede contener letras, números y guion bajo.',
        ]);

        $captain = $this->verifiedPlayerFor($user);
        if (! $captain) {
            throw ValidationException::withMessages(['captain' => 'Tu cuenta debe tener un jugador de Minecraft verificado para inscribir un equipo.']);
        }

        $registeredUsers = User::query()
            ->whereIn('id', collect($data['members'])->pluck('user_id'))
            ->get(['id', 'discord_id', 'discord_username', 'minecraft_uuid', 'minecraft_username'])
            ->keyBy('id');

        $members = collect([[
            'user_id' => $user->id,
            'discord_id' => (string) $captain->discord_id,
            'discord_username' => $user->discord_username,
            'minecraft_uuid' => $this->normalizeMinecraftUuid($captain->minecraft_uuid),
            'minecraft_username' => $captain->minecraft_username,
            'is_verified' => true,
            'role' => 'captain',
            'invitation_status' => 'accepted',
            'responded_at' => now(),
            'position' => 1,
        ]]);

        foreach ($data['members'] as $index => $submitted) {
            $registeredUser = $registeredUsers->get((int) $submitted['user_id']);
            $submittedUuid = $this->normalizeMinecraftUuid((string) $submitted['minecraft_uuid']);
            if (! $registeredUser
                || ! $registeredUser->minecraft_uuid
                || ! $registeredUser->discord_id
                || $this->normalizeMinecraftUuid($registeredUser->minecraft_uuid) !== $submittedUuid) {
                throw ValidationException::withMessages([
                    "members.{$index}.user_id" => 'Selecciona un usuario registrado desde los resultados de búsqueda.',
                ]);
            }

            $members->push([
                'user_id' => $registeredUser->id,
                'discord_id' => (string) $registeredUser->discord_id,
                'discord_username' => $registeredUser->discord_username,
                'minecraft_uuid' => $submittedUuid,
                'minecraft_username' => $registeredUser->minecraft_username,
                'is_verified' => true,
                'role' => 'member',
                'invitation_status' => 'pending',
                'responded_at' => null,
                'position' => $index + 2,
            ]);
        }

        if ($members->pluck('minecraft_uuid')->map(fn ($uuid) => strtolower((string) $uuid))->unique()->count() !== $members->count()) {
            throw ValidationException::withMessages(['members' => 'No puedes repetir integrantes dentro del mismo equipo.']);
        }

        $existing = TournamentRegistration::query()
            ->where('content_id', $content->id)
            ->where('captain_id', $user->id)
            ->first();
        $wasExisting = (bool) $existing;

        try {
            $registration = DB::transaction(function () use ($content, $user, $data, $members): TournamentRegistration {
                Content::query()->whereKey($content->id)->lockForUpdate()->firstOrFail();
                $existing = TournamentRegistration::query()
                    ->where('content_id', $content->id)
                    ->where('captain_id', $user->id)
                    ->with('members:id,registration_id,user_id,invitation_status,responded_at')
                    ->first();
                $maxTeams = (int) data_get($content->metadata, 'team_count', 0);
                if (! $existing && $maxTeams > 0 && TournamentRegistration::query()->where('content_id', $content->id)->count() >= $maxTeams) {
                    throw ValidationException::withMessages(['team_name' => 'El torneo ya alcanzó el máximo de equipos.']);
                }

                $previousMembers = $existing
                    ? $existing->members->keyBy('user_id')
                    : collect();
                $membersToSave = $members->map(function (array $member) use ($previousMembers): array {
                    if ($member['role'] === 'captain') {
                        return $member;
                    }

                    $previous = $previousMembers->get($member['user_id']);
                    if ($previous) {
                        $member['invitation_status'] = $previous->invitation_status;
                        $member['responded_at'] = $previous->responded_at;
                    }

                    return $member;
                });

                $incomingUuids = $membersToSave->pluck('minecraft_uuid')
                    ->filter()
                    ->map(fn ($uuid): string => $this->normalizeMinecraftUuid((string) $uuid))
                    ->flip();
                $occupiedMember = TournamentRegistrationMember::query()
                    ->where('content_id', $content->id)
                    ->where('invitation_status', 'accepted')
                    ->when($existing, fn ($query) => $query->where('registration_id', '<>', $existing->id))
                    ->with('registration:id,team_name')
                    ->get(['id', 'registration_id', 'minecraft_uuid', 'minecraft_username'])
                    ->first(fn (TournamentRegistrationMember $member): bool => $member->minecraft_uuid
                        && $incomingUuids->has($this->normalizeMinecraftUuid($member->minecraft_uuid)));
                if ($occupiedMember) {
                    $teamName = $occupiedMember->registration
                        ? $occupiedMember->registration->team_name
                        : 'otro equipo';
                    throw ValidationException::withMessages([
                        'members' => "{$occupiedMember->minecraft_username} ya está inscrito en {$teamName}. Un jugador sólo puede pertenecer a un equipo por torneo.",
                    ]);
                }

                $registration = $existing ?? new TournamentRegistration();
                $registration->fill([
                    'content_id' => $content->id,
                    'captain_id' => $user->id,
                    'team_name' => trim($data['team_name']),
                    'team_tag' => filled($data['team_tag'] ?? null) ? strtoupper(trim($data['team_tag'])) : null,
                    'notes' => $data['notes'] ?? null,
                    'status' => $existing && $existing->status === 'rejected' ? 'pending' : ($existing ? $existing->status : 'pending'),
                ])->save();

                $memberUserIds = $membersToSave->pluck('user_id')->filter()->values();
                $registration->members()->whereNotIn('user_id', $memberUserIds)->delete();
                $registration->members()->whereIn('user_id', $memberUserIds)->update([
                    'position' => DB::raw('position + 1000'),
                ]);
                foreach ($membersToSave as $member) {
                    $storedMember = $existing
                        ? $existing->members->firstWhere('user_id', $member['user_id'])
                        : null;
                    if ($storedMember) {
                        $storedMember->fill($member + ['content_id' => $content->id])->save();
                    } else {
                        $registration->members()->create($member + ['content_id' => $content->id]);
                    }
                }

                return $registration->load('members');
            });
        } catch (QueryException $exception) {
            throw ValidationException::withMessages(['members' => 'El nombre del equipo o uno de sus jugadores ya está inscrito en este torneo.']);
        }

        return response()->json([
            'data' => $registration,
            'meta' => $this->meta($content),
            'message' => $wasExisting ? 'Inscripción actualizada.' : 'Equipo inscrito correctamente.',
        ], $wasExisting ? 200 : 201);
    }

    public function destroy(Request $request, Content $content): JsonResponse
    {
        $this->ensureTournament($content, true);
        $registration = TournamentRegistration::query()
            ->where('content_id', $content->id)
            ->where('captain_id', $request->user()->id)
            ->firstOrFail();

        $teamName = $registration->team_name;
        $registration->delete();

        return response()->json([
            'message' => "El equipo {$teamName} fue retirado del torneo.",
            'meta' => $this->meta($content),
        ]);
    }

    public function adminDestroy(Content $content, TournamentRegistration $registration): JsonResponse
    {
        $this->ensureTournament($content);
        abort_unless($registration->content_id === $content->id, 404);

        $registration->delete();

        return response()->json([], 204);
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

    private function normalizeMinecraftUuid(string $uuid): string
    {
        $hex = strtolower(preg_replace('/[^0-9a-f]/i', '', $uuid) ?? '');
        if (strlen($hex) !== 32) {
            return strtolower($uuid);
        }

        return substr($hex, 0, 8).'-'.substr($hex, 8, 4).'-'.substr($hex, 12, 4).'-'.substr($hex, 16, 4).'-'.substr($hex, 20);
    }

    private function meta(Content $content): array
    {
        $registered = TournamentRegistration::query()->where('content_id', $content->id)->count();
        $maxTeams = (int) data_get($content->metadata, 'team_count', 0);

        return [
            'players_per_team' => (int) data_get($content->metadata, 'players_per_team', 0),
            'minimum_players' => 6,
            'max_teams' => $maxTeams ?: null,
            'registered_teams' => $registered,
            'spots_left' => $maxTeams ? max(0, $maxTeams - $registered) : null,
            'registration_open' => (bool) data_get($content->metadata, 'registration_open', true),
        ];
    }
}
