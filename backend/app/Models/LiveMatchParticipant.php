<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LiveMatchParticipant extends Model
{
    protected $fillable = [
        'live_match_id', 'minecraft_uuid', 'minecraft_username', 'team', 'role',
    ];

    public function match(): BelongsTo
    {
        return $this->belongsTo(LiveMatch::class, 'live_match_id');
    }
}
