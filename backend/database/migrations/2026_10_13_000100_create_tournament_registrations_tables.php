<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tournament_registrations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('content_id')->constrained('content')->cascadeOnDelete();
            $table->foreignId('captain_id')->constrained('users')->cascadeOnDelete();
            $table->string('team_name', 80);
            $table->string('team_tag', 8)->nullable();
            $table->string('status', 20)->default('pending')->index();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['content_id', 'captain_id']);
            $table->unique(['content_id', 'team_name']);
        });

        Schema::create('tournament_registration_members', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('registration_id')->constrained('tournament_registrations')->cascadeOnDelete();
            $table->foreignId('content_id')->constrained('content')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->uuid('minecraft_uuid')->nullable();
            $table->string('minecraft_username', 16);
            $table->boolean('is_verified')->default(false);
            $table->string('role', 20)->default('member');
            $table->unsignedSmallInteger('position');
            $table->timestamps();

            $table->unique(['registration_id', 'position']);
            $table->unique(['registration_id', 'minecraft_username']);
            $table->unique(['content_id', 'minecraft_uuid']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tournament_registration_members');
        Schema::dropIfExists('tournament_registrations');
    }
};
