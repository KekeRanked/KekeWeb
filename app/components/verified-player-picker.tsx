"use client";
/* eslint-disable @next/next/no-img-element -- Minecraft avatar service uses dynamic UUID paths. */

import Link from "next/link";
import { FormEvent, useState } from "react";

export type VerifiedPlayer = {
  minecraft_uuid: string;
  minecraft_username: string;
  discord_id: string | null;
  profile_url?: string;
};

type VerifiedPlayerPickerProps = {
  title: string;
  description: string;
  selected: VerifiedPlayer[];
  onChange: (players: VerifiedPlayer[]) => void;
  max?: number;
};

export function VerifiedPlayerPicker({ title, description, selected, onChange, max }: VerifiedPlayerPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VerifiedPlayer[]>([]);
  const [feedback, setFeedback] = useState("");
  const [searching, setSearching] = useState(false);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = query.trim();
    if (term.length < 2) {
      setFeedback("Escribe al menos 2 caracteres.");
      return;
    }

    setSearching(true);
    setFeedback("");
    try {
      const response = await fetch(`/api/admin/event-players?q=${encodeURIComponent(term)}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("No se pudo buscar en las cuentas verificadas.");
      const payload = await response.json();
      setResults(payload.data ?? []);
      if (!(payload.data ?? []).length) setFeedback("No se encontraron cuentas verificadas.");
    } catch (reason) {
      setFeedback(reason instanceof Error ? reason.message : "No se pudo realizar la búsqueda.");
    } finally {
      setSearching(false);
    }
  }

  function add(player: VerifiedPlayer) {
    if (selected.some((item) => item.minecraft_uuid === player.minecraft_uuid)) return;
    onChange(max === 1 ? [player] : [...selected, player]);
  }

  function remove(uuid: string) {
    onChange(selected.filter((player) => player.minecraft_uuid !== uuid));
  }

  return (
    <section className="verified-player-picker">
      <div className="player-picker-heading"><div><strong>{title}</strong><span>{description}</span></div><small>{selected.length}{max ? ` / ${max}` : ""} SELECCIONADOS</small></div>
      {selected.length > 0 && <div className="selected-player-list">{selected.map((player) => <div className="selected-player" key={player.minecraft_uuid}><img src={`https://mc-heads.net/avatar/${player.minecraft_uuid}/36.png`} alt="" width={36} height={36} /><div><Link href={`/players/${encodeURIComponent(player.minecraft_username)}`} target="_blank">{player.minecraft_username}</Link><small>CUENTA VERIFICADA</small></div><button type="button" onClick={() => remove(player.minecraft_uuid)} aria-label={`Quitar a ${player.minecraft_username}`}>×</button></div>)}</div>}
      <form className="player-search" onSubmit={search}><label htmlFor={`${title.replace(/\s+/g, "-").toLowerCase()}-search`}>Buscar por nick, Discord o UUID</label><div><input id={`${title.replace(/\s+/g, "-").toLowerCase()}-search`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre de Minecraft…" /><button type="submit" disabled={searching}>{searching ? "BUSCANDO…" : "BUSCAR"}</button></div></form>
      {feedback && <p className="picker-feedback" role="status">{feedback}</p>}
      {results.length > 0 && <div className="player-search-results">{results.map((player) => { const isSelected = selected.some((item) => item.minecraft_uuid === player.minecraft_uuid); return <div key={player.minecraft_uuid}><img src={`https://mc-heads.net/avatar/${player.minecraft_uuid}/32.png`} alt="" width={32} height={32} /><div><strong>{player.minecraft_username}</strong><small>{player.discord_id ? `Discord ${player.discord_id}` : "CUENTA VERIFICADA"}</small></div><button type="button" disabled={isSelected} onClick={() => add(player)}>{isSelected ? "AÑADIDO" : max === 1 && selected.length ? "REEMPLAZAR" : "AÑADIR"}</button></div>; })}</div>}
    </section>
  );
}
