"use client";
/* eslint-disable @next/next/no-img-element -- Minecraft avatar service uses dynamic UUID paths. */

import Link from "next/link";
import { useEffect, useState } from "react";
import { RichText } from "../../components/rich-text";
import { SiteFooter, SiteHeader } from "../../components/site-chrome";

type EventDetail = {
  title: string;
  excerpt: string | null;
  body: string;
  published_at: string | null;
  author?: { name?: string };
  metadata: {
    type?: string;
    date?: string;
    format?: string;
    slots?: string;
    prize?: string;
    is_history?: boolean;
    champion?: string;
    winner_team?: string;
    runner_up?: string;
    queue_opens?: string;
    team_count?: number;
    players_per_team?: number;
    map_pool?: string[];
    rewards?: string;
    instructions?: string;
    winners?: LinkedPlayer[];
    honorable_mentions?: LinkedPlayer[];
    honorable_mention_reason?: string;
  } | null;
};

type LinkedPlayer = {
  minecraft_uuid: string;
  minecraft_username: string;
  discord_id?: string | null;
};

function PlayerRoster({ players }: { players: LinkedPlayer[] }) {
  return <div className="event-player-roster">{players.map((player) => <Link href={`/players/${encodeURIComponent(player.minecraft_username)}`} className="event-linked-player" key={player.minecraft_uuid}><img src={`https://mc-heads.net/avatar/${player.minecraft_uuid}/52.png`} alt="" width={52} height={52} /><span><strong>{player.minecraft_username}</strong><small>CUENTA VERIFICADA</small></span><b>VER PERFIL →</b></Link>)}</div>;
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
  return (
    <main>
      <SiteHeader active="eventos" />
      <section className="event-detail-page">
        <Link className="event-back-link" href="/eventos">← VOLVER A EVENTOS</Link>
        {error && <p className="api-notice" role="alert">{error}</p>}
        {!event && !error && <p className="history-empty">CARGANDO PUBLICACIÓN…</p>}
        {event && <article>
          <header className="event-publication-header">
            <p className="eyebrow"><span>{metadata.is_history ? "EVENTO FINALIZADO" : "EVENTO PUBLICADO"}</span> {metadata.type === "draft" ? "DRAFT" : "TORNEO"}</p>
            <h1>{event.title}</h1>
            {event.excerpt && <RichText value={event.excerpt} className="event-publication-summary" />}
          </header>
          <div className="event-publication-facts">
            <div><small>FECHA</small><strong>{metadata.date ?? "Por definir"}</strong></div>
            <div><small>FORMATO</small><strong>{metadata.format ?? "Por definir"}</strong></div>
            <div><small>{metadata.is_history ? "EQUIPO GANADOR" : "CUPO"}</small><strong>{metadata.is_history ? metadata.winner_team ?? metadata.champion ?? "No indicado" : metadata.slots ?? "Por confirmar"}</strong></div>
            <div><small>PREMIO</small><strong>{metadata.prize ?? "Por anunciar"}</strong></div>
          </div>
          {metadata.queue_opens && <div className="event-queue-notice"><small>DRAFT QUEUE</small><strong>APERTURA: {metadata.queue_opens}</strong></div>}
          {metadata.is_history && <section className="event-winner-section"><p className="eyebrow"><span>RESULTADO FINAL</span> CAMPEONES DEL EVENTO</p><div className="event-winner-heading"><div><small>EQUIPO GANADOR</small><h2>{metadata.winner_team ?? metadata.champion ?? "Ganadores"}</h2>{metadata.runner_up && <span>Final contra {metadata.runner_up}</span>}</div><strong>{metadata.winners?.length ?? 0}<small> INTEGRANTES</small></strong></div>{metadata.winners?.length ? <PlayerRoster players={metadata.winners} /> : <p className="history-empty">Los integrantes no fueron vinculados en esta publicación antigua.</p>}{metadata.honorable_mentions?.length ? <div className="event-honorable"><div><small>MENCIÓN HONORÍFICA</small><strong>{metadata.honorable_mention_reason ?? "Participación destacada"}</strong></div><PlayerRoster players={metadata.honorable_mentions} /></div> : null}</section>}
          {(metadata.team_count || metadata.players_per_team || metadata.map_pool?.length || metadata.rewards || metadata.instructions) && <section className="event-announcement-grid"><div className="event-announcement-block"><p className="eyebrow"><span>CARACTERÍSTICAS</span></p><dl><div><dt>Cantidad de equipos</dt><dd>{metadata.team_count ?? "—"}</dd></div><div><dt>Jugadores por equipo</dt><dd>{metadata.players_per_team ?? "—"}</dd></div><div><dt>Cupo total</dt><dd>{metadata.slots ?? "—"}</dd></div></dl></div>{metadata.map_pool?.length ? <div className="event-announcement-block"><p className="eyebrow"><span>MAP POOL</span></p><ul>{metadata.map_pool.map((map) => <li key={map}>{map}</li>)}</ul></div> : null}{metadata.rewards && <div className="event-announcement-block"><p className="eyebrow"><span>RECOMPENSAS</span></p><RichText value={metadata.rewards} /></div>}{metadata.instructions && <div className="event-announcement-block"><p className="eyebrow"><span>INDICACIONES</span></p><RichText value={metadata.instructions} /></div>}</section>}
          <section className="event-publication-body"><p className="eyebrow"><span>INFORMACIÓN</span> DETALLES ADICIONALES</p><RichText value={event.body} /></section>
          <footer className="event-publication-author">Publicado por {event.author?.name ?? "Staff de KEKE"}</footer>
        </article>}
      </section>
      <SiteFooter />
    </main>
  );
}
