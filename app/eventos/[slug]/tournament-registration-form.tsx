"use client";
/* eslint-disable @next/next/no-img-element -- Minecraft avatar service uses dynamic UUID paths. */

import { FormEvent, useEffect, useMemo, useState } from "react";

type SessionUser = {
  name: string;
  discord_username: string | null;
  minecraft_uuid: string | null;
  minecraft_username: string | null;
};

type RegisteredPlayer = {
  user_id: number | null;
  minecraft_uuid: string;
  minecraft_username: string;
  discord_id: string;
  discord_username: string | null;
};

type RegistrationMember = {
  id?: number;
  user_id: number | null;
  discord_id: string | null;
  discord_username: string | null;
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
  discord_id: string | null;
  minecraft_uuid: string | null;
  minecraft_username: string;
  discord_username: string | null;
  is_verified: boolean;
};

const emptySlot = (): Slot => ({ user_id: null, discord_id: null, minecraft_uuid: null, minecraft_username: "", discord_username: null, is_verified: false });

function headUrl(uuid: string, size: number) {
  return `https://mc-heads.net/avatar/${uuid.replaceAll("-", "")}/${size}.png`;
}

function discordLabel(discordId: string | null, discordUsername: string | null) {
  return discordUsername ? `@${discordUsername}` : discordId ? `ID ${discordId}` : "";
}

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
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);
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
            discord_id: member.discord_id,
            minecraft_uuid: member.minecraft_uuid,
            minecraft_username: member.minecraft_username,
            discord_username: member.discord_username,
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

  const selectedUuids = useMemo(() => new Set(slots.map((slot) => slot.minecraft_uuid).filter(Boolean)), [slots]);
  const activeQuery = activeSearchIndex === null ? "" : (slots[activeSearchIndex]?.minecraft_username ?? "").trim();
  const activeVerified = activeSearchIndex === null ? false : Boolean(slots[activeSearchIndex]?.is_verified);

  useEffect(() => {
    if (activeSearchIndex === null || activeQuery.length < 2 || activeVerified) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/events/${encodeURIComponent(slug)}/registration-players?q=${encodeURIComponent(activeQuery)}`, {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(errorMessage(payload, "No se pudo buscar jugadores."));
        setResults(payload.data ?? []);
      } catch (reason) {
        if (!controller.signal.aborted) setFeedback(reason instanceof Error ? reason.message : "No se pudo buscar jugadores.");
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [activeQuery, activeSearchIndex, activeVerified, slug]);

  function referencePlayer(index: number, player: RegisteredPlayer) {
    setSlots((current) => current.map((slot, slotIndex) => slotIndex === index ? {
      user_id: player.user_id,
      discord_id: player.discord_id,
      minecraft_uuid: player.minecraft_uuid,
      minecraft_username: player.minecraft_username,
      discord_username: player.discord_username,
      is_verified: true,
    } : slot));
    setActiveSearchIndex(null);
    setResults([]);
    setSearching(false);
    setFeedback(`${player.minecraft_username} · ${discordLabel(player.discord_id, player.discord_username)} fue vinculado al equipo.`);
  }

  function setMemberQuery(index: number, minecraftUsername: string) {
    setSlots((current) => current.map((slot, slotIndex) => slotIndex === index ? {
      user_id: null,
      discord_id: null,
      minecraft_uuid: null,
      minecraft_username: minecraftUsername,
      discord_username: null,
      is_verified: false,
    } : slot));
    setActiveSearchIndex(index);
    setResults([]);
    setSearching(minecraftUsername.trim().length >= 2);
    setFeedback("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    if (slots.some((slot) => !slot.minecraft_uuid || !slot.discord_id || !slot.is_verified)) {
      setFeedback("Selecciona la cuenta vinculada de Minecraft y Discord para cada integrante.");
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
          members: slots.map((slot) => ({ minecraft_uuid: slot.minecraft_uuid })),
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
        <div><p className="eyebrow"><span>INSCRIPCIONES</span> EQUIPOS</p><h2>{registration ? "TU EQUIPO" : "INSCRIBE A TU EQUIPO"}</h2><p>El capitán cuenta como una plaza. Escribe el nick de Minecraft de cada integrante y selecciona su cuenta de Discord vinculada.</p></div>
        <div className="registration-capacity"><small>EQUIPOS INSCRITOS</small><strong>{meta.registered_teams}{meta.max_teams ? ` / ${meta.max_teams}` : ""}</strong><span>{meta.spots_left === null ? "Cupo abierto" : `${meta.spots_left} plazas disponibles`}</span></div>
      </header>

      {!user.minecraft_uuid || !user.minecraft_username ? <div className="registration-blocked"><strong>CUENTA SIN MINECRAFT VERIFICADO</strong><p>Vincula y verifica tu cuenta de Minecraft antes de inscribir un equipo.</p></div> : !meta.registration_open ? <div className="registration-blocked"><strong>INSCRIPCIONES CERRADAS</strong><p>El staff cerró el registro para este torneo.</p></div> : isFull ? <div className="registration-blocked"><strong>TORNEO COMPLETO</strong><p>Ya se alcanzó el máximo de equipos.</p></div> : (
        <form className="registration-form" onSubmit={submit}>
          {registration && <div className={`registration-status is-${registration.status}`}><small>ESTADO DE TU INSCRIPCIÓN</small><strong>{registration.status === "approved" ? "APROBADA" : registration.status === "rejected" ? "REQUIERE CAMBIOS" : "PENDIENTE DE REVISIÓN"}</strong></div>}
          <div className="registration-team-fields"><label>Nombre del equipo<input required minLength={2} maxLength={80} value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="Nombre del equipo" /></label><label>Tag corto <small>OPCIONAL</small><input minLength={2} maxLength={8} pattern="[A-Za-z0-9_-]+" value={teamTag} onChange={(event) => setTeamTag(event.target.value)} placeholder="KEKE" /></label></div>

          <div className="registration-roster-heading"><div><strong>ALINEACIÓN</strong><span>{meta.players_per_team} jugadores exactos</span></div><small>{slots.filter((slot) => slot.is_verified).length + 1} / {meta.players_per_team} VINCULADOS</small></div>
          <div className="registration-member is-captain">
            <span>01</span>
            <img src={headUrl(user.minecraft_uuid, 42)} alt={`Cabeza de ${user.minecraft_username}`} width={42} height={42} />
            <div><strong>{user.minecraft_username}</strong><small>{user.discord_username ? `DISCORD · @${user.discord_username}` : "CAPITÁN · CUENTA VERIFICADA"}</small></div>
            <b>VINCULADO</b>
          </div>
          <div className="registration-member-list">{slots.map((slot, index) => {
            const linkedDiscord = discordLabel(slot.discord_id, slot.discord_username);
            return <div className={`registration-member${slot.is_verified ? " is-verified" : ""}`} key={index}>
              <span>{String(index + 2).padStart(2, "0")}</span>
              {slot.minecraft_uuid ? <img src={headUrl(slot.minecraft_uuid, 42)} alt={`Cabeza de ${slot.minecraft_username}`} width={42} height={42} /> : <i aria-hidden="true">?</i>}
              <div className="registration-member-field">
                <label><small>MINECRAFT</small><input required autoComplete="off" maxLength={16} pattern="[A-Za-z0-9_]+" value={slot.minecraft_username} onFocus={() => { if (activeSearchIndex !== index && !slot.is_verified) { setActiveSearchIndex(index); setResults([]); } }} onChange={(event) => setMemberQuery(index, event.target.value)} placeholder="Nick de Minecraft" aria-label={`Nick del integrante ${index + 2}`} /></label>
                <label><small>DISCORD</small><input readOnly value={linkedDiscord} placeholder="Se autocompleta al seleccionar" aria-label={`Discord del integrante ${index + 2}`} /></label>
                {!slot.is_verified && searching && activeSearchIndex === index && <small>BUSCANDO EN RANKEDMINECRAFT…</small>}
                {activeSearchIndex === index && activeQuery.length >= 2 && !searching && <div className="registration-member-suggestions">{results.length ? results.map((player) => {
                  const alreadySelected = selectedUuids.has(player.minecraft_uuid);
                  return <button type="button" key={player.minecraft_uuid} disabled={alreadySelected} onClick={() => referencePlayer(index, player)}>
                    <img src={headUrl(player.minecraft_uuid, 34)} alt={`Cabeza de ${player.minecraft_username}`} width={34} height={34} />
                    <span><strong>{player.minecraft_username}</strong><small>Discord: {discordLabel(player.discord_id, player.discord_username)}</small></span>
                    <b>{alreadySelected ? "YA ESTÁ EN EL EQUIPO" : "SELECCIONAR"}</b>
                  </button>;
                }) : <p>NO SE ENCONTRÓ UN JUGADOR VERIFICADO CON DISCORD VINCULADO</p>}</div>}
              </div>
              {slot.is_verified && <button type="button" onClick={() => setMemberQuery(index, "")}>CAMBIAR</button>}
            </div>;
          })}</div>

          <label className="registration-notes">Notas para el staff <small>OPCIONAL</small><textarea maxLength={1000} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Disponibilidad, suplentes u otra información relevante…" /></label>
          {feedback && <p className="registration-feedback" role="status">{feedback}</p>}
          <button className="registration-submit" type="submit" disabled={saving}>{saving ? "GUARDANDO…" : registration ? "ACTUALIZAR INSCRIPCIÓN" : "ENVIAR INSCRIPCIÓN"}</button>
        </form>
      )}
    </section>
  );
}
