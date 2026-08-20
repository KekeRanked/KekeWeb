"use client";

import { useState } from "react";
import { SiteFooter, SiteHeader } from "./components/site-chrome";

const leaderboard = [
  { position: 1, name: "KairoPvP", rank: "RADIANT", rating: 2634, record: "47–8" },
  { position: 2, name: "NexuZ", rank: "IMMORTAL", rating: 2351, record: "41–11" },
  { position: 3, name: "Asteria", rank: "IMMORTAL", rating: 2196, record: "38–9" },
  { position: 4, name: "FrostByte", rank: "ASCENDANT", rating: 2077, record: "35–14" },
];

const liveMatches = [
  { map: "Citadel", mode: "2v2", score: "3 — 2", time: "08:42" },
  { map: "Foundry", mode: "1v1", score: "1 — 1", time: "04:16" },
  { map: "Overgrown", mode: "4v4", score: "2 — 0", time: "12:03" },
];

export default function Home() {
  const [copied, setCopied] = useState(false);

  async function copyServerAddress() {
    await navigator.clipboard.writeText("keke.live");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main>
      <SiteHeader active="inicio" />

      <section className="hero" id="inicio">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-copy">
          <p className="eyebrow"><span>BETA</span> COMPITE · ESCALA · DOMINA</p>
          <h1>
            TU PARTIDA.<br />
            <em>TU RANGO.</em>
          </h1>
          <p className="hero-description">
            Un competitivo de Minecraft construido alrededor de partidas justas,
            rankings transparentes y una comunidad que viene a mejorar.
          </p>

          <div className="hero-actions">
            <button className="server-address" type="button" onClick={copyServerAddress}>
              <span>
                <small>JAVA 1.21+</small>
                <strong>KEKE.LIVE</strong>
              </span>
              <span className="copy-icon">{copied ? "COPIADA" : "COPIAR"}</span>
            </button>
            <a className="secondary-action" href="/leaderboards">Ver clasificación</a>
          </div>

          <div className="server-metrics" aria-label="Estado del servidor">
            <div><strong>1,284</strong><span>Jugadores online</span></div>
            <div><strong>24 ms</strong><span>Latencia promedio</span></div>
            <div><strong>99.9%</strong><span>Disponibilidad</span></div>
          </div>
        </div>

        <div className="hero-visual" aria-label="Tu progreso competitivo">
          <img className="hero-brand-watermark" src="/server-logo.png" alt="" aria-hidden="true" />
          <div className="rank-orbit orbit-one" />
          <div className="rank-orbit orbit-two" />
          <div className="rank-card">
            <div className="rank-card-top">
              <span>RANGO ACTUAL</span>
              <span className="live-label">EN VIVO</span>
            </div>
            <div className="rank-emblem">
              <span className="emblem-corner corner-one" />
              <span className="emblem-corner corner-two" />
              <span className="emblem-corner corner-three" />
              <span className="emblem-corner corner-four" />
            </div>
            <div className="rank-name">ASCENDANT</div>
            <div className="rating-row">
              <span>1,950 ELO</span>
              <span>+28</span>
            </div>
            <div className="progress-track"><span /></div>
            <div className="progress-copy"><span>200 puntos para IMMORTAL</span><span>78%</span></div>
          </div>

          <div className="floating-tag tag-win"><small>ÚLTIMA PARTIDA</small><strong>VICTORIA +28</strong></div>
          <div className="floating-tag tag-streak"><small>RACHA ACTUAL</small><strong>5 PARTIDAS</strong></div>
        </div>
      </section>

      <section className="live-strip" id="partidas" aria-label="Partidas en curso">
        <div className="strip-title">
          <span className="pulse-dot" aria-hidden="true" />
          PARTIDAS EN CURSO
        </div>
        <div className="match-ticker">
          {liveMatches.map((match) => (
            <div className="ticker-match" key={match.map}>
              <span>{match.mode}</span>
              <strong>{match.map}</strong>
              <b>{match.score}</b>
              <time>{match.time}</time>
            </div>
          ))}
        </div>
        <a href="/play">Ver todas</a>
      </section>

      <section className="content-section" id="ranking">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><span>TOP 100</span> CLASIFICACIÓN GLOBAL</p>
            <h2>LOS MEJORES<br />NO SE ESCONDEN.</h2>
          </div>
          <p>La tabla se actualiza después de cada partida competitiva. Sin atajos, sin rangos comprados.</p>
        </div>

        <div className="leaderboard-wrap">
          <div className="leaderboard-head">
            <span>#</span><span>Jugador</span><span>División</span><span>Rating</span><span>V / D</span>
          </div>
          {leaderboard.map((player) => (
            <article className="leaderboard-row" key={player.position}>
              <span className="position">{String(player.position).padStart(2, "0")}</span>
              <div className="player-identity">
                <span className={`player-avatar avatar-${player.position}`}>{player.name.slice(0, 1)}</span>
                <strong>{player.name}</strong>
              </div>
              <span className="rank-pill">{player.rank}</span>
              <strong className="rating">{player.rating.toLocaleString("es-PE")}</strong>
              <span className="record">{player.record}</span>
            </article>
          ))}
          <a className="table-action" href="/leaderboards">EXPLORAR CLASIFICACIÓN COMPLETA</a>
        </div>
      </section>

      <section className="editorial-grid" id="torneos">
        <article className="tournament-card">
          <div className="card-kicker"><span>PRÓXIMO EVENTO</span><time>POR ANUNCIAR</time></div>
          <div className="trophy-mark" aria-hidden="true">BETA</div>
          <div className="tournament-copy">
            <p>TORNEO OFICIAL</p>
            <h2>PRIMER<br />TORNEO</h2>
            <div className="prize"><small>DETALLES</small><strong>PRÓXIMAMENTE</strong></div>
            <a className="tournament-action" href="/eventos">VER CALENDARIO DE EVENTOS</a>
          </div>
        </article>

        <article className="news-card">
          <div className="news-art" aria-hidden="true">
            <span className="news-block block-a" />
            <span className="news-block block-b" />
            <span className="news-block block-c" />
            <span className="news-number">BETA</span>
          </div>
          <div className="news-copy">
            <div className="card-kicker"><span>ACTUALIZACIÓN</span><time>LANZAMIENTO</time></div>
            <h3>Comienza la Temporada Beta: construyendo el competitivo</h3>
            <p>Nuevas divisiones, mapas renovados y recompensas que distinguen habilidad de constancia.</p>
            <a href="/news">LEER NEWS COMPLETA</a>
          </div>
        </article>
      </section>

      <section className="server-hub" aria-labelledby="server-hub-title">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow"><span>CENTRO DEL SERVIDOR</span> INFORMACIÓN OFICIAL</p>
            <h2 id="server-hub-title">TODO EN UN<br />SOLO LUGAR.</h2>
          </div>
          <p>Consulta cambios importantes, normas vigentes y el calendario competitivo sin depender de mensajes perdidos.</p>
        </div>
        <div className="hub-grid">
          <a className="hub-card" href="/news">
            <span className="hub-index">01</span>
            <div><small>INFORMACIÓN OFICIAL</small><h3>NEWS</h3><p>Mantenimientos, cambios de temporada y anuncios del servidor.</p></div>
            <strong>VER PUBLICACIONES</strong>
          </a>
          <a className="hub-card" href="/reglas">
            <span className="hub-index">02</span>
            <div><small>MINECRAFT Y DISCORD</small><h3>Reglamento</h3><p>Normas separadas por plataforma, con sanciones y fecha de actualización.</p></div>
            <strong>CONSULTAR REGLAS</strong>
          </a>
          <a className="hub-card" href="/eventos">
            <span className="hub-index">03</span>
            <div><small>TORNEOS Y DRAFTS</small><h3>Eventos</h3><p>Fechas, formatos, requisitos, cupos disponibles y resultados.</p></div>
            <strong>VER CALENDARIO</strong>
          </a>
        </div>
        <div className="staff-entry">
          <div><small>ACCESO RESTRINGIDO</small><strong>¿Eres parte del staff?</strong><span>Administra NEWS, reglas y eventos desde un panel central.</span></div>
          <a href="/staff/contenido">ABRIR PANEL DE CONTENIDO</a>
        </div>
      </section>

      <section className="community-cta" id="comunidad">
        <p className="eyebrow"><span>+18K MIEMBROS</span> LA COMUNIDAD TE ESPERA</p>
        <h2>LAS MEJORES PARTIDAS<br /><em>EMPIEZAN EN EQUIPO.</em></h2>
        <p>Encuentra compañeros, participa en eventos y mantente al día con cada actualización.</p>
        <button type="button">UNIRME AL DISCORD</button>
      </section>

      <SiteFooter />
    </main>
  );
}
