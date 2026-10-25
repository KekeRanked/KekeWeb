<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TournamentRegistrationMember extends Model
{
    protected $fillable = [
        'content_id', 'user_id', 'discord_id', 'discord_username', 'minecraft_uuid', 'minecraft_username',
        'is_verified', 'role', 'invitation_status', 'responded_at', 'position',
    ];

    protected function casts(): array
    {
        return [
            'is_verified' => 'boolean',
            'responded_at' => 'datetime',
        ];
    }

    public function registration(): BelongsTo
    {
        return $this->belongsTo(TournamentRegistration::class, 'registration_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
