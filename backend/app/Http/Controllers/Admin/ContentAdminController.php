<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Content;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ContentAdminController extends Controller
{
    private const TYPES = ['news', 'rule_minecraft', 'rule_discord', 'event'];

    public function index(Request $request): JsonResponse
    {
        $items = Content::query()
            ->with('author:id,name,discord_username')
            ->when($request->filled('type'), fn ($query) => $query->where('type', $request->string('type')))
            ->latest()
            ->paginate(min(max($request->integer('per_page', 20), 1), 100));

        return response()->json($items);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $data['slug'] = $data['slug'] ?? Str::slug($data['title']);
        $data['author_id'] = $request->user()->id;
        $data['published_at'] = $this->publicationDate($data);

        Validator::make($data, ['slug' => ['required', 'string', 'max:255', 'unique:content,slug']])->validate();

        $content = Content::query()->create($data);

        return response()->json(['data' => $content], 201);
    }

    public function show(Content $content): JsonResponse
    {
        return response()->json(['data' => $content->load('author:id,name,discord_username')]);
    }

    public function update(Request $request, Content $content): JsonResponse
    {
        $data = $this->validated($request, $content);
        $data['slug'] = $data['slug'] ?? $content->slug;
        $data['published_at'] = $this->publicationDate($data, $content);

        Validator::make($data, [
            'slug' => ['required', 'string', 'max:255', Rule::unique('content', 'slug')->ignore($content)],
        ])->validate();

        $content->update($data);

        return response()->json(['data' => $content->fresh()]);
    }

    public function destroy(Content $content): JsonResponse
    {
        $content->delete();

        return response()->json([], 204);
    }

    private function validated(Request $request, ?Content $content = null): array
    {
        return $request->validate([
            'type' => [$content ? 'sometimes' : 'required', Rule::in(self::TYPES)],
            'slug' => ['nullable', 'string', 'max:255'],
            'title' => [$content ? 'sometimes' : 'required', 'string', 'max:255'],
            'excerpt' => ['nullable', 'string', 'max:1000'],
            'body' => [$content ? 'sometimes' : 'required', 'string'],
            'cover_image' => ['nullable', 'string', 'max:2048'],
            'status' => ['sometimes', Rule::in(['draft', 'published', 'archived'])],
            'is_pinned' => ['sometimes', 'boolean'],
            'metadata' => ['nullable', 'array'],
            'published_at' => ['nullable', 'date'],
        ]);
    }

    private function publicationDate(array $data, ?Content $content = null): mixed
    {
        if (array_key_exists('published_at', $data)) {
            return $data['published_at'];
        }

        $status = $data['status'] ?? $content?->status ?? 'draft';

        return $status === 'published' ? ($content?->published_at ?? now()) : $content?->published_at;
    }
}
