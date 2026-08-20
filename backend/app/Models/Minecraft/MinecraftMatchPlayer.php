<?php

namespace App\Models\Minecraft;

use Illuminate\Database\Eloquent\Model;

class MinecraftMatchPlayer extends Model
{
    protected $connection = 'minecraft_matches';
    protected $table = 'match_players';
    protected $guarded = [];
    public $timestamps = false;
}
