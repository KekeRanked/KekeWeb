<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TournamentRegistration extends Model
{
    protected $fillable = [
        'content_id', 'captain_id', 'team_name', 'team_tag', 'status', 'notes',
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Content::class, 'content_id');
    }

    public function captain(): BelongsTo
    {
        return $this->belongsTo(User::class, 'captain_id');
    }

    public function members(): HasMany
    {
        return $this->hasMany(TournamentRegistrationMember::class, 'registration_id')->orderBy('position');
    }
}
