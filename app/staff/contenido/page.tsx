"use client";
/* eslint-disable @next/next/no-img-element -- Local object URLs are used for upload previews. */

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { AutoTextarea, RichTextEditor } from "../../components/rich-text";
import { SiteFooter, SiteHeader } from "../../components/site-chrome";
import { VerifiedPlayer, VerifiedPlayerPicker } from "../../components/verified-player-picker";

type EventItem = {
  id: number;
  title: string;
  excerpt?: string | null;
  body?: string | null;
  status: string;
  cover_image?: string | null;
  author?: { name?: string };
  metadata?: {
    type?: string;
    date?: string;
    is_history?: boolean;
    queue_opens?: string | null;
    registration_deadline?: string | null;
    format?: string | null;
    team_count?: number | null;
    players_per_team?: number | null;
    registration_open?: boolean;
    map_pool?: string[];
    prize?: string | null;
    rewards?: string | null;
    instructions?: string | null;
    champion?: string | null;
    winner_team?: string | null;
    runner_up?: string | null;
    winning_captain?: VerifiedPlayer | null;
    winners?: VerifiedPlayer[];
    honorable_mentions?: VerifiedPlayer[];
    honorable_mention_reason?: string | null;
  } | null;
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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [managingId, setManagingId] = useState<number | null>(null);
  const [type, setType] = useState("draft");
  const [publication, setPublication] = useState("upcoming");
  const [status, setStatus] = useState("draft");
  const [title, setTitle] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [date, setDate] = useState("");
  const [queueOpens, setQueueOpens] = useState("");
  const [format, setFormat] = useState("5v5 CTW");
  const [teamCount, setTeamCount] = useState("4");
  const [playersPerTeam, setPlayersPerTeam] = useState("6");
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [registrationDeadline, setRegistrationDeadline] = useState("");
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
    setEditingId(null);
    setType("draft");
    setPublication("upcoming");
    setStatus("draft");
    setTitle("");
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setBannerFile(null);
    setBannerPreview("");
    setCoverImage("");
    setSummary("");
    setBody("");
    setDate("");
    setQueueOpens("");
    setFormat("5v5 CTW");
    setTeamCount("4");
    setPlayersPerTeam("6");
    setRegistrationOpen(true);
    setRegistrationDeadline("");
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

  async function startEditing(id: number) {
    setFeedback("Cargando evento…");
    try {
      const response = await fetch(`/api/admin/events/${id}`, {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "No se pudo abrir el evento.");

      const item = payload.data as EventItem;
      const metadata = item.metadata ?? {};
      const nextType = metadata.type === "tournament" ? "tournament" : "draft";
      setEditingId(item.id);
      setType(nextType);
      setPublication(metadata.is_history ? "history" : "upcoming");
      setStatus(item.status === "published" ? "published" : "draft");
      setTitle(item.title ?? "");
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
      setBannerFile(null);
      setBannerPreview("");
      setCoverImage(item.cover_image ?? "");
      setSummary(item.excerpt ?? "");
      setBody(item.body ?? "");
      setDate(metadata.date ?? "");
      setQueueOpens(metadata.queue_opens ?? "");
      setRegistrationDeadline(metadata.registration_deadline ?? "");
      setFormat(metadata.format ?? (nextType === "tournament" ? "3v3 CTW" : "5v5 CTW"));
      setTeamCount(String(metadata.team_count ?? 4));
      setPlayersPerTeam(String(metadata.players_per_team ?? (nextType === "tournament" ? 3 : 6)));
      setRegistrationOpen(metadata.registration_open ?? false);
      setMapPool(Array.isArray(metadata.map_pool) ? metadata.map_pool.join("\n") : "");
      setPrize(metadata.prize ?? "");
      setRewards(metadata.rewards ?? "");
      setInstructions(metadata.instructions ?? "");
      setWinnerTeam(metadata.winner_team ?? metadata.champion ?? "");
      setRunnerUp(metadata.runner_up ?? "");
      setWinningCaptain(metadata.winning_captain ?? null);
      setWinners(Array.isArray(metadata.winners) ? metadata.winners : []);
      setHonorableMentions(Array.isArray(metadata.honorable_mentions) ? metadata.honorable_mentions : []);
      setHonorableReason(metadata.honorable_mention_reason ?? "");
      setFeedback(`Editando el evento #${item.id}.`);
      document.getElementById("event-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (reason) {
      setFeedback(reason instanceof Error ? reason.message : "No se pudo abrir el evento.");
    }
  }

  async function changeVisibility(item: EventItem) {
    const nextStatus = item.status === "published" ? "draft" : "published";
    setManagingId(item.id);
    setFeedback(nextStatus === "draft" ? "Ocultando evento…" : "Publicando evento…");
    try {
      const token = await csrf();
      const response = await fetch(`/api/admin/events/${item.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json", "X-CSRF-TOKEN": token },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "No se pudo cambiar la visibilidad del evento.");
      if (editingId === item.id) setStatus(nextStatus);
      await loadEvents();
      setFeedback(nextStatus === "draft"
        ? `“${item.title}” quedó oculto para el público y permanece disponible como borrador.`
        : `“${item.title}” vuelve a estar publicado.`);
    } catch (reason) {
      setFeedback(reason instanceof Error ? reason.message : "No se pudo cambiar la visibilidad del evento.");
    } finally {
      setManagingId(null);
    }
  }

  async function deleteEvent(item: EventItem) {
    const confirmed = window.confirm(`¿Eliminar definitivamente “${item.title}”? También se borrarán sus inscripciones. Esta acción no se puede deshacer.`);
    if (!confirmed) return;

    setManagingId(item.id);
    setFeedback("Eliminando evento…");
    try {
      const token = await csrf();
      const response = await fetch(`/api/admin/events/${item.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json", "X-CSRF-TOKEN": token },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "No se pudo eliminar el evento.");
      }
      if (editingId === item.id) resetForm();
      await loadEvents();
      setFeedback(`“${item.title}” fue eliminado definitivamente.`);
    } catch (reason) {
      setFeedback(reason instanceof Error ? reason.message : "No se pudo eliminar el evento.");
    } finally {
      setManagingId(null);
    }
  }

  function handleBannerChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFeedback("El banner debe ser JPG, PNG o WEBP.");
      event.target.value = "";
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setFeedback("El banner no puede superar los 8 MB.");
      event.target.value = "";
      return;
    }
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
    setCoverImage("");
    setFeedback("");
  }

  function removeBanner() {
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setBannerFile(null);
    setBannerPreview("");
    setCoverImage("");
  }

  function changeEventType(nextType: string) {
    setType(nextType);
    setFormat(nextType === "tournament" ? "3v3 CTW" : "5v5 CTW");
    setTeamCount(nextType === "tournament" ? "4" : "4");
    setPlayersPerTeam(nextType === "tournament" ? "3" : "6");
    setFeedback("");
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
      let uploadedCover = coverImage;
      if (bannerFile) {
        setFeedback("Subiendo y validando el banner…");
        const uploadBody = new FormData();
        uploadBody.append("banner", bannerFile);
        const uploadResponse = await fetch("/api/admin/event-banners", {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json", "X-CSRF-TOKEN": token },
          body: uploadBody,
        });
        const uploadPayload = await uploadResponse.json().catch(() => ({}));
        if (!uploadResponse.ok) {
          const validation = uploadPayload.errors ? Object.values(uploadPayload.errors).flat().join(" ") : null;
          throw new Error(validation || uploadPayload.message || "No se pudo subir el banner.");
        }
        uploadedCover = uploadPayload.data?.url ?? "";
        setCoverImage(uploadedCover);
        setBannerFile(null);
      }
      const response = await fetch(editingId ? `/api/admin/events/${editingId}` : "/api/admin/events", {
        method: editingId ? "PUT" : "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json", "X-CSRF-TOKEN": token },
        body: JSON.stringify({
          title,
          excerpt: summary,
          body: body || summary,
          cover_image: uploadedCover || null,
          status,
          metadata: {
            type,
            date,
            queue_opens: type === "draft" ? queueOpens : null,
            registration_deadline: type === "tournament" ? registrationDeadline : null,
            check_in_time: null,
            bracket_type: null,
            format,
            slots: capacity ? `${capacity} personas` : null,
            prize,
            is_history: publication === "history",
            ...(publication === "history" ? {
              champion: winnerTeam,
              winner_team: winnerTeam,
              winning_captain: winningCaptain,
              runner_up: type === "tournament" ? runnerUp : null,
              winners,
              honorable_mentions: honorableMentions,
              honorable_mention_reason: honorableReason,
            } : {}),
            team_count: teams || null,
            players_per_team: roster || null,
            registration_open: type === "tournament" && publication === "upcoming" ? registrationOpen : false,
            map_pool: type === "draft" ? lines(mapPool) : [],
            rewards: type === "draft" ? rewards : "",
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
      const wasEditing = editingId !== null;
      resetForm();
      await loadEvents();
      setFeedback(wasEditing
        ? "Evento actualizado correctamente."
        : status === "published"
          ? publication === "history" ? "Evento publicado en el historial con sus ganadores vinculados." : "Evento publicado correctamente."
          : "Borrador guardado correctamente.");
    } catch (reason) {
      setFeedback(reason instanceof Error ? reason.message : "No se pudo guardar el evento.");
    }
  }

  const submitLabel = status === "draft"
    ? editingId ? "GUARDAR CAMBIOS" : "GUARDAR BORRADOR"
    : publication === "history" ? "PUBLICAR EN HISTORIAL" : type === "tournament" ? "PUBLICAR TORNEO" : "PUBLICAR DRAFT";
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
            <div className="staff-section-heading" id="event-editor"><div><small>{editingId ? `EDITANDO EVENTO #${editingId}` : "NUEVA PUBLICACIÓN"}</small><h2>{editingId ? "EDITAR EVENTO" : "CREAR EVENTO"}</h2></div><span>{type === "tournament" ? "Formulario simple para abrir un torneo" : "Publicación y configuración del Draft"}</span></div>
            <form className="content-form draft-publication-form" onSubmit={handleSubmit}>
              <section className="publication-form-section"><header><span>01</span><div><strong>PUBLICACIÓN</strong><small>El formulario se adapta al tipo de evento</small></div></header><div className="form-row"><label>Tipo<select value={type} onChange={(event) => changeEventType(event.target.value)}><option value="draft">Draft</option><option value="tournament">Torneo</option></select></label><label>Estado<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="draft">Borrador</option><option value="published">Publicado</option></select></label></div><div className="event-type-explainer"><strong>{type === "tournament" ? "TORNEO" : "DRAFT"}</strong><span>{type === "tournament" ? "Equipos prearmados, inscripción por capitán, límite de equipos y cuadro competitivo." : "Jugadores en cola, apertura de Draft Queue y equipos formados durante el evento."}</span></div><label>Destino<select value={publication} onChange={(event) => setPublication(event.target.value)}><option value="upcoming">Agenda — próximo o en curso</option><option value="history">Historial — evento pasado/finalizado</option></select><small className="field-help">Los eventos pasados aparecen en “Ver eventos finalizados”.</small></label></section>

              <section className="publication-form-section"><header><span>02</span><div><strong>{type === "tournament" ? "PRESENTACIÓN DEL TORNEO" : "ANUNCIO DEL DRAFT"}</strong><small>{type === "tournament" ? "Información pública para equipos y capitanes" : "Encabezado y convocatoria para la Draft Queue"}</small></div></header><label>Título<input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder={type === "tournament" ? "COPA KEKE — TORNEO OFICIAL" : "🧁 DRAFT #1 - CTW 🧁"} /></label><div className="event-banner-field"><div><strong>Banner del anuncio</strong><small>JPG, PNG o WEBP · máximo 8 MB · se recomienda formato horizontal panorámico</small></div><label className="event-banner-upload"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleBannerChange} /><span>{bannerPreview || coverImage ? "CAMBIAR BANNER" : "SUBIR BANNER"}</span></label>{(bannerPreview || coverImage) && <div className="event-banner-preview"><img src={bannerPreview || coverImage} alt="Vista previa del banner" /><button type="button" onClick={removeBanner}>QUITAR</button></div>}</div>{publication === "history" && <VerifiedPlayerPicker title="Capitán ganador" description="Selecciona su cuenta verificada para habilitar su mención en el mensaje" selected={winningCaptain ? [winningCaptain] : []} onChange={(players) => setWinningCaptain(players[0] ?? null)} max={1} />}<div className="form-field"><label htmlFor="event-summary">{type === "tournament" ? "Descripción para los equipos" : "Mensaje principal"}</label><RichTextEditor id="event-summary" required rows={3} value={summary} onChange={setSummary} mentions={winningCaptain ? [winningCaptain] : []} placeholder={type === "tournament" ? "Presenta el torneo, quién puede participar y el objetivo de la competencia" : "Descripción breve o convocatoria principal"} />{winningCaptain && <small className="field-help">Coloca el cursor donde quieres el nombre y pulsa “@ {winningCaptain.minecraft_username}” en la barra del editor.</small>}</div><div className="form-row"><label>Fecha y hora del evento<input value={date} onChange={(event) => setDate(event.target.value)} placeholder="sábado, 17 de octubre de 2026 18:00" /></label>{type === "draft" ? <label>Apertura de Draft Queue<input value={queueOpens} onChange={(event) => setQueueOpens(event.target.value)} placeholder="15 minutos antes / fecha y hora" /></label> : <label>Cierre de inscripciones<input value={registrationDeadline} onChange={(event) => setRegistrationDeadline(event.target.value)} placeholder="viernes, 16 de octubre de 2026 23:59" /></label>}</div></section>

              {type === "draft" ? <section className="publication-form-section event-kind-section is-draft"><header><span>03</span><div><strong>CONFIGURACIÓN DEL DRAFT</strong><small>Cola, reparto de jugadores y partida</small></div></header><div className="form-row"><label>Cantidad de equipos del Draft<input type="number" min="2" max="64" value={teamCount} onChange={(event) => setTeamCount(event.target.value)} /></label><label>Jugadores por equipo<input type="number" min="1" max="64" value={playersPerTeam} onChange={(event) => setPlayersPerTeam(event.target.value)} /></label></div><div className="draft-capacity-summary"><small>JUGADORES EN COLA</small><strong>{Number.isFinite(totalPlayers) ? totalPlayers : 0} PERSONAS</strong><span>{teamCount || "0"} equipos × {playersPerTeam || "0"} integrantes</span></div><div className="form-row"><label>Modo / formato<input value={format} onChange={(event) => setFormat(event.target.value)} placeholder="5v5 CTW" /></label><label>Recompensa resumida<input value={prize} onChange={(event) => setPrize(event.target.value)} placeholder="+100 de ELO" /></label></div><div className="form-field"><label htmlFor="event-map-pool">Map pool del Draft — un mapa por línea</label><AutoTextarea id="event-map-pool" rows={5} value={mapPool} onChange={setMapPool} placeholder={'Summit\nVilla\nBarricade\nBastion'} /></div><div className="form-field"><label htmlFor="event-rewards">Recompensas individuales</label><RichTextEditor id="event-rewards" rows={3} value={rewards} onChange={setRewards} placeholder="ELO, roles o recompensas para los jugadores…" /></div><div className="form-field"><label htmlFor="event-instructions">Indicaciones de la cola</label><RichTextEditor id="event-instructions" rows={3} value={instructions} onChange={setInstructions} placeholder="Uso obligatorio de micrófono, llegada a la cola…" /></div><div className="form-field"><label htmlFor="event-body">Detalles adicionales</label><RichTextEditor id="event-body" rows={5} value={body} onChange={setBody} placeholder="Información adicional que no forma parte del anuncio principal" /></div></section> : <section className="publication-form-section event-kind-section is-tournament"><header><span>03</span><div><strong>DATOS DEL TORNEO</strong><small>Lo necesario para abrir el registro de equipos</small></div></header><div className="form-row"><label>Máximo de equipos<input type="number" min="2" max="64" value={teamCount} onChange={(event) => setTeamCount(event.target.value)} /></label><label>Jugadores por equipo<input type="number" min="1" max="64" value={playersPerTeam} onChange={(event) => setPlayersPerTeam(event.target.value)} /></label></div><div className="draft-capacity-summary"><small>CAPACIDAD</small><strong>{teamCount || "0"} EQUIPOS</strong><span>{playersPerTeam || "0"} jugadores por equipo · {Number.isFinite(totalPlayers) ? totalPlayers : 0} jugadores en total</span></div>{publication === "upcoming" && <label className="registration-toggle"><input aria-label="Abrir registro al publicar" type="checkbox" checked={registrationOpen} onChange={(event) => setRegistrationOpen(event.target.checked)} /><span><strong>Abrir registro al publicar</strong><small>Los capitanes podrán inscribir su equipo desde la pestaña Registro.</small></span></label>}<div className="form-row"><label>Modo de juego<input value={format} onChange={(event) => setFormat(event.target.value)} placeholder="3v3 CTW" /></label><label>Premio <small>OPCIONAL</small><input value={prize} onChange={(event) => setPrize(event.target.value)} placeholder="Rango, premio o reconocimiento" /></label></div><div className="form-field"><label htmlFor="event-instructions">Reglas principales <small>OPCIONAL</small></label><RichTextEditor id="event-instructions" rows={3} value={instructions} onChange={setInstructions} placeholder="Puntualidad, sustituciones y condiciones importantes…" /></div><div className="form-field"><label htmlFor="event-body">Información del torneo</label><RichTextEditor id="event-body" rows={4} value={body} onChange={setBody} placeholder="Detalles que aparecerán en la pestaña Información" /></div></section>}

              {publication === "history" && <section className="publication-form-section history-publication-section"><header><span>04</span><div><strong>RESULTADO FINAL</strong><small>Equipo ganador e integrantes vinculados a cuentas verificadas</small></div></header><div className={type === "tournament" ? "form-row winner-result-fields" : "winner-result-fields"}><div className="form-field"><label htmlFor="winner-team">Nombre del equipo ganador</label><RichTextEditor id="winner-team" required rows={2} value={winnerTeam} onChange={setWinnerTeam} mentions={winningCaptain ? [winningCaptain] : []} placeholder="Team de @capitán" />{winningCaptain && <small className="field-help">Pulsa “@ {winningCaptain.minecraft_username}” para vincular al capitán en el nombre del equipo.</small>}</div>{type === "tournament" && <label>Equipo finalista<input value={runnerUp} onChange={(event) => setRunnerUp(event.target.value)} placeholder="Subcampeón (opcional)" /></label>}</div><VerifiedPlayerPicker title="Integrantes ganadores" description="Busca y añade a todos los miembros del equipo ganador" selected={winners} onChange={setWinners} /><VerifiedPlayerPicker title="Menciones honoríficas" description="Opcional: selecciona uno o varios jugadores destacados" selected={honorableMentions} onChange={setHonorableMentions} />{honorableMentions.length > 0 && <label>Motivo de la mención<input value={honorableReason} onChange={(event) => setHonorableReason(event.target.value)} placeholder="Defensa destacada, MVP, mejor capitán…" /></label>}</section>}

              <div className="form-actions"><button className="button-primary" type="submit">{submitLabel}</button>{editingId && <button className="button-muted" type="button" onClick={() => { resetForm(); setFeedback("Edición cancelada."); }}>CANCELAR EDICIÓN</button>}</div>
              {feedback && <p className="form-feedback" role="status">{feedback}</p>}
            </form>
            <div className="recent-content">
              <div className="staff-section-heading"><div><small>ACTIVIDAD</small><h2>EVENTOS CREADOS</h2></div></div>
              <div className="content-table-head"><span>Tipo</span><span>Título</span><span>Estado</span><span>Autor</span><span>Fecha</span><span>Acciones</span></div>
              {events.map((item) => <div className="content-table-row" key={item.id}>
                <span>{item.metadata?.type === "draft" ? "DRAFT" : "TORNEO"}</span>
                <strong>{item.title}</strong>
                <span className={item.status === "published" ? "status-live" : "status-draft"}>{item.status === "published" ? item.metadata?.is_history ? "HISTORIAL" : "PUBLICADO" : "OCULTO / BORRADOR"}</span>
                <span>{item.author?.name ?? "Staff"}</span>
                <span>{item.metadata?.date ?? "—"}</span>
                <div className="content-table-actions">
                  <button type="button" disabled={managingId === item.id} onClick={() => void startEditing(item.id)}>EDITAR</button>
                  <button type="button" disabled={managingId === item.id} onClick={() => void changeVisibility(item)}>{item.status === "published" ? "OCULTAR" : "PUBLICAR"}</button>
                  <button className="is-danger" type="button" disabled={managingId === item.id} onClick={() => void deleteEvent(item)}>ELIMINAR</button>
                </div>
              </div>)}
            </div>
          </>}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
