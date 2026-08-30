<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LiveMatch;
use App\Models\MatchServer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

class ServerSnapshotController extends Controller
{
    public function __invoke(Request $request, string $serverKey): JsonResponse
    {
        $configuredToken = config("ranked.server_tokens.$serverKey");
        $providedToken = $request->bearerToken() ?: $request->header('X-Server-Token');

        if (! is_string($configuredToken) || $configuredToken === '') {
            return response()->json(['message' => 'El token de este servidor no está configurado.'], 503);
        }

        if (! is_string($providedToken) || ! hash_equals($configuredToken, $providedToken)) {
            return response()->json(['message' => 'Token de servidor inválido.'], 401);
        }

        $data = $request->validate([
            'status' => ['required', 'in:available,preparing,playing,ending,offline'],
            'player_count' => ['nullable', 'integer', 'between:0,200'],
            'players' => ['nullable', 'array', 'max:200'],
            'players.*.minecraft_uuid' => ['nullable', 'uuid'],
            'players.*.minecraft_username' => ['required', 'string', 'max:16'],
            'match' => ['nullable', 'array'],
            'match.match_id' => ['required_with:match', 'string', 'max:50'],
            'match.queue_key' => ['required_with:match', 'string', 'max:64'],
            'match.rating_key' => ['nullable', 'string', 'max:64'],
            'match.map_name' => ['nullable', 'string', 'max:100'],
            'match.phase' => ['required_with:match', 'in:preparing,draft,playing,ending'],
            'match.started_at' => ['nullable', 'date'],
            'match.participants' => ['nullable', 'array', 'max:100'],
            'match.participants.*.minecraft_uuid' => ['nullable', 'uuid'],
            'match.participants.*.minecraft_username' => ['required', 'string', 'max:16'],
            'match.participants.*.team' => ['nullable', 'string', 'max:24'],
            'match.participants.*.role' => ['required', 'in:player,observer'],
        ]);

        $participants = $this->uniqueParticipants($data['match']['participants'] ?? []);
        $rankedMatchId = $this->resolveRankedMatchId($participants);

        $server = DB::transaction(function () use ($data, $participants, $rankedMatchId, $serverKey): MatchServer {
            $server = MatchServer::query()->updateOrCreate(
                ['server_key' => $serverKey],
                [
                    'name' => 'RANKED 0'.substr($serverKey, -1),
                    'status' => $data['status'],
                    'player_count' => $data['player_count'] ?? count($participants),
                    'online_players' => $data['players'] ?? [],
                    'last_seen_at' => now(),
                ],
            );

            if (! isset($data['match'])) {
                $server->liveMatches()->delete();

                return $server;
            }

            $matchData = $data['match'];
            $server->liveMatches()->where('match_id', '!=', $matchData['match_id'])->delete();

            if ($rankedMatchId !== null) {
                DB::table('match_server_assignments')->insertOrIgnore([
                    'match_id' => $rankedMatchId,
                    'server_key' => $serverKey,
                    'first_seen_at' => now(),
                    'last_seen_at' => now(),
                    'updated_at' => now(),
                    'created_at' => now(),
                ]);
                DB::table('match_server_assignments')
                    ->where('match_id', $rankedMatchId)
                    ->update([
                        'server_key' => $serverKey,
                        'last_seen_at' => now(),
                        'updated_at' => now(),
                    ]);
            }

            $match = LiveMatch::query()->updateOrCreate(
                ['match_id' => $matchData['match_id']],
                [
                    'match_server_id' => $server->id,
                    'queue_key' => $matchData['queue_key'],
                    'rating_key' => $matchData['rating_key'] ?? null,
                    'map_name' => $matchData['map_name'] ?? null,
                    'phase' => $matchData['phase'],
                    'started_at' => $matchData['started_at'] ?? null,
                    'last_snapshot_at' => now(),
                ],
            );

            $match->participants()->delete();
            foreach ($participants as $participant) {
                $match->participants()->create($participant);
            }

            return $server;
        });

        return response()->json([
            'message' => 'Snapshot recibido.',
            'server' => $server->server_key,
            'received_at' => now(),
        ]);
    }

    /**
     * PGM can temporarily expose the same person through both its player and
     * observer collections. Keep a single row per username and prefer the
     * active-player representation when both roles are present.
     *
     * @param  array<int, array<string, mixed>>  $participants
     * @return array<int, array<string, mixed>>
     */
    private function uniqueParticipants(array $participants): array
    {
        $unique = [];

        foreach ($participants as $participant) {
            $key = strtolower($participant['minecraft_username']);
            $existing = $unique[$key] ?? null;

            if ($existing === null || ($existing['role'] === 'observer' && $participant['role'] === 'player')) {
                $unique[$key] = $participant;
            }
        }

        return array_values($unique);
    }

    /**
     * Resolve the ranked match UUID from the shared stats database. PGM owns
     * the live arena while ranked_players keeps the durable match identifier
     * later written to the global history database.
     *
     * @param  array<int, array<string, mixed>>  $participants
     */
    private function resolveRankedMatchId(array $participants): ?string
    {
        $uuids = collect($participants)
            ->where('role', 'player')
            ->pluck('minecraft_uuid')
            ->filter()
            ->unique()
            ->values();

        if ($uuids->isEmpty()) {
            return null;
        }

        try {
            $matchId = DB::connection('minecraft_stats')
                ->table('ranked_players')
                ->whereIn('minecraft_uuid', $uuids->all())
                ->where('is_in_match', 1)
                ->whereNotNull('current_match_id')
                ->where('current_match_id', '!=', '')
                ->select('current_match_id')
                ->selectRaw('COUNT(*) AS participant_count')
                ->groupBy('current_match_id')
                ->orderByDesc('participant_count')
                ->value('current_match_id');

            return is_string($matchId) && $matchId !== '' ? $matchId : null;
        } catch (QueryException $exception) {
            report($exception);

            return null;
        }
    }
}
