<?php

namespace Database\Seeders;

use App\Models\MatchServer;
use Illuminate\Database\Seeder;

class MatchServerSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([1, 2, 3] as $number) {
            MatchServer::query()->updateOrCreate(
                ['server_key' => 'ranked-'.$number],
                ['name' => 'RANKED 0'.$number, 'status' => 'offline'],
            );
        }
    }
}
