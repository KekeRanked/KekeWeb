"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { RichTextEditor } from "../../components/rich-text";
import { SiteFooter, SiteHeader } from "../../components/site-chrome";

type EventItem = {
  id: number;
  title: string;
  status: string;
  author?: { name?: string };
  metadata?: { type?: string; date?: string; is_history?: boolean } | null;
};

async function csrf() {
  const response = await fetch("/auth/csrf", { credentials: "include", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("La sesión expiró. Vuelve a iniciar sesión.");
  return (await response.json()).token as string;
}

export default function StaffContentPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [type, setType] = useState("tournament");
  const [publication, setPublication] = useState("upcoming");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [date, setDate] = useState("");
  const [format, setFormat] = useState("");
  const [slots, setSlots] = useState("");
  const [prize, setPrize] = useState("");
  const [champion, setChampion] = useState("");
  const [runnerUp, setRunnerUp] = useState("");
  const [status, setStatus] = useState("draft");
  const [feedback, setFeedback] = useState("");

  function loadEvents() {
    return fetch("/api/admin/events", { credentials: "include", headers: { Accept: "application/json" } })
      .then((response) => {
        if (!response.ok) throw new Error("No se pudieron cargar los eventos.");
        return response.json();
      })
      .then((payload) => setEvents(payload.data ?? []));
  }

  useEffect(() => {
    fetch("/auth/me", { credentials: "include", cache: "no-store", headers: { Accept: "application/json" } })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        const permissions = payload?.data?.permissions ?? [];
        const roles = payload?.data?.roles ?? [];
        const canManage = permissions.includes("events.manage") || roles.includes("owner") || roles.includes("admin");
        setAllowed(canManage);
        if (canManage) return loadEvents();
        return undefined;
      })
      .catch(() => setAllowed(false));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    try {
      const token = await csrf();
      const response = await fetch("/api/admin/events", {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json", "X-CSRF-TOKEN": token },
        body: JSON.stringify({
          title,
          excerpt: summary,
          body: body || summary,
          status,
          metadata: {
            type,
            date,
            format,
            slots,
            prize,
            is_history: publication === "history",
            champion: publication === "history" ? champion : null,
            runner_up: publication === "history" ? runnerUp : null,
            content_format: "keke-markdown-v1",
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message ?? "No se pudo guardar el evento.");
      setFeedback(status === "published"
        ? publication === "history" ? "Evento publicado en el historial." : "Evento publicado correctamente."
        : "Borrador guardado correctamente.");
      setTitle("");
      setSummary("");
      setBody("");
      setDate("");
      setFormat("");
      setSlots("");
      setPrize("");
      setChampion("");
      setRunnerUp("");
      await loadEvents();
    } catch (reason) {
      setFeedback(reason instanceof Error ? reason.message : "No se pudo guardar el evento.");
    }
  }

  const submitLabel = status === "draft"
    ? "GUARDAR BORRADOR"
    : publication === "history" ? "PUBLICAR EN HISTORIAL" : "PUBLICAR EVENTO";

  return (
    <main>
      <SiteHeader active="staff" />
      <section className="staff-header">
        <div><p className="eyebrow"><span>PANEL DE STAFF</span> GESTIÓN DE EVENTOS</p><h1>PUBLICAR<br />DRAFTS Y TORNEOS.</h1></div>
        <div className="staff-identity"><small>CONTROL DE ACCESO</small><strong>STAFF AUTORIZADO</strong><span>Permiso events.manage</span></div>
      </section>
      <section className="staff-workspace">
        <aside className="staff-sidebar"><small>CONTENIDO</small><Link href="/staff/contenido" className="is-active">Eventos</Link><Link href="/eventos">Ver página pública</Link><span /><small>CONFIGURACIÓN</small><Link href="/staff/roles">Roles del staff</Link></aside>
        <div className="staff-main">
          {allowed === null && <p className="history-empty">VERIFICANDO SESIÓN…</p>}
          {allowed === false && <div className="staff-load-state" role="alert">Necesitas iniciar sesión con una cuenta de Staff autorizada para administrar eventos.</div>}
          {allowed && <>
            <div className="staff-section-heading"><div><small>NUEVA PUBLICACIÓN</small><h2>CREAR EVENTO</h2></div><span>Publica una fecha futura o registra un evento ya finalizado</span></div>
            <form className="content-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <label>Tipo<select value={type} onChange={(event) => setType(event.target.value)}><option value="tournament">Torneo</option><option value="draft">Draft</option></select></label>
                <label>Estado<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="draft">Borrador</option><option value="published">Publicado</option></select></label>
              </div>
              <label>Destino de la publicación<select value={publication} onChange={(event) => setPublication(event.target.value)}><option value="upcoming">Agenda — próximo o en curso</option><option value="history">Historial — evento pasado/finalizado</option></select><small className="field-help">Los eventos pasados aparecen al pulsar “Ver eventos finalizados” en la página pública.</small></label>
              <label>Título<input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nombre del draft o torneo" /></label>
              <div className="form-field"><label htmlFor="event-summary">Resumen</label><RichTextEditor id="event-summary" required rows={3} value={summary} onChange={setSummary} placeholder="Información principal para los jugadores" /></div>
              <div className="form-field"><label htmlFor="event-body">Reglamento y detalles</label><RichTextEditor id="event-body" rows={7} value={body} onChange={setBody} placeholder="Formato, requisitos, inscripción y reglas" /></div>
              <div className="form-row">
                <label>Fecha<input value={date} onChange={(event) => setDate(event.target.value)} placeholder="Por anunciar" /></label>
                <label>Formato<input value={format} onChange={(event) => setFormat(event.target.value)} placeholder="5v5 CTW" /></label>
              </div>
              <div className="form-row">
                <label>Cupo<input value={slots} onChange={(event) => setSlots(event.target.value)} placeholder="10 equipos" /></label>
                <label>Premio<input value={prize} onChange={(event) => setPrize(event.target.value)} placeholder="Por anunciar" /></label>
              </div>
              {publication === "history" && <fieldset className="history-fields"><legend>RESULTADO FINAL</legend><div className="form-row"><label>Ganador<input required value={champion} onChange={(event) => setChampion(event.target.value)} placeholder="Equipo o jugador ganador" /></label><label>Finalista<input value={runnerUp} onChange={(event) => setRunnerUp(event.target.value)} placeholder="Subcampeón (opcional)" /></label></div></fieldset>}
              <div className="form-actions"><button className="button-primary" type="submit">{submitLabel}</button></div>
              {feedback && <p className="form-feedback" role="status">{feedback}</p>}
            </form>
            <div className="recent-content">
              <div className="staff-section-heading"><div><small>ACTIVIDAD</small><h2>EVENTOS CREADOS</h2></div></div>
              <div className="content-table-head"><span>Tipo</span><span>Título</span><span>Estado</span><span>Autor</span><span>Fecha</span><span>ID</span></div>
              {events.map((item) => <div className="content-table-row" key={item.id}><span>{item.metadata?.type === "draft" ? "DRAFT" : "TORNEO"}</span><strong>{item.title}</strong><span className={item.status === "published" ? "status-live" : "status-draft"}>{item.status === "published" ? item.metadata?.is_history ? "HISTORIAL" : "PUBLICADO" : "BORRADOR"}</span><span>{item.author?.name ?? "Staff"}</span><span>{item.metadata?.date ?? "—"}</span><span>#{item.id}</span></div>)}
            </div>
          </>}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
