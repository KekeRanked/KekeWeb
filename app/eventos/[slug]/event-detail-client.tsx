"use client";

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
    runner_up?: string;
  } | null;
};

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
            <div><small>{metadata.is_history ? "GANADOR" : "CUPO"}</small><strong>{metadata.is_history ? metadata.champion ?? "No indicado" : metadata.slots ?? "Por confirmar"}</strong></div>
            <div><small>PREMIO</small><strong>{metadata.prize ?? "Por anunciar"}</strong></div>
          </div>
          {metadata.is_history && metadata.runner_up && <div className="event-result-banner"><small>FINAL</small><strong>{metadata.champion}</strong><span>sobre {metadata.runner_up}</span></div>}
          <section className="event-publication-body"><p className="eyebrow"><span>INFORMACIÓN</span> DETALLES DEL EVENTO</p><RichText value={event.body} /></section>
          <footer className="event-publication-author">Publicado por {event.author?.name ?? "Staff de KEKE"}</footer>
        </article>}
      </section>
      <SiteFooter />
    </main>
  );
}
