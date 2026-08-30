<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MatchServer;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class RankedController extends Controller
{
    public function leaderboard(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'rating_key' => ['nullable', 'string', 'max:64'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
            'search' => ['nullable', 'string', 'max:16', 'regex:/^[A-Za-z0-9_]+$/'],
        ]);

        try {
            $ratingKey = $validated['rating_key'] ?? config('ranked.primary_rating_key');
            $connection = DB::connection('minecraft_stats');
            $rankedPlayers = $connection
                ->table('ranked_player_ratings as ratings')
                ->join('ranked_players as players', 'players.minecraft_uuid', '=', 'ratings.minecraft_uuid')
                ->where('ratings.rating_key', $ratingKey)
                ->where('players.is_verified', 1)
                ->select([
                    'players.minecraft_uuid',
                    'players.minecraft_username',
                    'ratings.rating_key',
                    'ratings.elo',
                    'ratings.mmr',
                    'ratings.wins',
                    'ratings.losses',
                    'ratings.games_played',
                    'ratings.total_kills',
                    'ratings.total_deaths',
                    'ratings.is_in_placement',
                    'ratings.placement_matches_played',
                    'ratings.last_match_date',
                ])
                ->selectRaw('ROW_NUMBER() OVER (ORDER BY ratings.elo DESC, ratings.mmr DESC, players.minecraft_username ASC) AS rank_position');

            $podium = $connection->query()
                ->fromSub(clone $rankedPlayers, 'ranked')
                ->orderBy('rank_position')
                ->limit(3)
                ->get();

            $ratings = $connection->query()
                ->fromSub($rankedPlayers, 'ranked')
                ->when(
                    $validated['search'] ?? null,
                    fn ($query, string $search) => $query->where('minecraft_username', 'like', '%'.$search.'%'),
                )
                ->orderBy('rank_position')
                ->paginate($validated['per_page'] ?? 50);

            $payload = $ratings->toArray();
            $payload['podium'] = $podium;
            $payload['rating_key'] = $ratingKey;

            return response()->json($payload);
        } catch (QueryException $exception) {
            return $this->databaseUnavailable($exception, 'La base de estadísticas todavía no está configurada.');
        }
    }

    public function player(Request $request, string $identifier): JsonResponse
    {
        $ratingKey = $request->string('rating_key', config('ranked.primary_rating_key'))->toString();

        try {
            $uuid = $this->resolvePlayerUuid($identifier);

            if (! $uuid) {
                return response()->json(['message' => 'Jugador no encontrado.'], 404);
            }

            $player = DB::connection('minecraft_stats')
                ->table('ranked_players as players')
                ->leftJoin('ranked_player_ratings as ratings', function ($join) use ($ratingKey): void {
                    $join->on('ratings.minecraft_uuid', '=', 'players.minecraft_uuid')
                        ->where('ratings.rating_key', '=', $ratingKey);
                })
                ->where('players.minecraft_uuid', $uuid)
                ->select([
                    'players.minecraft_uuid', 'players.minecraft_username', 'players.is_verified',
                    'players.is_in_match', 'players.current_match_id',
                    'ratings.rating_key', 'ratings.elo', 'ratings.mmr', 'ratings.wins',
                    'ratings.losses', 'ratings.games_played', 'ratings.total_kills',
                    'ratings.total_deaths', 'ratings.is_in_placement',
                    'ratings.placement_matches_played', 'ratings.last_match_date',
                ])
                ->first();

            if (! $player) {
                return response()->json(['message' => 'Jugador no encontrado.'], 404);
            }

            $player->rank_position = $player->elo === null ? null : 1 + DB::connection('minecraft_stats')
                ->table('ranked_player_ratings')
                ->where('rating_key', $ratingKey)
                ->where('elo', '>', $player->elo)
                ->count();
            $player->last_match_date = $player->last_match_date
                ? CarbonImmutable::createFromFormat('Y-m-d H:i:s', (string) $player->last_match_date, 'UTC')->toIso8601String()
                : null;

            return response()->json(['data' => $player]);
        } catch (QueryException $exception) {
            return $this->databaseUnavailable($exception, 'La base de estadísticas todavía no está configurada.');
        }
    }

    public function servers(): JsonResponse
    {
        $servers = MatchServer::query()
            ->with(['liveMatches.participants'])
            ->orderBy('server_key')
            ->get()
            ->map(function (MatchServer $server): array {
                $isStale = ! $server->last_seen_at || $server->last_seen_at->lt(now()->subSeconds(90));

                return [
                    'server_key' => $server->server_key,
                    'name' => $server->name,
                    'status' => $isStale ? 'offline' : $server->status,
                    'player_count' => $server->player_count,
                    'players' => $isStale ? [] : ($server->online_players ?? []),
                    'last_seen_at' => $server->last_seen_at,
                    'matches' => $server->liveMatches->map(fn ($match) => [
                        'match_id' => $match->match_id,
                        'queue_key' => $match->queue_key,
                        'rating_key' => $match->rating_key,
                        'map_name' => $match->map_name,
                        'phase' => $match->phase,
                        'started_at' => $match->started_at,
                        'players' => $match->participants->where('role', 'player')->values(),
                        'observers' => $match->participants->where('role', 'observer')->values(),
                    ]),
                ];
            });

        return response()->json(['data' => $servers]);
    }

    public function matches(Request $request): JsonResponse
    {
        $perPage = min(max($request->integer('per_page', 20), 1), 100);

        try {
            $matches = DB::connection('minecraft_matches')
                ->table('matches')
                ->orderByDesc('end_time')
                ->paginate($perPage);

            $matchIds = $matches->getCollection()->pluck('match_id')->all();
            $players = DB::connection('minecraft_matches')
                ->table('match_players')
                ->whereIn('match_id', $matchIds)
                ->select(['match_id', 'player_uuid', 'player_name', 'team', 'won'])
                ->orderBy('team')
                ->orderBy('player_name')
                ->get()
                ->groupBy('match_id');
            $servers = $this->serverKeysForMatches($matches->getCollection());

            $matches->setCollection($matches->getCollection()->map(function ($match) use ($players, $servers): array {
                [$startTime, $endTime] = $this->normalizedTimes($match);
                $matchPlayers = $players->get($match->match_id, collect());
                $teams = $matchPlayers
                    ->groupBy(fn ($player) => strtolower((string) $player->team))
                    ->map(fn ($teamPlayers, string $team) => [
                        'team' => $team,
                        'won' => $teamPlayers->contains(fn ($player) => (bool) $player->won),
                        'players' => $teamPlayers->map(fn ($player) => [
                            'minecraft_uuid' => $player->player_uuid,
                            'minecraft_username' => $player->player_name,
                        ])->values(),
                    ])
                    ->values();

                return [
                    'match_id' => $match->match_id,
                    'match_type' => $match->match_type,
                    'map_name' => $match->map_name,
                    'winner_team' => strtolower((string) $match->winner_team),
                    'duration_seconds' => (int) $match->duration_seconds,
                    'start_time' => $startTime,
                    'end_time' => $endTime,
                    'server_key' => $servers->get($match->match_id),
                    'teams' => $teams,
                ];
            }));

            return response()->json($matches);
        } catch (QueryException $exception) {
            return $this->databaseUnavailable($exception, 'La base del historial todavía no está configurada.');
        }
    }

    public function match(string $matchId): JsonResponse
    {
        try {
            $match = DB::connection('minecraft_matches')->table('matches')->where('match_id', $matchId)->first();

            if (! $match) {
                return response()->json(['message' => 'Partida no encontrada.'], 404);
            }

            $players = DB::connection('minecraft_matches')
                ->table('match_players')
                ->where('match_id', $matchId)
                ->orderBy('team')
                ->orderByDesc('kills')
                ->get();

            $currentNames = collect();
            try {
                $currentNames = DB::connection('minecraft_stats')
                    ->table('ranked_players')
                    ->whereIn('minecraft_uuid', $players->pluck('player_uuid')->filter()->unique()->values())
                    ->pluck('minecraft_username', 'minecraft_uuid');
            } catch (QueryException $exception) {
                report($exception);
            }

            $serverKey = $this->serverKeysForMatches(collect([$match]))->get($matchId);
            [$startTime, $endTime] = $this->normalizedTimes($match);

            return response()->json(['data' => [
                'match_id' => $match->match_id,
                'match_type' => $match->match_type,
                'map_name' => $match->map_name,
                'winner_team' => strtolower((string) $match->winner_team),
                'duration_seconds' => (int) $match->duration_seconds,
                'start_time' => $startTime,
                'end_time' => $endTime,
                'server_key' => $serverKey,
                'players' => $players->map(fn ($player) => [
                    'minecraft_uuid' => $player->player_uuid,
                    'minecraft_username' => $currentNames->get($player->player_uuid, $player->player_name),
                    'team' => strtolower((string) $player->team),
                    'won' => (bool) $player->won,
                    'kills' => (int) $player->kills,
                    'deaths' => (int) $player->deaths,
                    'damage_dealt' => (float) $player->damage_dealt,
                    'damage_received' => (float) $player->damage_received,
                    'arrows_shot' => (int) $player->arrows_shot,
                    'arrows_hit' => (int) $player->arrows_hit,
                    'old_elo' => (int) $player->old_elo,
                    'new_elo' => (int) $player->new_elo,
                    'elo_change' => (int) $player->elo_change,
                ])->values(),
            ]]);
        } catch (QueryException $exception) {
            return $this->databaseUnavailable($exception, 'La base del historial todavía no está configurada.');
        }
    }

    public function playerMatches(Request $request, string $identifier): JsonResponse
    {
        $perPage = min(max($request->integer('per_page', 20), 1), 500);

        try {
            $uuid = $this->resolvePlayerUuid($identifier);

            if (! $uuid) {
                return response()->json(['message' => 'Jugador no encontrado.'], 404);
            }

            $matches = DB::connection('minecraft_matches')
                ->table('match_players as player')
                ->join('matches as match', 'match.match_id', '=', 'player.match_id')
                ->where('player.player_uuid', $uuid)
                ->select(['match.*', 'player.team', 'player.kills', 'player.deaths',
                    'player.damage_dealt', 'player.old_elo', 'player.new_elo',
                    'player.elo_change', 'player.won'])
                ->orderByDesc('match.end_time')
                ->paginate($perPage);

            $servers = $this->serverKeysForMatches($matches->getCollection());

            $matches->setCollection($matches->getCollection()->map(function ($match) use ($servers): array {
                [$startTime, $endTime] = $this->normalizedTimes($match);

                return [
                    'match_id' => $match->match_id,
                    'match_type' => $match->match_type,
                    'map_name' => $match->map_name,
                    'winner_team' => strtolower((string) $match->winner_team),
                    'duration_seconds' => (int) $match->duration_seconds,
                    'start_time' => $startTime,
                    'end_time' => $endTime,
                    'server_key' => $servers->get($match->match_id),
                    'team' => strtolower((string) $match->team),
                    'kills' => (int) $match->kills,
                    'deaths' => (int) $match->deaths,
                    'damage_dealt' => (float) $match->damage_dealt,
                    'old_elo' => (int) $match->old_elo,
                    'new_elo' => (int) $match->new_elo,
                    'elo_change' => (int) $match->elo_change,
                    'won' => (bool) $match->won,
                ];
            }));

            return response()->json($matches);
        } catch (QueryException $exception) {
            return $this->databaseUnavailable($exception, 'La base del historial todavía no está configurada.');
        }
    }

    private function databaseUnavailable(QueryException $exception, string $message): JsonResponse
    {
        report($exception);

        return response()->json(['message' => $message], 503);
    }

    private function resolvePlayerUuid(string $identifier): ?string
    {
        return DB::connection('minecraft_stats')
            ->table('ranked_players')
            ->where(function ($query) use ($identifier): void {
                $query->where('minecraft_uuid', $identifier)
                    ->orWhere('minecraft_username', $identifier);
            })
            ->value('minecraft_uuid');
    }

    /** @return array{0: string|null, 1: string|null} */
    private function normalizedTimes(object $match): array
    {
        if (! $match->end_time) {
            return [null, null];
        }

        $end = CarbonImmutable::createFromFormat('Y-m-d H:i:s', (string) $match->end_time, 'America/Lima')
            ->utc();
        $start = $end->subSeconds(max(0, (int) $match->duration_seconds));

        return [$start->toIso8601String(), $end->toIso8601String()];
    }

    /**
     * Resolve direct UUID assignments and preserve compatibility with the
     * earlier bridge, whose PGM match number was stored at match completion.
     *
     * @param  Collection<int, object>  $matches
     * @return Collection<string, string>
     */
    private function serverKeysForMatches(Collection $matches): Collection
    {
        if ($matches->isEmpty()) {
            return collect();
        }

        $matchIds = $matches->pluck('match_id')->filter()->values()->all();
        $resolved = DB::table('match_server_assignments')
            ->whereIn('match_id', $matchIds)
            ->pluck('server_key', 'match_id');
        $missing = $matches->reject(fn ($match) => $resolved->has($match->match_id));

        if ($missing->isEmpty()) {
            return $resolved;
        }

        $ends = $missing->filter(fn ($match) => ! empty($match->end_time))->mapWithKeys(function ($match): array {
            $end = CarbonImmutable::createFromFormat('Y-m-d H:i:s', (string) $match->end_time, 'America/Lima')->utc();

            return [$match->match_id => $end];
        });

        if ($ends->isEmpty()) {
            return $resolved;
        }

        $legacy = DB::table('match_server_assignments')
            ->where('match_id', 'not like', '%-%')
            ->whereBetween('last_seen_at', [
                $ends->min()->subMinutes(3)->format('Y-m-d H:i:s'),
                $ends->max()->addMinutes(3)->format('Y-m-d H:i:s'),
            ])
            ->get(['server_key', 'last_seen_at']);

        foreach ($ends as $matchId => $end) {
            $candidate = $legacy
                ->map(function ($assignment) use ($end) {
                    $seen = CarbonImmutable::createFromFormat('Y-m-d H:i:s', (string) $assignment->last_seen_at, 'UTC');
                    $assignment->distance = abs($seen->diffInSeconds($end, false));

                    return $assignment;
                })
                ->where('distance', '<=', 180)
                ->sortBy('distance')
                ->first();

            if ($candidate) {
                $resolved->put((string) $matchId, (string) $candidate->server_key);
            }
        }

        return $resolved;
    }
}
