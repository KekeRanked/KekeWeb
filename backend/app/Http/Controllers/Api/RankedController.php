<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MatchServer;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RankedController extends Controller
{
    public function leaderboard(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'rating_key' => ['nullable', 'string', 'max:64'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);

        try {
            $ratings = DB::connection('minecraft_stats')
                ->table('ranked_player_ratings as ratings')
                ->join('ranked_players as players', 'players.minecraft_uuid', '=', 'ratings.minecraft_uuid')
                ->where('ratings.rating_key', $validated['rating_key'] ?? config('ranked.primary_rating_key'))
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
                ->orderByDesc('ratings.elo')
                ->orderByDesc('ratings.mmr')
                ->paginate($validated['per_page'] ?? 50);

            return response()->json($ratings);
        } catch (QueryException $exception) {
            return $this->databaseUnavailable($exception, 'La base de estadísticas todavía no está configurada.');
        }
    }

    public function player(Request $request, string $uuid): JsonResponse
    {
        $ratingKey = $request->string('rating_key', config('ranked.primary_rating_key'))->toString();

        try {
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

            return $player
                ? response()->json(['data' => $player])
                : response()->json(['message' => 'Jugador no encontrado.'], 404);
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

            return response()->json(['data' => ['match' => $match, 'players' => $players]]);
        } catch (QueryException $exception) {
            return $this->databaseUnavailable($exception, 'La base del historial todavía no está configurada.');
        }
    }

    public function playerMatches(Request $request, string $uuid): JsonResponse
    {
        $perPage = min(max($request->integer('per_page', 20), 1), 100);

        try {
            $matches = DB::connection('minecraft_matches')
                ->table('match_players as player')
                ->join('matches as match', 'match.match_id', '=', 'player.match_id')
                ->where('player.player_uuid', $uuid)
                ->select(['match.*', 'player.team', 'player.kills', 'player.deaths',
                    'player.damage_dealt', 'player.old_elo', 'player.new_elo',
                    'player.elo_change', 'player.won'])
                ->orderByDesc('match.end_time')
                ->paginate($perPage);

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
}
