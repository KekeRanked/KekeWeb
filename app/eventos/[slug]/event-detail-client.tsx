"use client";
/* eslint-disable @next/next/no-img-element -- Minecraft avatar service uses dynamic UUID paths. */

import Link from "next/link";
import { useEffect, useState } from "react";
import { RichText, RichTextInline } from "../../components/rich-text";
import { SiteFooter, SiteHeader } from "../../components/site-chrome";
import { TournamentRegistrationForm } from "./tournament-registration-form";
import { TournamentTeams } from "./tournament-teams";

type LinkedPlayer = { minecraft_uuid: string; minecraft_username: string; discord_id?: string | null };

type EventMetadata = {
  type?: string; date?: string; format?: string; slots?: string; prize?: string; is_history?: boolean;
  champion?: string; winner_team?: string; winning_captain?: LinkedPlayer; runner_up?: string;
  queue_opens?: string; registration_deadline?: string; check_in_time?: string; bracket_type?: string;
  team_count?: number; players_per_team?: number; registration_open?: boolean; map_pool?: string[];
  rewards?: string; instructions?: string; winners?: LinkedPlayer[]; honorable_mentions?: LinkedPlayer[];
  honorable_mention_reason?: string;
};

type EventDetail = {
  title: string; excerpt: string | null; body: string; cover_image: string | null; published_at: string | null;
  author?: { name?: string }; metadata: EventMetadata | null;
};

function bracketName(value?: string) {
  if (value === "single_elimination") return "Eliminación simple";
  if (value === "double_elimination") return "Eliminación doble";
  if (value === "round_robin") return "Todos contra todos";
  if (value === "groups_playoffs") return "Grupos + playoffs";
  return null;
}

function PlayerRoster({ players }: { players: LinkedPlayer[] }) {
  return <div className="event-player-roster">{players.map((player) => <Link href={`/players/${encodeURIComponent(player.minecraft_username)}`} className="event-linked-player" key={player.minecraft_uuid}><img src={`https://mc-heads.net/avatar/${player.minecraft_uuid}/52.png`} alt="" width={52} height={52} /><span><strong>{player.minecraft_username}</strong><small>CUENTA VERIFICADA</small></span><b>VER PERFIL →</b></Link>)}</div>;
}

function EventFacts({ metadata }: { metadata: EventMetadata }) {
  return <div className="event-publication-facts">
    <div><small>FECHA</small><strong>{metadata.date ?? "Por definir"}</strong></div>
    <div><small>FORMATO</small><strong>{metadata.format ?? "Por definir"}</strong></div>
    <div><small>{metadata.is_history ? "EQUIPO GANADOR" : metadata.type === "tournament" ? "EQUIPOS" : "CUPO"}</small><strong>{metadata.is_history ? <RichTextInline value={metadata.winner_team ?? metadata.champion ?? "No indicado"} /> : metadata.type === "tournament" ? `${metadata.team_count ?? "—"} equipos` : metadata.slots ?? "Por confirmar"}</strong></div>
    <div><small>PREMIO</small><strong>{metadata.prize ?? "Por anunciar"}</strong></div>
  </div>;
}

function AnnouncementDetails({ metadata }: { metadata: EventMetadata }) {
  if (!metadata.team_count && !metadata.players_per_team && !metadata.map_pool?.length && !metadata.rewards && !metadata.instructions) return null;
  return <section className="event-announcement-grid">
    <div className="event-announcement-block"><p className="eyebrow"><span>FORMATO</span></p><dl>
      <div><dt>{metadata.type === "tournament" ? "Máximo de equipos" : "Cantidad de equipos"}</dt><dd>{metadata.team_count ?? "—"}</dd></div>
      <div><dt>Jugadores por equipo</dt><dd>{metadata.players_per_team ?? "—"}</dd></div>
      {metadata.type === "tournament" && bracketName(metadata.bracket_type) && <div><dt>Cuadro competitivo</dt><dd>{bracketName(metadata.bracket_type)}</dd></div>}
      <div><dt>Cupo total</dt><dd>{metadata.slots ?? "—"}</dd></div>
    </dl></div>
    {metadata.map_pool?.length ? <div className="event-announcement-block"><p className="eyebrow"><span>MAP POOL</span></p><ul>{metadata.map_pool.map((map) => <li key={map}>{map}</li>)}</ul></div> : null}
    {metadata.rewards && <div className="event-announcement-block"><p className="eyebrow"><span>RECOMPENSAS</span></p><RichText value={metadata.rewards} /></div>}
    {metadata.instructions && <div className="event-announcement-block"><p className="eyebrow"><span>{metadata.type === "tournament" ? "REGLAMENTO" : "INDICACIONES"}</span></p><RichText value={metadata.instructions} /></div>}
  </section>;
}

function EventHeader({ event, metadata }: { event: EventDetail; metadata: EventMetadata }) {
  return <header className="event-publication-header">
    {event.cover_image && <img className="event-publication-banner" src={event.cover_image} alt={`Banner de ${event.title}`} />}
    <p className="eyebrow"><span>{metadata.is_history ? "EVENTO FINALIZADO" : "EVENTO PUBLICADO"}</span> {metadata.type === "draft" ? "DRAFT" : "TORNEO"}</p>
    <h1>{event.title}</h1>
    {event.excerpt && <RichText value={event.excerpt} className="event-publication-summary" />}
  </header>;
}

