<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LiveMatch extends Model
{
    protected $fillable = [
        'match_server_id', 'match_id', 'queue_key', 'rating_key',
        'map_name', 'phase', 'started_at', 'last_snapshot_at',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'last_snapshot_at' => 'datetime',
        ];
    }

    public function server(): BelongsTo
    {
        return $this->belongsTo(MatchServer::class, 'match_server_id');
    }

    public function participants(): HasMany
    {
        return $this->hasMany(LiveMatchParticipant::class);
    }
}
