<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_members', function (Blueprint $table): void {
            $table->id();
            $table->uuid('minecraft_uuid')->unique();
            $table->string('role', 32)->index();
            $table->boolean('is_sponsor')->default(false);
            $table->unsignedSmallInteger('display_order')->default(0)->index();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });

        $now = now();
        DB::table('staff_members')->insert([
            ['minecraft_uuid' => '425ea9a7-82a8-40f6-a1dc-1e4d91546fae', 'role' => 'owner', 'is_sponsor' => false, 'display_order' => 10, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['minecraft_uuid' => 'bb979ba8-472a-44b3-b498-7cd7aebfeef0', 'role' => 'manager', 'is_sponsor' => true, 'display_order' => 20, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['minecraft_uuid' => '9ae59653-9ad1-4341-8251-c84045f8fb03', 'role' => 'manager', 'is_sponsor' => true, 'display_order' => 30, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['minecraft_uuid' => '1d6905df-ca93-45b5-ab57-ffb2c3d447b0', 'role' => 'manager', 'is_sponsor' => true, 'display_order' => 40, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['minecraft_uuid' => '2b7008e5-ee72-47f3-8d96-cf7d53314c1e', 'role' => 'manager', 'is_sponsor' => false, 'display_order' => 50, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['minecraft_uuid' => '7b492490-5461-43dd-a052-05411fe77153', 'role' => 'administrator', 'is_sponsor' => true, 'display_order' => 60, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['minecraft_uuid' => '3ee4e3f3-9f5a-45fa-bfb1-962f7dd9799e', 'role' => 'administrator', 'is_sponsor' => false, 'display_order' => 70, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['minecraft_uuid' => '795d527c-1330-4e3e-94ec-719b63b6a8c6', 'role' => 'screensharer', 'is_sponsor' => false, 'display_order' => 80, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['minecraft_uuid' => '417cbc81-f833-44cd-8e1d-edfcd5bd41bf', 'role' => 'sponsor', 'is_sponsor' => true, 'display_order' => 90, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['minecraft_uuid' => '1ec066a6-7aec-4347-ae40-7d4f39b0b4bd', 'role' => 'sponsor', 'is_sponsor' => true, 'display_order' => 100, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['minecraft_uuid' => '0a2b2526-fe6d-4250-8a70-5a2be619be2a', 'role' => 'sponsor', 'is_sponsor' => true, 'display_order' => 110, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_members');
    }
};
