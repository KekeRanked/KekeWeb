<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void { Schema::table('roles', function (Blueprint $table): void { $table->unsignedSmallInteger('priority')->default(10)->after('name'); }); }
    public function down(): void { Schema::table('roles', fn (Blueprint $table) => $table->dropColumn('priority')); }
};
