"use client";

import { useEffect, useState } from "react";
import { SiteFooter, SiteHeader } from "../components/site-chrome";

type EventItem = { id: number; title: string; excerpt: string | null; status: string; metadata: { type?: string; date?: string; format?: string; slots?: string; prize?: string } | null };

export default function EventosPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/events", { headers: { Accept: "application/json" }, cache: "no-store" })
      .then((response) => { if (!response.ok) throw new Error("No se pudieron cargar los eventos."); return response.json(); })
      .then((payload) => { setEvents(payload.data ?? []); setError(""); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "No se pudieron cargar los eventos."))
      .finally(() => setLoading(false));
  }, []);

  const nextEvent = events[0];
  const nextMetadata = nextEvent?.metadata ?? {};
  return (
    <main>
      <SiteHeader active="eventos" />
      <section className="portal-hero event-hero">
        <div className="portal-hero-grid" aria-hidden="true" />
        <div>
          <p className="eyebrow"><span>TEMPORADA BETA</span> CALENDARIO COMPETITIVO</p>
          <h1>ENTRA AL EVENTO.<br /><em>DEJA TU MARCA.</em></h1>
        </div>
        <p>Torneos organizados, drafts abiertos y formatos especiales con reglas publicadas antes de cada inscripción.</p>
      </section>

      <section className="events-section">
        <div className="events-overview">
          <div><small>PRÓXIMO EVENTO</small><strong>{nextEvent ? nextEvent.title : "POR DEFINIR"}</strong><span>{nextEvent ? (nextMetadata.date ?? "Fecha por anunciar") : "Será anunciado"}</span></div>
          <div><small>FORMATO</small><strong>{nextMetadata.format ?? "POR DEFINIR"}</strong><span>{nextEvent ? "Información publicada" : "Próximamente"}</span></div>
          <div><small>PREMIO TOTAL</small><strong>{nextMetadata.prize ?? "POR DEFINIR"}</strong><span>{nextEvent ? "Bases del evento" : "Próximamente"}</span></div>
          <div><small>REGISTRO</small><strong>{nextMetadata.slots ?? "—"}</strong><span>{nextEvent?.status === "published" ? "Consulta la publicación" : "Aún no abierto"}</span></div>
        </div>

        <div className="section-title-row"><div><p className="eyebrow"><span>AGENDA</span> PRÓXIMAS FECHAS</p><h2>TORNEOS Y DRAFTS</h2></div><button type="button">VER EVENTOS FINALIZADOS</button></div>
        {error && <p className="api-notice" role="alert">{error}</p>}
        <div className="event-list">
          {loading && <p className="history-empty">CARGANDO EVENTOS…</p>}
          {!loading && !events.length && <p className="history-empty">AÚN NO HAY DRAFTS NI TORNEOS PUBLICADOS</p>}
          {events.map((event, index) => (
            <article className={index === 0 ? "event-card is-featured" : "event-card"} key={event.id}>
              <div className="event-date"><span>{event.metadata?.type === "draft" ? "DRAFT" : "TORNEO"}</span><strong>{event.metadata?.date ?? "POR DEFINIR"}</strong></div>
              <div className="event-detail"><small>{event.status === "published" ? "PUBLICADO" : "PRÓXIMAMENTE"}</small><h3>{event.title}</h3><p>{event.metadata?.format ?? event.excerpt ?? "Detalles por anunciar."}</p></div>
              <div className="event-capacity"><small>CUPO</small><strong>{event.metadata?.slots ?? "Por confirmar"}</strong></div>
              <button type="button">{event.status === "published" ? "VER DETALLES" : "PRÓXIMAMENTE"}</button>
            </article>
          ))}
        </div>

        <div className="event-process">
          <div><span>01</span><strong>Revisa el formato</strong><p>Cada evento publica requisitos, reglamento y horarios antes de abrir registros.</p></div>
          <div><span>02</span><strong>Registra tu equipo</strong><p>El capitán completa la inscripción y confirma a todos los integrantes.</p></div>
          <div><span>03</span><strong>Confirma asistencia</strong><p>Los participantes deben presentarse en Discord antes de la hora indicada.</p></div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
