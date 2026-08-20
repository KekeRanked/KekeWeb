<?php

namespace App\Models\Minecraft;

use Illuminate\Database\Eloquent\Model;

class MinecraftMatch extends Model
{
    protected $connection = 'minecraft_matches';
    protected $table = 'matches';
    protected $guarded = [];
    public $timestamps = false;
}
