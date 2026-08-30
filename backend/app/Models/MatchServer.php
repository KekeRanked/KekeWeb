<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MatchServer extends Model
{
    protected $fillable = ['server_key', 'name', 'status', 'player_count', 'online_players', 'last_seen_at'];

    protected function casts(): array
    {
        return [
            'online_players' => 'array',
            'last_seen_at' => 'datetime',
        ];
    }

    public function liveMatches(): HasMany
    {
        return $this->hasMany(LiveMatch::class);
    }
}
