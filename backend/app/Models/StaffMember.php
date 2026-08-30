<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StaffMember extends Model
{
    protected $fillable = [
        'minecraft_uuid',
        'role',
        'is_sponsor',
        'display_order',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_sponsor' => 'boolean',
            'is_active' => 'boolean',
            'display_order' => 'integer',
        ];
    }
}
