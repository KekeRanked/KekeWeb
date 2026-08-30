"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteFooter, SiteHeader } from "../../components/site-chrome";

type MatchPlayer = { minecraft_uuid: string; minecraft_username: string; team: string; won: boolean; kills: number; deaths: number; damage_dealt: number; damage_received: number; arrows_shot: number; arrows_hit: number; old_elo: number; new_elo: number; elo_change: number };
type MatchDetail = { match_id: string; match_type: string; map_name: string; winner_team: string; duration_seconds: number; start_time: string | null; end_time: string | null; server_key: string | null; players: MatchPlayer[] };

function duration(seconds: number) { const minutes = Math.floor(Math.max(0, seconds) / 60); return `${String(minutes).padStart(2, "0")}:${String(Math.max(0, seconds) % 60).padStart(2, "0")}`; }
function dateTime(value: string | null) { return value ? new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" }).format(new Date(value)) : "—"; }
function serverName(key: string | null) { return key ? key.replace("ranked-", "RANKED 0") : "SIN REGISTRO"; }
function head(uuid: string) { return `https://mc-heads.net/avatar/${uuid}/56.png`; }

export default function MatchDetailClient({ matchId }: { matchId: string }) {
  const [match, setMatch] = useState<MatchDetail | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState("");
  useEffect(() => { const controller = new AbortController(); fetch(`/api/ranked/matches/${encodeURIComponent(matchId)}`, { cache: "no-store", signal: controller.signal }).then((response) => { if (!response.ok) throw new Error(response.status === 404 ? "La partida no existe." : "No se pudo cargar la partida."); return response.json(); }).then((payload) => { setMatch(payload.data); setError(""); }).catch((reason) => { if (reason?.name !== "AbortError") setError(reason instanceof Error ? reason.message : "No se pudo cargar la partida."); }).finally(() => setLoading(false)); return () => controller.abort(); }, [matchId]);
  const blue = useMemo(() => match?.players.filter((player) => player.team === "blue") ?? [], [match]), red = useMemo(() => match?.players.filter((player) => player.team === "red") ?? [], [match]);

  return <main><SiteHeader active="play" /><section className="portal-hero match-detail-hero"><div className="portal-hero-grid" aria-hidden="true" /><div><p className="eyebrow"><span>PARTIDA FINALIZADA</span> {match?.match_id ?? matchId}</p><h1>{match?.map_name ?? (loading ? "CARGANDO…" : "PARTIDA")}<br /><em>{match?.match_type?.toUpperCase() ?? "DETALLE"}</em></h1></div><p>Resultado, participantes y rendimiento individual registrado por el servidor.</p></section>
    <section className="detail-section"><a className="detail-back" href="/play">← VOLVER A PLAY</a>{error && <div className="detail-state" role="alert"><strong>NO SE PUDO ABRIR LA PARTIDA</strong><p>{error}</p></div>}{loading && <div className="detail-state">CARGANDO PARTIDA</div>}{match && <><div className="match-detail-facts"><div><small>RESULTADO</small><strong>{match.winner_team.toUpperCase()} GANA</strong></div><div><small>SERVIDOR</small><strong>{serverName(match.server_key)}</strong></div><div><small>DURACIÓN</small><strong>{duration(match.duration_seconds)}</strong></div><div><small>FINALIZÓ</small><strong>{dateTime(match.end_time)}</strong></div></div><div className="match-detail-board"><TeamPanel name="EQUIPO AZUL" color="blue" players={blue} winner={match.winner_team === "blue"} /><div className="match-detail-result"><small>MARCADOR FINAL</small><strong>{match.winner_team === "blue" ? "1" : "0"}<i>—</i>{match.winner_team === "red" ? "1" : "0"}</strong><span>{match.map_name}</span></div><TeamPanel name="EQUIPO ROJO" color="red" players={red} winner={match.winner_team === "red"} /></div></>}</section><SiteFooter /></main>;
}

function TeamPanel({ name, color, players, winner }: { name: string; color: "blue" | "red"; players: MatchPlayer[]; winner: boolean }) {
  return <section className={`match-detail-team is-${color}`}><header><div><small>{winner ? "VICTORIA" : "DERROTA"}</small><h2>{name}</h2></div><strong>{players.length} JUGADORES</strong></header><div className="match-detail-player-head"><span>JUGADOR</span><span>K</span><span>D</span><span>DAÑO</span><span>ELO</span></div>{players.map((player) => <a className="match-detail-player" href={`/players/${encodeURIComponent(player.minecraft_username)}`} key={player.minecraft_uuid}><div><img src={head(player.minecraft_uuid)} alt="" /><strong>{player.minecraft_username}</strong></div><span>{player.kills}</span><span>{player.deaths}</span><span>{Math.round(player.damage_dealt).toLocaleString("es-PE")}</span><strong className={player.elo_change >= 0 ? "positive" : "negative"}>{player.elo_change >= 0 ? "+" : ""}{player.elo_change}</strong></a>)}</section>;
}
