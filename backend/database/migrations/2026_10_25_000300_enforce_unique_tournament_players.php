<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $indexes = collect(Schema::getIndexes('tournament_registration_members'));

        if (! $this->hasUniqueColumns($indexes, ['content_id', 'minecraft_uuid'])) {
            Schema::table('tournament_registration_members', function (Blueprint $table): void {
                $table->unique(['content_id', 'minecraft_uuid']);
            });
        }

        if (! $this->hasUniqueColumns($indexes, ['content_id', 'discord_id'])) {
            Schema::table('tournament_registration_members', function (Blueprint $table): void {
                $table->unique(['content_id', 'discord_id']);
            });
        }
    }

    public function down(): void
    {
        // These constraints protect tournament integrity and may have existed
        // before this repair migration, so rolling back must not remove them.
    }

    private function hasUniqueColumns($indexes, array $columns): bool
    {
        return $indexes->contains(fn (array $index): bool => $index['unique'] && $index['columns'] === $columns);
    }
};
