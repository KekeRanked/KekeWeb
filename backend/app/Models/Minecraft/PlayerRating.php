<?php

namespace App\Models\Minecraft;

use Illuminate\Database\Eloquent\Model;

class PlayerRating extends Model
{
    protected $connection = 'minecraft_stats';
    protected $table = 'ranked_player_ratings';
    protected $guarded = [];
}
