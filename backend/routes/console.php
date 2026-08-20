<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use App\Models\Role;
use App\Models\User;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('staff:grant {discord_id} {role=owner}', function (string $discordId, string $roleKey) {
    $user = User::query()->where('discord_id', $discordId)->first();
    $role = Role::query()->where('key', $roleKey)->first();

    if (! $user) {
        $this->error('Ese usuario debe iniciar sesión con Discord al menos una vez.');

        return 1;
    }

    if (! $role) {
        $this->error('El rol indicado no existe.');

        return 1;
    }

    $user->roles()->syncWithoutDetaching([$role->id]);
    $this->info("Rol {$role->key} concedido a {$user->name}.");

    return 0;
})->purpose('Concede un rol de staff a un usuario de Discord ya registrado');
