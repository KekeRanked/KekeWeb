"use client";
/* eslint-disable @next/next/no-img-element -- Minecraft avatar service uses dynamic UUID paths. */

import { useEffect, useState } from "react";

type TeamMember = {
  id: number;
  minecraft_uuid: string | null;
  minecraft_username: string;
  is_verified: boolean;
  role: "captain" | "member";
  position: number;
};

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

export function TournamentTeams({ slug }: { slug: string }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [maxTeams, setMaxTeams] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
          <div className="tournament-team-title"><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{team.team_name}</h3><small>{team.team_tag ? `[${team.team_tag}] · ` : ""}{team.status === "approved" ? "CONFIRMADO" : "REGISTRO RECIBIDO"}</small></div></div>
          <div className="tournament-team-roster">{team.members.map((member) => <div key={member.id}>{member.minecraft_uuid ? <img src={`https://mc-heads.net/avatar/${member.minecraft_uuid}/36.png`} alt="" width={36} height={36} /> : <i aria-hidden="true">?</i>}<span><strong>{member.minecraft_username}</strong><small>{member.role === "captain" ? "CAPITÁN" : "JUGADOR"}</small></span></div>)}</div>
        </article>)}
      </div>}
    </section>
  );
}
