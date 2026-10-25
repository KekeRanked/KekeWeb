<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TournamentRegistrationMember;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TournamentInvitationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $invitations = TournamentRegistrationMember::query()
            ->where('user_id', $request->user()->id)
            ->where('role', 'member')
            ->where('invitation_status', 'pending')
            ->whereHas('registration.event', fn ($query) => $query
                ->where('type', 'event')
                ->where('status', 'published'))
            ->with([
                'registration:id,content_id,captain_id,team_name,team_tag',
                'registration.event:id,slug,title',
                'registration.captain:id,name,minecraft_username',
            ])
            ->latest()
            ->get()
            ->map(fn (TournamentRegistrationMember $member): array => $this->payload($member))
            ->values();

        return response()->json(['data' => $invitations])
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    }

    public function respond(Request $request, TournamentRegistrationMember $member): JsonResponse
    {
        $data = $request->validate([
            'action' => ['required', 'string', 'in:accept,reject'],
        ]);

        $result = DB::transaction(function () use ($request, $member, $data): array {
            User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();

            $invitation = TournamentRegistrationMember::query()
                ->whereKey($member->id)
                ->lockForUpdate()
                ->firstOrFail();

            abort_unless(
                $invitation->user_id === $request->user()->id && $invitation->role === 'member',
                403
            );

            if ($invitation->invitation_status !== 'pending') {
                throw ValidationException::withMessages([
                    'invitation' => 'Esta invitación ya fue respondida.',
                ]);
            }

            if ($data['action'] === 'accept') {
                $alreadyAccepted = TournamentRegistrationMember::query()
                    ->where('content_id', $invitation->content_id)
                    ->where('user_id', $request->user()->id)
                    ->where('invitation_status', 'accepted')
                    ->where('id', '<>', $invitation->id)
                    ->exists();

                if ($alreadyAccepted) {
                    throw ValidationException::withMessages([
                        'invitation' => 'Ya perteneces a otro equipo en este torneo.',
                    ]);
                }

                $invitation->forceFill([
                    'invitation_status' => 'accepted',
                    'responded_at' => now(),
                ])->save();

                TournamentRegistrationMember::query()
                    ->where('content_id', $invitation->content_id)
                    ->where('user_id', $request->user()->id)
                    ->where('id', '<>', $invitation->id)
                    ->where('invitation_status', 'pending')
                    ->update([
                        'invitation_status' => 'rejected',
                        'responded_at' => now(),
                    ]);

                return ['message' => 'Invitación aceptada. Ya formas parte del equipo.'];
            }

            $invitation->forceFill([
                'invitation_status' => 'rejected',
                'responded_at' => now(),
            ])->save();

            return ['message' => 'Invitación rechazada.'];
        });

        return response()->json($result);
    }

    private function payload(TournamentRegistrationMember $member): array
    {
        return [
            'id' => $member->id,
            'status' => $member->invitation_status,
            'team_name' => $member->registration->team_name,
            'team_tag' => $member->registration->team_tag,
            'event' => [
                'slug' => $member->registration->event->slug,
                'title' => $member->registration->event->title,
            ],
            'captain' => [
                'name' => $member->registration->captain->minecraft_username
                    ?: $member->registration->captain->name,
            ],
            'created_at' => $member->created_at,
        ];
    }
}
