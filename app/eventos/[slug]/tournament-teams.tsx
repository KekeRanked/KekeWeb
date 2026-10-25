"use client";
/* eslint-disable @next/next/no-img-element -- Minecraft avatar service uses dynamic UUID paths. */

import { useEffect, useState } from "react";

type TeamMember = {
  id: number;
  minecraft_uuid: string | null;
  minecraft_username: string;
  discord_id: string | null;
  discord_username: string | null;
  is_verified: boolean;
  role: "captain" | "member";
  invitation_status: "pending" | "accepted" | "rejected";
  position: number;
};

function headUrl(uuid: string, size: number) {
  return `https://mc-heads.net/avatar/${uuid.replaceAll("-", "")}/${size}.png`;
}

type Team = {
  id: number;
  team_name: string;
  team_tag: string | null;
  status: "pending" | "approved";
  members: TeamMember[];
};

type TeamsPayload = {
  data?: Team[];
  meta?: { registered_teams?: number; max_teams?: number | null };
};

type SessionUser = { permissions?: string[] };

async function csrf() {
  const response = await fetch("/auth/csrf", { credentials: "include", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("La sesión expiró. Vuelve a iniciar sesión.");
  return (await response.json()).token as string;
}

export function TournamentTeams({ slug }: { slug: string }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [maxTeams, setMaxTeams] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [canManage, setCanManage] = useState(false);
  const [deletingTeamId, setDeletingTeamId] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/events/${encodeURIComponent(slug)}/teams`, { cache: "no-store", headers: { Accept: "application/json" } })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({})) as TeamsPayload;
        if (!response.ok) throw new Error("No se pudieron cargar los equipos.");
        setTeams(payload.data ?? []);
        setMaxTeams(payload.meta?.max_teams ?? null);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "No se pudieron cargar los equipos."))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    fetch("/auth/me", { credentials: "include", cache: "no-store", headers: { Accept: "application/json" } })
      .then(async (response) => response.ok ? (await response.json()).data as SessionUser : null)
      .then((sessionUser) => setCanManage(Boolean(sessionUser?.permissions?.includes("events.manage"))))
      .catch(() => setCanManage(false));
  }, []);

  async function deleteTeam(team: Team) {
    if (!window.confirm(`¿Eliminar definitivamente “${team.team_name}” del torneo? Se borrará toda su alineación y el cupo quedará libre.`)) return;
    setDeletingTeamId(team.id);
    setError("");
    try {
      const token = await csrf();
      const response = await fetch(`/api/admin/events/${encodeURIComponent(slug)}/registrations/${team.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json", "X-CSRF-TOKEN": token },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload.message === "string" ? payload.message : "No se pudo borrar el equipo.");
      }
      setTeams((current) => current.filter((registeredTeam) => registeredTeam.id !== team.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo borrar el equipo.");
    } finally {
      setDeletingTeamId(null);
    }
  }

  if (loading) return <p className="history-empty">CARGANDO EQUIPOS…</p>;
  if (error) return <p className="api-notice" role="alert">{error}</p>;

  return (
    <section className="tournament-teams-panel">
      <header>
        <div><p className="eyebrow"><span>EQUIPOS</span> PARTICIPANTES</p><h2>TEAMS REGISTRADOS</h2></div>
        <strong>{teams.length}{maxTeams ? ` / ${maxTeams}` : ""}<small> EQUIPOS</small></strong>
      </header>
      {!teams.length ? <div className="tournament-empty-state"><span>00</span><div><strong>TODAVÍA NO HAY EQUIPOS</strong><p>Los equipos aparecerán aquí cuando un capitán complete el registro.</p></div></div> : <div className="tournament-team-list">
        {teams.map((team, index) => <article key={team.id} className="tournament-team-card">
          <div className="tournament-team-title"><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{team.team_name}</h3><small>{team.team_tag ? `[${team.team_tag}] · ` : ""}{team.status === "approved" ? "CONFIRMADO" : "REGISTRO RECIBIDO"}</small></div>{canManage && <button type="button" disabled={deletingTeamId === team.id} onClick={() => deleteTeam(team)}>{deletingTeamId === team.id ? "BORRANDO…" : "ELIMINAR EQUIPO"}</button>}</div>
          <div className="tournament-team-roster">{team.members.map((member) => {
            const status = member.role === "captain" ? "accepted" : member.invitation_status;
            const statusLabel = member.role === "captain" ? "CAPITÁN · ACEPTÓ" : status === "accepted" ? "JUGADOR · ACEPTÓ" : status === "rejected" ? "INVITACIÓN RECHAZADA" : "INVITACIÓN PENDIENTE";

            return <div key={member.id} className={`is-${status}`} aria-label={`${member.minecraft_username}: ${statusLabel.toLowerCase()}`}>
              {member.minecraft_uuid ? <img src={headUrl(member.minecraft_uuid, 36)} alt={`Cabeza de ${member.minecraft_username}`} width={36} height={36} /> : <i aria-hidden="true">?</i>}
              <span><strong>{member.minecraft_username}</strong><small><b aria-hidden="true" />{statusLabel}{member.discord_username ? ` · @${member.discord_username}` : ""}</small></span>
            </div>;
          })}</div>
        </article>)}
      </div>}
    </section>
  );
}
