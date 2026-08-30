<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('match_servers', function (Blueprint $table): void {
            $table->json('online_players')->nullable()->after('player_count');
        });
    }

    public function down(): void
    {
        Schema::table('match_servers', function (Blueprint $table): void {
            $table->dropColumn('online_players');
        });
    }
};
