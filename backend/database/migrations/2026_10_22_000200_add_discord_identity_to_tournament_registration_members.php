<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tournament_registration_members', function (Blueprint $table): void {
            $table->string('discord_id', 20)->nullable()->after('user_id');
            $table->string('discord_username')->nullable()->after('discord_id');
            $table->index(['content_id', 'discord_id']);
        });
    }

    public function down(): void
    {
        Schema::table('tournament_registration_members', function (Blueprint $table): void {
            $table->dropIndex(['content_id', 'discord_id']);
            $table->dropColumn(['discord_id', 'discord_username']);
        });
    }
};
