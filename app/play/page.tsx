"use client";

import { useState } from "react";
import { SiteFooter, SiteHeader } from "../components/site-chrome";

const matchServers = [
  {
    id: "ranked-01", server: "RANKED 01", status: "EN PARTIDA", mode: "2V2", map: "Citadel", elapsed: "08:42",
    teamA: { name: "EQUIPO ÁMBAR", players: ["KairoPvP", "NexuZ"], score: 3 },
    teamB: { name: "EQUIPO ACERO", players: ["Asteria", "FrostByte"], score: 2 },
    observers: ["Valken", "MiloPvP"],
  },
  {
    id: "ranked-02", server: "RANKED 02", status: "EN PARTIDA", mode: "1V1", map: "Foundry", elapsed: "04:16",
    teamA: { name: "JUGADOR A", players: ["Lunaris"], score: 1 },
    teamB: { name: "JUGADOR B", players: ["Riven"], score: 1 },
    observers: ["KekeAdmin"],
  },
  {
    id: "ranked-03", server: "RANKED 03", status: "DISPONIBLE", mode: "—", map: "Sin arena", elapsed: "00:00",
    teamA: { name: "EQUIPO A", players: [], score: 0 },
    teamB: { name: "EQUIPO B", players: [], score: 0 },
    observers: [],
  },
];

const matchHistory = [
  { id: "#BETA-01842", server: "RANKED 03", mode: "4V4", map: "Overgrown", teamA: "Onyx", score: "3 — 1", teamB: "North", duration: "14:28", ended: "HACE 6 MIN" },
  { id: "#BETA-01841", server: "RANKED 01", mode: "1V1", map: "Citadel", teamA: "Sylver", score: "2 — 0", teamB: "Kael", duration: "06:12", ended: "HACE 14 MIN" },
  { id: "#BETA-01840", server: "RANKED 02", mode: "2V2", map: "Foundry", teamA: "Nova / Milo", score: "1 — 3", teamB: "Luna / Riven", duration: "11:47", ended: "HACE 22 MIN" },
  { id: "#BETA-01839", server: "RANKED 03", mode: "1V1", map: "Overgrown", teamA: "Valken", score: "2 — 1", teamB: "FrostByte", duration: "08:55", ended: "HACE 31 MIN" },
  { id: "#BETA-01838", server: "RANKED 01", mode: "4V4", map: "Citadel", teamA: "Astra", score: "0 — 3", teamB: "Obsidian", duration: "15:03", ended: "HACE 45 MIN" },
];

export default function PlayPage() {
  const [selectedServerId, setSelectedServerId] = useState(matchServers[0].id);
  const selectedServer = matchServers.find((server) => server.id === selectedServerId) ?? matchServers[0];
  const hasMatch = selectedServer.status === "EN PARTIDA";

  return (
    <main>
      <SiteHeader active="play" />
      <section className="portal-hero play-hero">
        <div className="portal-hero-grid" aria-hidden="true" />
        <div><p className="eyebrow"><span>PARTIDAS EN TIEMPO REAL</span> TRES SERVIDORES RANKED</p><h1>MIRA QUIÉN JUEGA.<br /><em>Y DÓNDE.</em></h1></div>
        <p>Estado de cada servidor, jugadores dentro de la arena, observadores conectados e historial reciente.</p>
      </section>

      <section className="play-section">
        <div className="match-server-selector">
          {matchServers.map((server) => (
            <button className={selectedServer.id === server.id ? "match-server-card is-selected" : "match-server-card"} key={server.id} type="button" onClick={() => setSelectedServerId(server.id)}>
              <div><span className={server.status === "EN PARTIDA" ? "server-status is-live" : "server-status"}>{server.status}</span><small>{server.server}</small></div>
              <strong>{server.mode}</strong><p>{server.map}</p><time>{server.elapsed}</time>
            </button>
          ))}
        </div>

        <section className="current-match" aria-live="polite">
          <div className="current-match-head"><div><span className={hasMatch ? "live-indicator" : "ready-indicator"} /> <strong>{selectedServer.server}</strong></div><small>{hasMatch ? `${selectedServer.map} · ${selectedServer.mode}` : "ESPERANDO UNA NUEVA PARTIDA"}</small><time>{selectedServer.elapsed}</time></div>
          {hasMatch ? (
            <div className="match-stage">
              <div className="match-team team-a"><div className="team-label"><span>A</span><small>{selectedServer.teamA.name}</small></div>{selectedServer.teamA.players.map((player) => <div className="match-player" key={player}><span>{player.slice(0, 1)}</span><strong>{player}</strong><small>JUGANDO</small></div>)}</div>
              <div className="match-score"><small>MARCADOR ACTUAL</small><strong><span>{selectedServer.teamA.score}</span><i>—</i><span>{selectedServer.teamB.score}</span></strong><p>{selectedServer.elapsed}</p></div>
              <div className="match-team team-b"><div className="team-label"><span>B</span><small>{selectedServer.teamB.name}</small></div>{selectedServer.teamB.players.map((player) => <div className="match-player" key={player}><span>{player.slice(0, 1)}</span><strong>{player}</strong><small>JUGANDO</small></div>)}</div>
            </div>
          ) : <div className="empty-match"><strong>SERVIDOR DISPONIBLE</strong><p>Este servidor está preparado para recibir la siguiente partida del matchmaking.</p></div>}

          <div className="observer-strip"><div><small>OBSERVADORES</small><strong>{selectedServer.observers.length} EN OBS</strong></div>{selectedServer.observers.length > 0 ? <div className="observer-list">{selectedServer.observers.map((observer) => <span key={observer}>{observer}</span>)}</div> : <p>NO HAY OBSERVADORES CONECTADOS</p>}</div>
        </section>

        <div className="history-heading"><div><p className="eyebrow"><span>REGISTRO GLOBAL</span> LOS TRES SERVIDORES</p><h2>HISTORIAL DE PARTIDAS</h2></div><p>Cada resultado indica en qué servidor se disputó para poder revisar toda la actividad de la red.</p></div>
        <div className="match-history" role="region" aria-label="Historial de partidas del servidor" tabIndex={0}>
          <div className="match-history-head"><span>PARTIDA</span><span>SERVIDOR</span><span>MODO</span><span>MAPA</span><span>EQUIPO A</span><span>RESULTADO</span><span>EQUIPO B</span><span>DURACIÓN</span><span>FINALIZÓ</span></div>
          {matchHistory.map((match) => <article className="match-history-row" key={match.id}><strong>{match.id}</strong><span>{match.server}</span><span className="history-mode">{match.mode}</span><span>{match.map}</span><span>{match.teamA}</span><strong className="history-score">{match.score}</strong><span>{match.teamB}</span><time>{match.duration}</time><small>{match.ended}</small></article>)}
        </div>
        <button className="history-load" type="button">CARGAR MÁS PARTIDAS</button>
      </section>
      <SiteFooter />
    </main>
  );
}
