<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TournamentRegistrationMember extends Model
{
    protected $fillable = [
        'content_id', 'user_id', 'minecraft_uuid', 'minecraft_username',
        'is_verified', 'role', 'position',
    ];

    protected function casts(): array
    {
        return ['is_verified' => 'boolean'];
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
