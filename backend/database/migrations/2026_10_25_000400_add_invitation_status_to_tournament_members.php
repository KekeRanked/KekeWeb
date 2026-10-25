<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $indexes = collect(Schema::getIndexes('tournament_registration_members'));

        foreach ($indexes as $index) {
            if ($index['unique'] && in_array($index['columns'], [
                ['content_id', 'minecraft_uuid'],
                ['content_id', 'discord_id'],
            ], true)) {
                Schema::table('tournament_registration_members', function (Blueprint $table) use ($index): void {
                    $table->dropUnique($index['name']);
                });
            }
        }

        Schema::table('tournament_registration_members', function (Blueprint $table): void {
            $table->string('invitation_status', 20)->default('pending')->after('role');
            $table->timestamp('responded_at')->nullable()->after('invitation_status');
            $table->index(['user_id', 'invitation_status']);
            $table->index(['content_id', 'invitation_status']);
        });

        // Existing rosters predate invitations and must remain valid.
        DB::table('tournament_registration_members')->update([
            'invitation_status' => 'accepted',
            'responded_at' => DB::raw('updated_at'),
        ]);
    }

    public function down(): void
    {
        Schema::table('tournament_registration_members', function (Blueprint $table): void {
            $table->dropIndex(['user_id', 'invitation_status']);
            $table->dropIndex(['content_id', 'invitation_status']);
            $table->dropColumn(['invitation_status', 'responded_at']);
            $table->unique(['content_id', 'minecraft_uuid']);
            $table->unique(['content_id', 'discord_id']);
        });
    }
};
