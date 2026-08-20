<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'name' => 'KEKE API',
            'status' => 'online',
            'version' => 'v1',
            'features' => [
                'discord_auth',
                'staff_permissions',
                'content',
                'ranked_stats',
                'three_match_servers',
                'teams_and_tournaments',
                'store',
            ],
        ]);
    }
}
