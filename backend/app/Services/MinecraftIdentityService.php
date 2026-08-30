<?php

namespace App\Services;

use App\Models\Minecraft\RankedPlayer;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class MinecraftIdentityService
{
    public function __construct(
        private readonly StaffAuthorizationService $staffAuthorization,
    ) {}

    public function sync(User $user): User
    {
        if (! $user->discord_id || ! $this->connectionIsConfigured()) {
            return $user;
        }

        try {
            $player = RankedPlayer::query()
                ->where('discord_id', $user->discord_id)
                ->where('is_verified', 1)
                ->first(['minecraft_uuid', 'minecraft_username']);

            $syncedUser = DB::transaction(function () use ($user, $player): User {
                if ($player) {
                    User::query()
                        ->where('minecraft_uuid', $player->minecraft_uuid)
                        ->where('id', '<>', $user->id)
                        ->update([
                            'minecraft_uuid' => null,
                            'minecraft_username' => null,
                        ]);
                }

                $user->forceFill([
                    'minecraft_uuid' => $player?->minecraft_uuid,
                    'minecraft_username' => $player?->minecraft_username,
                ])->save();

                return $user->refresh();
            });

            return $this->staffAuthorization->sync($syncedUser);
        } catch (Throwable $exception) {
            Log::warning('No fue posible sincronizar la identidad de Minecraft verificada.', [
                'exception' => $exception::class,
            ]);

            return $user;
        }
    }

    private function connectionIsConfigured(): bool
    {
        $connection = config('database.connections.minecraft_stats', []);

        return filled($connection['host'] ?? null)
            && filled($connection['database'] ?? null)
            && filled($connection['username'] ?? null);
    }
}
