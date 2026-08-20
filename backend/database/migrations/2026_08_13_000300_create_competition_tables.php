<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('match_servers', function (Blueprint $table): void {
            $table->id();
            $table->string('server_key', 32)->unique();
            $table->string('name');
            $table->string('status', 20)->default('offline')->index();
            $table->unsignedSmallInteger('player_count')->default(0);
            $table->timestamp('last_seen_at')->nullable()->index();
            $table->timestamps();
        });

        Schema::create('live_matches', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('match_server_id')->constrained()->cascadeOnDelete();
            $table->string('match_id', 50)->unique();
            $table->string('queue_key', 64);
            $table->string('rating_key', 64)->nullable();
            $table->string('map_name')->nullable();
            $table->string('phase', 24)->default('preparing')->index();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('last_snapshot_at')->index();
            $table->timestamps();
        });

        Schema::create('live_match_participants', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('live_match_id')->constrained()->cascadeOnDelete();
            $table->uuid('minecraft_uuid')->nullable();
            $table->string('minecraft_username', 16);
            $table->string('team', 24)->nullable();
            $table->string('role', 16)->default('player')->index();
            $table->timestamps();
            $table->unique(['live_match_id', 'minecraft_username']);
        });

        Schema::create('teams', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('tag', 8)->unique();
            $table->text('description')->nullable();
            $table->string('logo')->nullable();
            $table->foreignId('captain_id')->constrained('users')->cascadeOnDelete();
            $table->string('status', 20)->default('active')->index();
            $table->timestamps();
        });

        Schema::create('team_members', function (Blueprint $table): void {
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 20)->default('member');
            $table->timestamp('joined_at')->nullable();
            $table->primary(['team_id', 'user_id']);
        });

        Schema::create('tournaments', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('format', 32);
            $table->string('status', 24)->default('draft')->index();
            $table->text('description')->nullable();
            $table->timestamp('registration_starts_at')->nullable();
            $table->timestamp('registration_ends_at')->nullable();
            $table->timestamp('starts_at')->nullable();
            $table->unsignedInteger('max_teams')->nullable();
            $table->json('settings')->nullable();
            $table->timestamps();
        });

        Schema::create('tournament_team', function (Blueprint $table): void {
            $table->foreignId('tournament_id')->constrained()->cascadeOnDelete();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->string('status', 20)->default('pending');
            $table->timestamp('registered_at')->nullable();
            $table->primary(['tournament_id', 'team_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tournament_team');
        Schema::dropIfExists('tournaments');
        Schema::dropIfExists('team_members');
        Schema::dropIfExists('teams');
        Schema::dropIfExists('live_match_participants');
        Schema::dropIfExists('live_matches');
        Schema::dropIfExists('match_servers');
    }
};
