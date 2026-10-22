"use client";
/* eslint-disable @next/next/no-img-element -- Minecraft avatar service uses dynamic UUID paths. */

import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";

type SessionUser = {
  name: string;
  minecraft_uuid: string | null;
  minecraft_username: string | null;
};

type RegisteredPlayer = {
  user_id: number;
  minecraft_uuid: string;
  minecraft_username: string;
  discord_username: string | null;
};

type RegistrationMember = {
  id?: number;
  user_id: number | null;
  minecraft_uuid: string | null;
  minecraft_username: string;
  is_verified: boolean;
  role: "captain" | "member";
  position: number;
};

type Registration = {
  team_name: string;
  team_tag: string | null;
  status: "pending" | "approved" | "rejected";
  notes: string | null;
  members: RegistrationMember[];
};

type RegistrationMeta = {
  players_per_team: number;
  max_teams: number | null;
  registered_teams: number;
  spots_left: number | null;
  registration_open: boolean;
};

type Slot = {
  user_id: number | null;
  minecraft_uuid: string | null;
  minecraft_username: string;
  is_verified: boolean;
};

const emptySlot = (): Slot => ({ user_id: null, minecraft_uuid: null, minecraft_username: "", is_verified: false });

async function csrf() {
  const response = await fetch("/auth/csrf", { credentials: "include", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("La sesión expiró. Vuelve a iniciar sesión.");
  return (await response.json()).token as string;
}

function errorMessage(payload: Record<string, unknown>, fallback: string) {
  const errors = payload.errors && typeof payload.errors === "object"
    ? Object.values(payload.errors as Record<string, string[]>).flat().join(" ")
    : "";
  return errors || (typeof payload.message === "string" ? payload.message : fallback);
}

export function TournamentRegistrationForm({ slug }: { slug: string }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [meta, setMeta] = useState<RegistrationMeta | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teamTag, setTeamTag] = useState("");
  const [notes, setNotes] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RegisteredPlayer[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    fetch("/auth/me", { credentials: "include", cache: "no-store", headers: { Accept: "application/json" } })
      .then(async (response) => response.ok ? (await response.json()).data as SessionUser : null)
      .then((sessionUser) => {
        setUser(sessionUser);
        setAuthChecked(true);
        if (!sessionUser) return null;
        return fetch(`/api/events/${encodeURIComponent(slug)}/registration`, {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
      })
      .then(async (response) => {
        if (!response) return;
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(errorMessage(payload, "No se pudo cargar la inscripción."));
        const current = (payload.data ?? null) as Registration | null;
        const nextMeta = payload.meta as RegistrationMeta;
        const memberSlots = current?.members
          ?.filter((member) => member.role !== "captain")
          .map((member) => ({
            user_id: member.user_id,
            minecraft_uuid: member.minecraft_uuid,
            minecraft_username: member.minecraft_username,
            is_verified: member.is_verified,
          })) ?? [];
        while (memberSlots.length < Math.max(0, nextMeta.players_per_team - 1)) memberSlots.push(emptySlot());
        setRegistration(current);
        setMeta(nextMeta);
        setTeamName(current?.team_name ?? "");
        setTeamTag(current?.team_tag ?? "");
        setNotes(current?.notes ?? "");
        setSlots(memberSlots.slice(0, Math.max(0, nextMeta.players_per_team - 1)));
      })
      .catch((reason) => setFeedback(reason instanceof Error ? reason.message : "No se pudo cargar la inscripción."));
  }, [slug]);

  const selectedUserIds = useMemo(() => new Set(slots.map((slot) => slot.user_id).filter(Boolean)), [slots]);

  async function searchPlayers() {
    const term = query.trim();
    if (term.length < 2) {
      setFeedback("Escribe al menos 2 caracteres para buscar.");
      return;
    }
    setSearching(true);
    setFeedback("");
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(slug)}/registration-players?q=${encodeURIComponent(term)}`, {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(errorMessage(payload, "No se pudo buscar jugadores."));
      setResults(payload.data ?? []);
      if (!(payload.data ?? []).length) setFeedback("No hay cuentas registradas y verificadas con esa búsqueda.");
    } catch (reason) {
      setFeedback(reason instanceof Error ? reason.message : "No se pudo buscar jugadores.");
    } finally {
      setSearching(false);
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    void searchPlayers();
  }

  function referencePlayer(player: RegisteredPlayer) {
    const index = slots.findIndex((slot) => !slot.minecraft_username);
    if (index < 0) {
      setFeedback("No quedan plazas vacías. Libera una plaza antes de vincular otra cuenta.");
      return;
    }
    setSlots((current) => current.map((slot, slotIndex) => slotIndex === index ? {
      user_id: player.user_id,
      minecraft_uuid: player.minecraft_uuid,
      minecraft_username: player.minecraft_username,
      is_verified: true,
    } : slot));
    setFeedback(`${player.minecraft_username} fue vinculado al equipo.`);
  }

  function setManualMember(index: number, minecraftUsername: string) {
    setSlots((current) => current.map((slot, slotIndex) => slotIndex === index ? {
      user_id: null,
      minecraft_uuid: null,
      minecraft_username: minecraftUsername,
      is_verified: false,
    } : slot));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    if (slots.some((slot) => !slot.minecraft_username.trim())) {
      setFeedback("Completa todos los integrantes antes de enviar la inscripción.");
      return;
    }
    setSaving(true);
    try {
      const token = await csrf();
      const response = await fetch(`/api/events/${encodeURIComponent(slug)}/registration`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json", "X-CSRF-TOKEN": token },
        body: JSON.stringify({
          team_name: teamName,
          team_tag: teamTag || null,
          notes: notes || null,
          members: slots.map((slot) => slot.user_id
            ? { user_id: slot.user_id }
            : { minecraft_username: slot.minecraft_username.trim() }),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(errorMessage(payload, "No se pudo guardar la inscripción."));
      setRegistration(payload.data as Registration);
      setMeta(payload.meta as RegistrationMeta);
      setFeedback(payload.message ?? "Equipo inscrito correctamente.");
    } catch (reason) {
      setFeedback(reason instanceof Error ? reason.message : "No se pudo guardar la inscripción.");
    } finally {
      setSaving(false);
    }
  }

  if (!authChecked) return <section className="tournament-registration"><p className="history-empty">COMPROBANDO SESIÓN…</p></section>;

  if (!user) {
    const returnTo = `/eventos/${encodeURIComponent(slug)}`;
    return <section className="tournament-registration registration-login"><div><p className="eyebrow"><span>INSCRIPCIONES</span> EQUIPOS</p><h2>INSCRIBE A TU EQUIPO</h2><p>Inicia sesión con Discord para registrar la alineación. La cuenta que inicia sesión quedará como capitán.</p></div><a href={`/auth/discord?return_to=${encodeURIComponent(returnTo)}`}>INICIAR SESIÓN CON DISCORD →</a></section>;
  }

  if (feedback && !meta) return <section className="tournament-registration"><p className="api-notice" role="alert">{feedback}</p></section>;
  if (!meta) return <section className="tournament-registration"><p className="history-empty">CARGANDO INSCRIPCIÓN…</p></section>;

  const isFull = meta.spots_left === 0 && !registration;
  return (
    <section className="tournament-registration">
      <header className="registration-heading">
        <div><p className="eyebrow"><span>INSCRIPCIONES</span> EQUIPOS</p><h2>{registration ? "TU EQUIPO" : "INSCRIBE A TU EQUIPO"}</h2><p>El capitán cuenta como una plaza. Vincula jugadores registrados y verificados o escribe su nick manualmente.</p></div>
        <div className="registration-capacity"><small>EQUIPOS INSCRITOS</small><strong>{meta.registered_teams}{meta.max_teams ? ` / ${meta.max_teams}` : ""}</strong><span>{meta.spots_left === null ? "Cupo abierto" : `${meta.spots_left} plazas disponibles`}</span></div>
      </header>

      {!user.minecraft_uuid || !user.minecraft_username ? <div className="registration-blocked"><strong>CUENTA SIN MINECRAFT VERIFICADO</strong><p>Vincula y verifica tu cuenta de Minecraft antes de inscribir un equipo.</p></div> : !meta.registration_open ? <div className="registration-blocked"><strong>INSCRIPCIONES CERRADAS</strong><p>El staff cerró el registro para este torneo.</p></div> : isFull ? <div className="registration-blocked"><strong>TORNEO COMPLETO</strong><p>Ya se alcanzó el máximo de equipos.</p></div> : (
        <form className="registration-form" onSubmit={submit}>
          {registration && <div className={`registration-status is-${registration.status}`}><small>ESTADO DE TU INSCRIPCIÓN</small><strong>{registration.status === "approved" ? "APROBADA" : registration.status === "rejected" ? "REQUIERE CAMBIOS" : "PENDIENTE DE REVISIÓN"}</strong></div>}
          <div className="registration-team-fields"><label>Nombre del equipo<input required minLength={2} maxLength={80} value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="Nombre del equipo" /></label><label>Tag corto <small>OPCIONAL</small><input minLength={2} maxLength={8} pattern="[A-Za-z0-9_-]+" value={teamTag} onChange={(event) => setTeamTag(event.target.value)} placeholder="KEKE" /></label></div>

          <div className="registration-roster-heading"><div><strong>ALINEACIÓN</strong><span>{meta.players_per_team} jugadores exactos</span></div><small>{slots.filter((slot) => slot.minecraft_username).length + 1} / {meta.players_per_team} COMPLETOS</small></div>
          <div className="registration-member is-captain"><span>01</span><img src={`https://mc-heads.net/avatar/${user.minecraft_uuid}/42.png`} alt="" width={42} height={42} /><div><strong>{user.minecraft_username}</strong><small>CAPITÁN · CUENTA VERIFICADA</small></div><b>VINCULADO</b></div>
          <div className="registration-member-list">{slots.map((slot, index) => <div className={`registration-member${slot.is_verified ? " is-verified" : ""}`} key={index}><span>{String(index + 2).padStart(2, "0")}</span>{slot.is_verified && slot.minecraft_uuid ? <img src={`https://mc-heads.net/avatar/${slot.minecraft_uuid}/42.png`} alt="" width={42} height={42} /> : <i aria-hidden="true">?</i>}<div>{slot.is_verified ? <><strong>{slot.minecraft_username}</strong><small>CUENTA REGISTRADA Y VERIFICADA</small></> : <><input required maxLength={16} pattern="[A-Za-z0-9_]+" value={slot.minecraft_username} onChange={(event) => setManualMember(index, event.target.value)} placeholder="Nick de Minecraft" aria-label={`Nick del integrante ${index + 2}`} /><small>INGRESO MANUAL</small></>}</div>{slot.is_verified ? <button type="button" onClick={() => setManualMember(index, "")}>DESVINCULAR</button> : <b>MANUAL</b>}</div>)}</div>

          <div className="registration-player-search"><label htmlFor="registration-player-search">Referenciar cuenta verificada</label><p>Busca entre usuarios que ya iniciaron sesión y tienen Minecraft verificado.</p><div><input id="registration-player-search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleSearchKeyDown} placeholder="Nick, Discord o UUID…" /><button type="button" onClick={() => void searchPlayers()} disabled={searching}>{searching ? "BUSCANDO…" : "BUSCAR"}</button></div>{results.length > 0 && <div className="registration-search-results">{results.map((player) => <div key={player.user_id}><img src={`https://mc-heads.net/avatar/${player.minecraft_uuid}/34.png`} alt="" width={34} height={34} /><div><strong>{player.minecraft_username}</strong><small>{player.discord_username ? `@${player.discord_username}` : "CUENTA VERIFICADA"}</small></div><button type="button" disabled={selectedUserIds.has(player.user_id)} onClick={() => referencePlayer(player)}>{selectedUserIds.has(player.user_id) ? "AÑADIDO" : "VINCULAR"}</button></div>)}</div>}</div>

          <label className="registration-notes">Notas para el staff <small>OPCIONAL</small><textarea maxLength={1000} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Disponibilidad, suplentes u otra información relevante…" /></label>
          {feedback && <p className="registration-feedback" role="status">{feedback}</p>}
          <button className="registration-submit" type="submit" disabled={saving}>{saving ? "GUARDANDO…" : registration ? "ACTUALIZAR INSCRIPCIÓN" : "ENVIAR INSCRIPCIÓN"}</button>
        </form>
      )}
    </section>
  );
}
