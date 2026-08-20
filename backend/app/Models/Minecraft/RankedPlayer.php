<?php

namespace App\Models\Minecraft;

use Illuminate\Database\Eloquent\Model;

class RankedPlayer extends Model
{
    protected $connection = 'minecraft_stats';
    protected $table = 'ranked_players';
    protected $guarded = [];
}
