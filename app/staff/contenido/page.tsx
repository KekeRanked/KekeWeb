"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AutoTextarea, RichTextEditor } from "../../components/rich-text";
import { SiteFooter, SiteHeader } from "../../components/site-chrome";
import { VerifiedPlayer, VerifiedPlayerPicker } from "../../components/verified-player-picker";

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

function lines(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim().replace(/^-\s*/, "")).filter(Boolean);
}

export default function StaffContentPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [type, setType] = useState("draft");
  const [publication, setPublication] = useState("upcoming");
  const [status, setStatus] = useState("draft");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [date, setDate] = useState("");
  const [queueOpens, setQueueOpens] = useState("");
  const [format, setFormat] = useState("5v5 CTW");
  const [teamCount, setTeamCount] = useState("4");
  const [playersPerTeam, setPlayersPerTeam] = useState("6");
  const [mapPool, setMapPool] = useState("");
  const [prize, setPrize] = useState("");
  const [rewards, setRewards] = useState("");
  const [instructions, setInstructions] = useState("");
  const [winnerTeam, setWinnerTeam] = useState("");
  const [runnerUp, setRunnerUp] = useState("");
  const [winningCaptain, setWinningCaptain] = useState<VerifiedPlayer | null>(null);
  const [winners, setWinners] = useState<VerifiedPlayer[]>([]);
  const [honorableMentions, setHonorableMentions] = useState<VerifiedPlayer[]>([]);
  const [honorableReason, setHonorableReason] = useState("");
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

  function resetForm() {
    setTitle("");
    setSummary("");
    setBody("");
    setDate("");
    setQueueOpens("");
    setMapPool("");
    setPrize("");
    setRewards("");
    setInstructions("");
    setWinnerTeam("");
    setRunnerUp("");
    setWinningCaptain(null);
    setWinners([]);
    setHonorableMentions([]);
    setHonorableReason("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    if (status === "published" && publication === "history" && winners.length === 0) {
      setFeedback("Selecciona al menos un integrante ganador desde las cuentas verificadas.");
      return;
    }

    const teams = Number(teamCount);
    const roster = Number(playersPerTeam);
    const capacity = Number.isFinite(teams * roster) ? teams * roster : 0;
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
            queue_opens: queueOpens,
            format,
            slots: capacity ? `${capacity} personas` : null,
            prize,
            is_history: publication === "history",
            champion: publication === "history" ? winnerTeam : null,
            winner_team: publication === "history" ? winnerTeam : null,
            winning_captain: publication === "history" ? winningCaptain : null,
            runner_up: publication === "history" ? runnerUp : null,
            winners: publication === "history" ? winners : [],
            honorable_mentions: publication === "history" ? honorableMentions : [],
            honorable_mention_reason: publication === "history" ? honorableReason : null,
            team_count: teams || null,
            players_per_team: roster || null,
            map_pool: lines(mapPool),
            rewards,
            instructions,
            content_format: "keke-markdown-v1",
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const validation = payload.errors ? Object.values(payload.errors).flat().join(" ") : null;
        throw new Error(validation || payload.message || "No se pudo guardar el evento.");
      }
      setFeedback(status === "published"
        ? publication === "history" ? "Evento publicado en el historial con sus ganadores vinculados." : "Evento publicado correctamente."
        : "Borrador guardado correctamente.");
      resetForm();
      await loadEvents();
    } catch (reason) {
      setFeedback(reason instanceof Error ? reason.message : "No se pudo guardar el evento.");
    }
  }

  const submitLabel = status === "draft"
    ? "GUARDAR BORRADOR"
    : publication === "history" ? "PUBLICAR EN HISTORIAL" : "PUBLICAR EVENTO";
  const totalPlayers = Number(teamCount) * Number(playersPerTeam);

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
            <div className="staff-section-heading"><div><small>NUEVA PUBLICACIÓN</small><h2>CREAR EVENTO</h2></div><span>Formato adaptado a los anuncios de Draft en Discord</span></div>
            <form className="content-form draft-publication-form" onSubmit={handleSubmit}>
              <section className="publication-form-section"><header><span>01</span><div><strong>PUBLICACIÓN</strong><small>Define dónde y cómo aparecerá</small></div></header><div className="form-row"><label>Tipo<select value={type} onChange={(event) => setType(event.target.value)}><option value="draft">Draft</option><option value="tournament">Torneo</option></select></label><label>Estado<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="draft">Borrador</option><option value="published">Publicado</option></select></label></div><label>Destino<select value={publication} onChange={(event) => setPublication(event.target.value)}><option value="upcoming">Agenda — próximo o en curso</option><option value="history">Historial — evento pasado/finalizado</option></select><small className="field-help">Los eventos pasados aparecen en “Ver eventos finalizados”.</small></label></section>

              <section className="publication-form-section"><header><span>02</span><div><strong>ANUNCIO PRINCIPAL</strong><small>Equivale al encabezado y presentación en Discord</small></div></header><label>Título<input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="🧁 DRAFT #1 - CTW 🧁" /></label>{publication === "history" && <VerifiedPlayerPicker title="Capitán ganador" description="Selecciona su cuenta verificada para habilitar su mención en el mensaje" selected={winningCaptain ? [winningCaptain] : []} onChange={(players) => setWinningCaptain(players[0] ?? null)} max={1} />}<div className="form-field"><label htmlFor="event-summary">Mensaje principal</label><RichTextEditor id="event-summary" required rows={3} value={summary} onChange={setSummary} mentions={winningCaptain ? [winningCaptain] : []} placeholder="Descripción breve o felicitación principal" />{winningCaptain && <small className="field-help">Coloca el cursor donde quieres el nombre y pulsa “@ {winningCaptain.minecraft_username}” en la barra del editor.</small>}</div><div className="form-row"><label>Fecha y hora<input value={date} onChange={(event) => setDate(event.target.value)} placeholder="sábado, 15 de agosto de 2026 18:00" /></label><label>Apertura de Draft Queue<input value={queueOpens} onChange={(event) => setQueueOpens(event.target.value)} placeholder="15 minutos antes / fecha y hora" /></label></div></section>

              <section className="publication-form-section"><header><span>03</span><div><strong>CARACTERÍSTICAS</strong><small>Configuración visible del Draft</small></div></header><div className="form-row"><label>Cantidad de equipos<input type="number" min="2" max="64" value={teamCount} onChange={(event) => setTeamCount(event.target.value)} /></label><label>Jugadores por equipo<input type="number" min="1" max="64" value={playersPerTeam} onChange={(event) => setPlayersPerTeam(event.target.value)} /></label></div><div className="draft-capacity-summary"><small>CUPO CALCULADO</small><strong>{Number.isFinite(totalPlayers) ? totalPlayers : 0} PERSONAS</strong><span>{teamCount || "0"} equipos × {playersPerTeam || "0"} integrantes</span></div><div className="form-row"><label>Formato<input value={format} onChange={(event) => setFormat(event.target.value)} placeholder="5v5 CTW" /></label><label>Premio resumido<input value={prize} onChange={(event) => setPrize(event.target.value)} placeholder="+100 de ELO" /></label></div><div className="form-field"><label htmlFor="event-map-pool">Map pool — un mapa por línea</label><AutoTextarea id="event-map-pool" rows={5} value={mapPool} onChange={setMapPool} placeholder={'Summit\nVilla\nBarricade\nBastion'} /></div><div className="form-field"><label htmlFor="event-rewards">Recompensas</label><RichTextEditor id="event-rewards" rows={3} value={rewards} onChange={setRewards} placeholder="Los ganadores recibirán 100 de ELO y un rol personalizado…" /></div><div className="form-field"><label htmlFor="event-instructions">Indicaciones</label><RichTextEditor id="event-instructions" rows={3} value={instructions} onChange={setInstructions} placeholder="Uso obligatorio de micrófono…" /></div><div className="form-field"><label htmlFor="event-body">Detalles adicionales</label><RichTextEditor id="event-body" rows={5} value={body} onChange={setBody} placeholder="Información adicional que no forma parte del anuncio principal" /></div></section>

              {publication === "history" && <section className="publication-form-section history-publication-section"><header><span>04</span><div><strong>RESULTADO FINAL</strong><small>Equipo ganador e integrantes vinculados a cuentas verificadas</small></div></header><div className="form-row"><label>Nombre del equipo ganador<input required value={winnerTeam} onChange={(event) => setWinnerTeam(event.target.value)} placeholder="Team de SOY_EL_MAS_BEST" /></label><label>Equipo finalista<input value={runnerUp} onChange={(event) => setRunnerUp(event.target.value)} placeholder="Subcampeón (opcional)" /></label></div><VerifiedPlayerPicker title="Integrantes ganadores" description="Busca y añade a todos los miembros del equipo ganador" selected={winners} onChange={setWinners} /><VerifiedPlayerPicker title="Menciones honoríficas" description="Opcional: selecciona uno o varios jugadores destacados" selected={honorableMentions} onChange={setHonorableMentions} />{honorableMentions.length > 0 && <label>Motivo de la mención<input value={honorableReason} onChange={(event) => setHonorableReason(event.target.value)} placeholder="Defensa destacada, MVP, mejor capitán…" /></label>}</section>}

              <div className="form-actions"><button className="button-primary" type="submit">{submitLabel}</button></div>
              {feedback && <p className="form-feedback" role="status">{feedback}</p>}
            </form>
            <div className="recent-content"><div className="staff-section-heading"><div><small>ACTIVIDAD</small><h2>EVENTOS CREADOS</h2></div></div><div className="content-table-head"><span>Tipo</span><span>Título</span><span>Estado</span><span>Autor</span><span>Fecha</span><span>ID</span></div>{events.map((item) => <div className="content-table-row" key={item.id}><span>{item.metadata?.type === "draft" ? "DRAFT" : "TORNEO"}</span><strong>{item.title}</strong><span className={item.status === "published" ? "status-live" : "status-draft"}>{item.status === "published" ? item.metadata?.is_history ? "HISTORIAL" : "PUBLICADO" : "BORRADOR"}</span><span>{item.author?.name ?? "Staff"}</span><span>{item.metadata?.date ?? "—"}</span><span>#{item.id}</span></div>)}</div>
          </>}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
