<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Content;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicContentController extends Controller
{
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
