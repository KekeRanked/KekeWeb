<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Content;
use App\Models\TournamentRegistration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PublicContentController extends Controller
{
    public function eventBanner(string $filename): StreamedResponse
    {
        $path = 'event-banners/'.$filename;
        abort_unless(Storage::disk('public')->exists($path), 404);

        return Storage::disk('public')->response($path, null, [
            'Cache-Control' => 'public, max-age=31536000, immutable',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function news(Request $request): JsonResponse
    {
        return $this->listing($request, ['news']);
    }

    public function rules(Request $request): JsonResponse
    {
        $scope = $request->string('scope')->toString();
        $types = match ($scope) {
            'minecraft' => ['rule_minecraft'],
            'discord' => ['rule_discord'],
            default => ['rule_minecraft', 'rule_discord'],
        };

        return $this->listing($request, $types);
    }

    public function events(Request $request): JsonResponse
    {
        $perPage = min(max($request->integer('per_page', 12), 1), 50);
        $history = $request->boolean('history');

        $items = Content::query()
            ->published()
            ->where('type', 'event')
            ->where(function ($query) use ($history): void {
                if ($history) {
                    $query->where('metadata->is_history', true);
                    return;
                }

                $query->where('metadata->is_history', false)
                    ->orWhereNull('metadata->is_history');
            })
            ->with('author:id,name,discord_username,discord_avatar')
            ->orderByDesc('is_pinned')
            ->orderByDesc('published_at')
            ->paginate($perPage);

        return response()->json($items);
    }

    public function event(Content $content): JsonResponse
    {
        abort_unless(
            $content->type === 'event'
            && $content->status === 'published'
            && (! $content->published_at || $content->published_at->isPast()),
            404
        );

        return response()->json([
            'data' => $content->load('author:id,name,discord_username,discord_avatar'),
        ]);
    }

    public function tournamentTeams(Content $content): JsonResponse
    {
        abort_unless(
            $content->type === 'event'
            && $content->status === 'published'
            && data_get($content->metadata, 'type') === 'tournament'
            && ! data_get($content->metadata, 'is_history', false),
            404
        );

        $teams = TournamentRegistration::query()
            ->where('content_id', $content->id)
            ->whereIn('status', ['pending', 'approved'])
            ->with([
                'members:id,registration_id,user_id,discord_id,discord_username,minecraft_uuid,minecraft_username,is_verified,role,invitation_status,position',
            ])
            ->oldest()
            ->get(['id', 'team_name', 'team_tag', 'status', 'created_at']);

        return response()->json([
            'data' => $teams,
            'meta' => [
                'registered_teams' => $teams->count(),
                'max_teams' => data_get($content->metadata, 'team_count'),
            ],
        ])->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    }

    private function listing(Request $request, array $types): JsonResponse
    {
        $perPage = min(max($request->integer('per_page', 12), 1), 50);

        $items = Content::query()
            ->published()
            ->whereIn('type', $types)
            ->with('author:id,name,discord_username,discord_avatar')
            ->orderByDesc('is_pinned')
            ->orderByDesc('published_at')
            ->paginate($perPage);

        return response()->json($items);
    }
}
