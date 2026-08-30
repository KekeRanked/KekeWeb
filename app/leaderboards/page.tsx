"use client";

import { useEffect, useState } from "react";
import { SiteFooter, SiteHeader } from "../components/site-chrome";
import { rankForElo } from "../lib/ranks";

type RankedPlayer = {
  rank_position: number;
  minecraft_uuid: string;
  minecraft_username: string;
  rating_key: string;
  elo: number;
  mmr: number;
  wins: number;
  losses: number;
  games_played: number;
  total_kills: number;
  total_deaths: number;
  is_in_placement: number;
  placement_matches_played: number;
};

type LeaderboardResponse = {
  data: RankedPlayer[];
  podium: RankedPlayer[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
};

const modes = [
  { key: "ranked_5v5_ctw", label: "5V5 CTW" },
  { key: "ranked_5v5", label: "5V5" },
  { key: "ranked_8v8", label: "8V8" },
] as const;

function divisionFor(player: RankedPlayer) {
  if (Number(player.is_in_placement) === 1) return "EN EVALUACIÓN";
  return rankForElo(Number(player.elo));
}

function headUrl(player: RankedPlayer, size: number) {
  return `https://mc-heads.net/avatar/${player.minecraft_uuid}/${size}.png`;
}

export default function LeaderboardsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [ratingKey, setRatingKey] = useState("ranked_5v5_ctw");
  const [page, setPage] = useState(1);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      rating_key: ratingKey,
      per_page: "25",
      page: String(page),
    });
    if (debouncedSearch) params.set("search", debouncedSearch);

    setLoading(true);
    setError(false);
    fetch(`/api/ranked/leaderboards?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Leaderboard unavailable");
        return response.json();
      })
      .then((payload: LeaderboardResponse) => setLeaderboard(payload))
      .catch((reason) => {
        if (reason?.name !== "AbortError") setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [debouncedSearch, page, ratingKey, requestVersion]);

  const players = leaderboard?.data ?? [];
  const podium = leaderboard?.podium ?? [];
  const selectedMode = modes.find((mode) => mode.key === ratingKey)?.label ?? "RANKED";

  return (
    <main>
      <SiteHeader active="leaderboards" />
      <section className="portal-hero leaderboard-portal-hero">
        <div className="portal-hero-grid" aria-hidden="true" />
        <div>
          <p className="eyebrow"><span>TEMPORADA BETA</span> CLASIFICACIÓN POR ELO</p>
          <h1>CADA PUESTO.<br /><em>CADA JUGADOR.</em></h1>
        </div>
        <p>La tabla completa del servidor, ordenada desde el mayor ELO hasta el último jugador clasificado.</p>
      </section>

      <section className="full-leaderboard-section">
        <div className="leader-podium" aria-label={`Podio de ${selectedMode}`}>
          {podium.map((player) => (
            <a className={`podium-player podium-${player.rank_position}`} href={`/players/${encodeURIComponent(player.minecraft_username)}`} key={player.minecraft_uuid}>
              <span className="podium-position">{String(player.rank_position).padStart(2, "0")}</span>
              <img className="podium-avatar" src={headUrl(player, 96)} alt={`Cabeza de ${player.minecraft_username}`} />
              <div><small>{divisionFor(player)}</small><h2>{player.minecraft_username}</h2><strong>{Number(player.elo).toLocaleString("es-PE")} ELO</strong></div>
              <p>{Number(player.wins)} victorias · {Number(player.losses)} derrotas</p>
            </a>
          ))}
          {loading && podium.length === 0 && <div className="leaderboard-podium-status">CARGANDO PODIO</div>}
        </div>

        <div className="leaderboard-controls">
          <div><small>CLASIFICACIÓN</small><strong>{leaderboard?.total ?? "—"} JUGADORES</strong></div>
          <label><span>MODALIDAD</span><select value={ratingKey} onChange={(event) => { setRatingKey(event.target.value); setPage(1); }}>
            {modes.map((mode) => <option value={mode.key} key={mode.key}>{mode.label}</option>)}
          </select></label>
          <label><span>TEMPORADA</span><select defaultValue="beta"><option value="beta">TEMPORADA BETA</option></select></label>
          <label className="leaderboard-search"><span>BUSCAR JUGADOR</span><input value={search} onChange={(event) => setSearch(event.target.value.replace(/[^A-Za-z0-9_]/g, "").slice(0, 16))} placeholder="Nombre de Minecraft" /></label>
        </div>

        <div className="full-leaderboard" role="region" aria-label={`Tabla completa de ELO ${selectedMode}`} tabIndex={0} aria-busy={loading}>
          <div className="full-leaderboard-head"><span>POS.</span><span>JUGADOR</span><span>DIVISIÓN</span><span>ELO</span><span>VICTORIAS</span><span>DERROTAS</span><span>WINRATE</span><span>PARTIDAS</span></div>
          {!loading && !error && players.map((player) => {
            const games = Number(player.wins) + Number(player.losses);
            const winrate = games > 0 ? Math.round((Number(player.wins) / games) * 100) : 0;
            return (
              <a className="full-leaderboard-row" href={`/players/${encodeURIComponent(player.minecraft_username)}`} key={`${player.rating_key}-${player.minecraft_uuid}`}>
                <span className="elo-position">{String(player.rank_position).padStart(3, "0")}</span>
                <div className="elo-player"><img src={headUrl(player, 48)} alt="" aria-hidden="true" /><strong>{player.minecraft_username}</strong></div>
                <span className="elo-division">{divisionFor(player)}</span>
                <strong className="elo-value">{Number(player.elo).toLocaleString("es-PE")}</strong>
                <span>{Number(player.wins)}</span><span>{Number(player.losses)}</span><span>{winrate}%</span><span>{Number(player.games_played)}</span>
              </a>
            );
          })}
          {loading && <div className="leaderboard-empty" aria-live="polite">ACTUALIZANDO CLASIFICACIÓN</div>}
          {error && <div className="leaderboard-empty leaderboard-error" role="alert"><span>NO SE PUDO CARGAR LA CLASIFICACIÓN</span><button type="button" onClick={() => setRequestVersion((value) => value + 1)}>REINTENTAR</button></div>}
          {!loading && !error && players.length === 0 && <div className="leaderboard-empty">NO SE ENCONTRÓ NINGÚN JUGADOR</div>}
        </div>

        <div className="leaderboard-pagination">
          <span>{leaderboard?.from ?? 0}–{leaderboard?.to ?? 0} DE {leaderboard?.total ?? 0} · {selectedMode}</span>
          <div>
            <button type="button" disabled={loading || page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>ANTERIOR</button>
            <strong>PÁGINA {leaderboard?.current_page ?? page} / {leaderboard?.last_page ?? 1}</strong>
            <button type="button" disabled={loading || page >= (leaderboard?.last_page ?? 1)} onClick={() => setPage((value) => value + 1)}>SIGUIENTE</button>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
