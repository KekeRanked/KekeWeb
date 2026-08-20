<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LiveMatch;
use App\Models\MatchServer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

        $server = DB::transaction(function () use ($data, $serverKey): MatchServer {
            $participants = $data['match']['participants'] ?? [];
            $server = MatchServer::query()->updateOrCreate(
                ['server_key' => $serverKey],
                [
                    'name' => 'RANKED 0'.substr($serverKey, -1),
                    'status' => $data['status'],
                    'player_count' => $data['player_count'] ?? count($participants),
                    'last_seen_at' => now(),
                ],
            );

            if (! isset($data['match'])) {
                $server->liveMatches()->delete();

                return $server;
            }

            $matchData = $data['match'];
            $server->liveMatches()->where('match_id', '!=', $matchData['match_id'])->delete();

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
}
