<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Content;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

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

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
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

        $data = $this->validated($request, true);
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
            'published_at' => ['nullable', 'date'],
        ]);
    }
}
