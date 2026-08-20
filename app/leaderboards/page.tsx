"use client";

import { useMemo, useState } from "react";
import { SiteFooter, SiteHeader } from "../components/site-chrome";

const players = [
  { position: 1, name: "KairoPvP", division: "RADIANT", elo: 2634, wins: 47, losses: 8, streak: 6 },
  { position: 2, name: "NexuZ", division: "IMMORTAL", elo: 2351, wins: 41, losses: 11, streak: 3 },
  { position: 3, name: "Asteria", division: "IMMORTAL", elo: 2196, wins: 38, losses: 9, streak: 4 },
  { position: 4, name: "FrostByte", division: "ASCENDANT", elo: 2077, wins: 35, losses: 14, streak: 2 },
  { position: 5, name: "Lunaris", division: "ASCENDANT", elo: 2041, wins: 32, losses: 13, streak: 1 },
  { position: 6, name: "Valken", division: "ASCENDANT", elo: 1898, wins: 29, losses: 12, streak: 0 },
  { position: 7, name: "MiloPvP", division: "DIAMOND", elo: 1754, wins: 27, losses: 15, streak: 2 },
  { position: 8, name: "Riven", division: "DIAMOND", elo: 1676, wins: 25, losses: 14, streak: 1 },
  { position: 9, name: "OnyxMC", division: "DIAMOND", elo: 1582, wins: 23, losses: 17, streak: 0 },
  { position: 10, name: "Sylver", division: "PLATINUM", elo: 1479, wins: 21, losses: 16, streak: 3 },
  { position: 11, name: "Kael", division: "PLATINUM", elo: 1335, wins: 20, losses: 18, streak: 1 },
  { position: 12, name: "NovaRush", division: "PLATINUM", elo: 1248, wins: 18, losses: 16, streak: 0 },
];

export default function LeaderboardsPage() {
  const [search, setSearch] = useState("");
  const filteredPlayers = useMemo(
    () => players.filter((player) => player.name.toLowerCase().includes(search.trim().toLowerCase())),
    [search],
  );

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
        <div className="leader-podium">
          {players.slice(0, 3).map((player) => (
            <article className={`podium-player podium-${player.position}`} key={player.name}>
              <span className="podium-position">{String(player.position).padStart(2, "0")}</span>
              <div className="podium-avatar">{player.name.slice(0, 1)}</div>
              <div><small>{player.division}</small><h2>{player.name}</h2><strong>{player.elo.toLocaleString("es-PE")} ELO</strong></div>
              <p>{player.wins} victorias · {player.losses} derrotas</p>
            </article>
          ))}
        </div>

        <div className="leaderboard-controls">
          <div><small>CLASIFICACIÓN</small><strong>TODOS LOS JUGADORES</strong></div>
          <label><span>MODALIDAD</span><select defaultValue="global"><option value="global">ELO GLOBAL</option><option value="1v1">1V1</option><option value="2v2">2V2</option><option value="4v4">4V4</option></select></label>
          <label><span>TEMPORADA</span><select defaultValue="s04"><option value="s04">TEMPORADA BETA</option></select></label>
          <label className="leaderboard-search"><span>BUSCAR JUGADOR</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre de Minecraft" /></label>
        </div>

        <div className="full-leaderboard" role="region" aria-label="Tabla completa de ELO" tabIndex={0}>
          <div className="full-leaderboard-head"><span>POS.</span><span>JUGADOR</span><span>DIVISIÓN</span><span>ELO</span><span>VICTORIAS</span><span>DERROTAS</span><span>WINRATE</span><span>RACHA</span></div>
          {filteredPlayers.map((player) => {
            const winrate = Math.round((player.wins / (player.wins + player.losses)) * 100);
            return (
              <article className="full-leaderboard-row" key={player.name}>
                <span className="elo-position">{String(player.position).padStart(3, "0")}</span>
                <div className="elo-player"><span>{player.name.slice(0, 1)}</span><strong>{player.name}</strong></div>
                <span className="elo-division">{player.division}</span>
                <strong className="elo-value">{player.elo.toLocaleString("es-PE")}</strong>
                <span>{player.wins}</span><span>{player.losses}</span><span>{winrate}%</span><span>{player.streak > 0 ? `${player.streak} W` : "—"}</span>
              </article>
            );
          })}
          {filteredPlayers.length === 0 && <div className="leaderboard-empty">NO SE ENCONTRÓ NINGÚN JUGADOR</div>}
        </div>

        <div className="leaderboard-total"><span>MOSTRANDO {filteredPlayers.length} REGISTROS DE EJEMPLO</span><strong>LA VERSIÓN CONECTADA MOSTRARÁ TODOS LOS REGISTROS EXISTENTES</strong></div>
      </section>
      <SiteFooter />
    </main>
  );
}
