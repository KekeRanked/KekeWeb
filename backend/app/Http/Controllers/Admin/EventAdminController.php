<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Content;
use App\Models\Minecraft\RankedPlayer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

class EventAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(Content::query()
            ->where('type', 'event')
            ->with('author:id,name,discord_username')
            ->latest()
            ->paginate(min(max($request->integer('per_page', 50), 1), 100)));
    }

    public function searchVerifiedPlayers(Request $request): JsonResponse
    {
        $term = trim($request->string('q')->toString());
        if (mb_strlen($term) < 2) {
            return response()->json(['data' => []]);
        }

        try {
            $players = RankedPlayer::query()
                ->where('is_verified', 1)
                ->where(function ($query) use ($term): void {
                    $query->where('minecraft_username', 'like', "%{$term}%")
                        ->orWhere('discord_id', 'like', "%{$term}%")
                        ->orWhere('minecraft_uuid', 'like', "%{$term}%");
                })
                ->orderBy('minecraft_username')
                ->limit(20)
                ->get(['minecraft_uuid', 'minecraft_username', 'discord_id']);
        } catch (Throwable) {
            return response()->json(['data' => []]);
        }

        return response()->json(['data' => $players->map(fn ($player): array => [
            'minecraft_uuid' => $player->minecraft_uuid,
            'minecraft_username' => $player->minecraft_username,
            'discord_id' => $player->discord_id,
            'profile_url' => '/players/'.rawurlencode($player->minecraft_username),
        ])->values()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->normalizeLinkedPlayers($this->validated($request));
        $data['type'] = 'event';
        $data['slug'] = $data['slug'] ?? Str::slug($data['title']).'-'.Str::lower(Str::random(6));
        $data['author_id'] = $request->user()->id;
        $data['published_at'] = ($data['status'] ?? 'draft') === 'published' ? now() : null;

        $content = Content::query()->create($data);

        return response()->json(['data' => $content->load('author:id,name,discord_username')], 201);
    }

    public function update(Request $request, Content $content): JsonResponse
    {
        abort_unless($content->type === 'event', 404);

        $data = $this->normalizeLinkedPlayers($this->validated($request, true));
        if (($data['status'] ?? $content->status) === 'published' && ! $content->published_at) {
            $data['published_at'] = now();
        }
        $content->update($data);

        return response()->json(['data' => $content->fresh()->load('author:id,name,discord_username')]);
    }

    public function destroy(Content $content): JsonResponse
    {
        abort_unless($content->type === 'event', 404);
        $content->delete();

        return response()->json([], 204);
    }

    private function validated(Request $request, bool $partial = false): array
    {
        return $request->validate([
            'slug' => ['nullable', 'string', 'max:255'],
            'title' => [$partial ? 'sometimes' : 'required', 'string', 'max:255'],
            'excerpt' => ['nullable', 'string', 'max:1000'],
            'body' => [$partial ? 'sometimes' : 'required', 'string'],
            'cover_image' => ['nullable', 'string', 'max:2048'],
            'status' => ['sometimes', Rule::in(['draft', 'published', 'archived'])],
            'is_pinned' => ['sometimes', 'boolean'],
            'metadata' => ['nullable', 'array'],
            'metadata.type' => ['nullable', Rule::in(['draft', 'tournament'])],
            'metadata.date' => ['nullable', 'string', 'max:80'],
            'metadata.format' => ['nullable', 'string', 'max:120'],
            'metadata.slots' => ['nullable', 'string', 'max:80'],
            'metadata.prize' => ['nullable', 'string', 'max:120'],
            'metadata.is_history' => ['nullable', 'boolean'],
            'metadata.champion' => ['nullable', 'string', 'max:255'],
            'metadata.runner_up' => ['nullable', 'string', 'max:255'],
            'metadata.content_format' => ['nullable', Rule::in(['keke-markdown-v1'])],
            'metadata.queue_opens' => ['nullable', 'string', 'max:80'],
            'metadata.team_count' => ['nullable', 'integer', 'min:2', 'max:64'],
            'metadata.players_per_team' => ['nullable', 'integer', 'min:1', 'max:64'],
            'metadata.map_pool' => ['nullable', 'array', 'max:100'],
            'metadata.map_pool.*' => ['string', 'max:120'],
            'metadata.rewards' => ['nullable', 'string', 'max:3000'],
            'metadata.instructions' => ['nullable', 'string', 'max:5000'],
            'metadata.winner_team' => [Rule::requiredIf(fn (): bool => $request->boolean('metadata.is_history') && $request->string('status')->toString() === 'published'), 'nullable', 'string', 'max:255'],
            'metadata.winners' => [Rule::requiredIf(fn (): bool => $request->boolean('metadata.is_history') && $request->string('status')->toString() === 'published'), 'nullable', 'array', 'min:1', 'max:64'],
            'metadata.winners.*.minecraft_uuid' => ['required', 'uuid'],
            'metadata.winners.*.minecraft_username' => ['required', 'string', 'max:16'],
            'metadata.winners.*.discord_id' => ['nullable', 'string', 'max:20'],
            'metadata.honorable_mentions' => ['nullable', 'array', 'max:64'],
            'metadata.honorable_mentions.*.minecraft_uuid' => ['required', 'uuid'],
            'metadata.honorable_mentions.*.minecraft_username' => ['required', 'string', 'max:16'],
            'metadata.honorable_mentions.*.discord_id' => ['nullable', 'string', 'max:20'],
            'metadata.honorable_mention_reason' => ['nullable', 'string', 'max:500'],
            'published_at' => ['nullable', 'date'],
        ]);
    }

    private function normalizeLinkedPlayers(array $data): array
    {
        if (! isset($data['metadata'])) {
            return $data;
        }

        foreach (['winners', 'honorable_mentions'] as $key) {
            $submitted = $data['metadata'][$key] ?? [];
            if ($submitted === []) {
                $data['metadata'][$key] = [];
                continue;
            }

            try {
                $players = RankedPlayer::query()
                    ->where('is_verified', 1)
                    ->whereIn('minecraft_uuid', collect($submitted)->pluck('minecraft_uuid'))
                    ->get(['minecraft_uuid', 'minecraft_username', 'discord_id'])
                    ->keyBy('minecraft_uuid');
            } catch (Throwable) {
                throw ValidationException::withMessages([
                    "metadata.{$key}" => 'No se pudo comprobar la base de cuentas verificadas.',
                ]);
            }

            if ($players->count() !== count($submitted)) {
                throw ValidationException::withMessages([
                    "metadata.{$key}" => 'Todos los jugadores seleccionados deben tener una cuenta verificada.',
                ]);
            }

            $data['metadata'][$key] = collect($submitted)->map(function (array $selected) use ($players): array {
                $player = $players->get($selected['minecraft_uuid']);
                return [
                    'minecraft_uuid' => $player->minecraft_uuid,
                    'minecraft_username' => $player->minecraft_username,
                    'discord_id' => $player->discord_id,
                ];
            })->values()->all();
        }

        return $data;
    }
}