function TournamentInformation({ event, metadata }: { event: EventDetail; metadata: EventMetadata }) {
  return <div className="tournament-information">
    <EventHeader event={event} metadata={metadata} />
    <EventFacts metadata={metadata} />
    {metadata.registration_deadline && <div className="event-queue-notice"><small>INSCRIPCIONES</small><strong>CIERRE: {metadata.registration_deadline}{metadata.check_in_time ? ` · CHECK-IN: ${metadata.check_in_time}` : ""}</strong></div>}
    <AnnouncementDetails metadata={metadata} />
    <section className="event-publication-body"><p className="eyebrow"><span>INFORMACIÓN</span> DEL TORNEO</p><RichText value={event.body} /></section>
    <footer className="event-publication-author">Publicado por {event.author?.name ?? "Staff de KEKE"}</footer>
  </div>;
}

function TournamentWorkspace({ event, metadata, slug }: { event: EventDetail; metadata: EventMetadata; slug: string }) {
  const [tab, setTab] = useState<"information" | "registration" | "teams">("information");
  return <article className="tournament-workspace">
    <aside className="tournament-sidebar">
      <div><small>TORNEO</small><h1>{event.title}</h1><span>{metadata.format ?? "Formato por definir"}</span></div>
      <nav aria-label="Secciones del torneo">
        <button type="button" className={tab === "information" ? "is-active" : ""} onClick={() => setTab("information")}><span>01</span>INFORMACIÓN</button>
        <button type="button" className={tab === "registration" ? "is-active" : ""} onClick={() => setTab("registration")}><span>02</span>REGISTRO</button>
        <button type="button" className={tab === "teams" ? "is-active" : ""} onClick={() => setTab("teams")}><span>03</span>TEAMS</button>
      </nav>
      <div className="tournament-sidebar-meta"><small>FECHA</small><strong>{metadata.date ?? "Por definir"}</strong><small>CUPO</small><strong>{metadata.team_count ? `${metadata.team_count} equipos` : "Abierto"}</strong></div>
    </aside>
    <div className="tournament-tab-content">
      {tab === "information" && <TournamentInformation event={event} metadata={metadata} />}
      {tab === "registration" && <TournamentRegistrationForm slug={slug} />}
      {tab === "teams" && <TournamentTeams slug={slug} />}
    </div>
  </article>;
}

export default function EventDetailClient({ slug }: { slug: string }) {
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/events/${encodeURIComponent(slug)}`, { headers: { Accept: "application/json" }, cache: "no-store" })
      .then((response) => { if (!response.ok) throw new Error("No se encontró esta publicación."); return response.json(); })
      .then((payload) => setEvent(payload.data ?? null))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "No se encontró esta publicación."));
  }, [slug]);

  const metadata = event?.metadata ?? {};
  const isTournamentWorkspace = Boolean(event && metadata.type === "tournament" && !metadata.is_history);
  return <main>
    <SiteHeader active="eventos" />
    <section className={`event-detail-page${isTournamentWorkspace ? " has-tournament-workspace" : ""}`}>
      <Link className="event-back-link" href="/eventos">← VOLVER A EVENTOS</Link>
      {error && <p className="api-notice" role="alert">{error}</p>}
      {!event && !error && <p className="history-empty">CARGANDO PUBLICACIÓN…</p>}
      {event && isTournamentWorkspace && <TournamentWorkspace event={event} metadata={metadata} slug={slug} />}
      {event && !isTournamentWorkspace && <article>
        <EventHeader event={event} metadata={metadata} />
        <EventFacts metadata={metadata} />
        {metadata.queue_opens && <div className="event-queue-notice"><small>DRAFT QUEUE</small><strong>APERTURA: {metadata.queue_opens}</strong></div>}
        {metadata.is_history && <section className="event-winner-section"><p className="eyebrow"><span>RESULTADO FINAL</span> CAMPEONES DEL EVENTO</p><div className="event-winner-heading"><div><small>EQUIPO GANADOR</small><h2><RichTextInline value={metadata.winner_team ?? metadata.champion ?? "Ganadores"} /></h2>{metadata.type === "tournament" && metadata.runner_up && <span>Final contra {metadata.runner_up}</span>}</div><strong>{metadata.winners?.length ?? 0}<small> INTEGRANTES</small></strong></div>{metadata.winning_captain && <div className="event-captain-reference"><small>CAPITÁN GANADOR</small><PlayerRoster players={[metadata.winning_captain]} /></div>}{metadata.winners?.length ? <PlayerRoster players={metadata.winners} /> : <p className="history-empty">Los integrantes no fueron vinculados en esta publicación antigua.</p>}{metadata.honorable_mentions?.length ? <div className="event-honorable"><div><small>MENCIÓN HONORÍFICA</small><strong>{metadata.honorable_mention_reason ?? "Participación destacada"}</strong></div><PlayerRoster players={metadata.honorable_mentions} /></div> : null}</section>}
        <AnnouncementDetails metadata={metadata} />
        <section className="event-publication-body"><p className="eyebrow"><span>INFORMACIÓN</span> DETALLES ADICIONALES</p><RichText value={event.body} /></section>
        <footer className="event-publication-author">Publicado por {event.author?.name ?? "Staff de KEKE"}</footer>
      </article>}
    </section>
    <SiteFooter />
  </main>;
}
