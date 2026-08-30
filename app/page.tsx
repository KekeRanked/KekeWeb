"use client";

import { useEffect, useState } from "react";
import { SiteFooter, SiteHeader } from "./components/site-chrome";
import { nextRankThreshold, rankForElo, rankProgress } from "./lib/ranks";

type RankedPlayer = { rank_position: number; minecraft_uuid: string; minecraft_username: string; elo: number; wins: number; losses: number; is_in_placement: number };
type LeaderboardResponse = { data: RankedPlayer[] };
type LiveMatch = { match_id: string; queue_key: string; map_name: string | null; phase: string; started_at: string | null };
type MatchServer = { server_key: string; name: string; status: string; player_count: number; matches: LiveMatch[]; last_seen_at: string | null };
type RecentMatch = { match_id: string; map_name: string; match_type: string; winner_team: string; end_time: string };
function division(elo: number) { return rankForElo(elo); }
function head(uuid: string, size: number) { return `https://mc-heads.net/avatar/${uuid}/${size}.png`; }
function elapsed(startedAt: string | null, now = Date.now()) { if (!startedAt) return "—"; const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000)); return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; }

export default function Home() {
  const [copied, setCopied] = useState(false), [leaderboard, setLeaderboard] = useState<RankedPlayer[]>([]), [servers, setServers] = useState<MatchServer[]>([]), [latest, setLatest] = useState<RecentMatch | null>(null), [now, setNow] = useState(() => Date.now()), [dataError, setDataError] = useState(false);
  useEffect(() => { const load = async () => { try { const [leaderboardResponse, serversResponse, matchesResponse] = await Promise.all([fetch("/api/ranked/leaderboards?per_page=4", { cache: "no-store" }), fetch("/api/ranked/servers", { cache: "no-store" }), fetch("/api/ranked/matches?per_page=1", { cache: "no-store" })]); if (!leaderboardResponse.ok || !serversResponse.ok || !matchesResponse.ok) throw new Error("API"); const leaderboardPayload = await leaderboardResponse.json() as LeaderboardResponse, serversPayload = await serversResponse.json() as { data: MatchServer[] }, matchesPayload = await matchesResponse.json() as { data: RecentMatch[] }; setLeaderboard(leaderboardPayload.data ?? []); setServers(serversPayload.data ?? []); setLatest(matchesPayload.data?.[0] ?? null); setDataError(false); } catch { setDataError(true); } }; void load(); const refresh = window.setInterval(() => void load(), 15000), clock = window.setInterval(() => setNow(Date.now()), 1000); return () => { window.clearInterval(refresh); window.clearInterval(clock); }; }, []);
  const onlineServers = servers.filter((server) => server.status !== "offline"), onlinePlayers = servers.reduce((total, server) => total + Number(server.player_count ?? 0), 0), topPlayer = leaderboard[0], liveMatches = servers.flatMap((server) => (server.matches ?? []).slice(0, 1).map((match) => ({ ...match, server: server.name }))).slice(0, 3), nextThreshold = topPlayer ? nextRankThreshold(Number(topPlayer.elo)) : null, progress = topPlayer ? rankProgress(Number(topPlayer.elo)) : 0;

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
            <div><strong>{onlinePlayers.toLocaleString("es-PE")}</strong><span>Jugadores online</span></div>
            <div><strong>{onlineServers.length} / {servers.length || 3}</strong><span>Servidores en línea</span></div>
            <div><strong>{dataError ? "—" : "EN VIVO"}</strong><span>Estado de la red</span></div>
          </div>
        </div>

        <div className="hero-visual" aria-label="Tu progreso competitivo">
          <img className="hero-brand-watermark" src="/server-logo.png" alt="" aria-hidden="true" />
          <div className="rank-orbit orbit-one" />
          <div className="rank-orbit orbit-two" />
          <div className="rank-card">
            <div className="rank-card-top">
              <span>MEJOR ELO ACTUAL</span>
              <span className="live-label">EN VIVO</span>
            </div>
            <div className="rank-emblem">
              <span className="emblem-corner corner-one" />
              <span className="emblem-corner corner-two" />
              <span className="emblem-corner corner-three" />
              <span className="emblem-corner corner-four" />
            </div>
            <div className="rank-name">{topPlayer ? division(Number(topPlayer.elo)) : "SIN DATOS"}</div>
            <div className="rating-row">
              <span>{topPlayer ? `${Number(topPlayer.elo).toLocaleString("es-PE")} ELO` : "—"}</span>
              <span>{topPlayer ? topPlayer.minecraft_username : "—"}</span>
            </div>
            <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
            <div className="progress-copy"><span>{topPlayer ? nextThreshold === null ? "Rango máximo alcanzado" : `${Math.max(0, nextThreshold - Number(topPlayer.elo))} puntos para ${division(nextThreshold)}` : "Sin clasificación disponible"}</span><span>{topPlayer ? `${Math.round(progress)}%` : "—"}</span></div>
          </div>

          <div className="floating-tag tag-win"><small>ÚLTIMA PARTIDA</small><strong>{latest ? `${latest.map_name} · ${latest.winner_team.toUpperCase()} GANA` : "SIN REGISTRO"}</strong></div>
          <div className="floating-tag tag-streak"><small>RED EN VIVO</small><strong>{onlineServers.length} SERVIDORES</strong></div>
        </div>
      </section>

      <section className="live-strip" id="partidas" aria-label="Partidas en curso">
        <div className="strip-title">
          <span className="pulse-dot" aria-hidden="true" />
          PARTIDAS EN CURSO
        </div>
        <div className="match-ticker">
          {liveMatches.length ? liveMatches.map((match) => (
            <div className="ticker-match" key={match.match_id}>
              <span>{match.queue_key.replaceAll("_", " ").toUpperCase()}</span>
              <strong>{match.map_name ?? "SIN MAPA"}</strong>
              <b>{match.server}</b>
              <time>{elapsed(match.started_at, now)}</time>
            </div>
          )) : <div className="ticker-empty">NO HAY PARTIDAS EN CURSO</div>}
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
            <a className="leaderboard-row" href={`/players/${encodeURIComponent(player.minecraft_username)}`} key={player.minecraft_uuid}>
              <span className="position">{String(player.rank_position).padStart(2, "0")}</span>
              <div className="player-identity">
                <img className="player-avatar" src={head(player.minecraft_uuid, 38)} alt="" /><strong>{player.minecraft_username}</strong>
              </div>
              <span className="rank-pill">{division(Number(player.elo))}</span>
              <strong className="rating">{Number(player.elo).toLocaleString("es-PE")}</strong>
              <span className="record">{player.wins}–{player.losses}</span>
            </a>
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
