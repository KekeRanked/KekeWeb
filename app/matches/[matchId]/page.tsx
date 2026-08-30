import type { Metadata } from "next";
import MatchDetailClient from "./match-detail-client";

type PageProps = { params: Promise<{ matchId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { matchId } = await params;
  try {
    const response = await fetch(`https://keke.live/api/ranked/matches/${encodeURIComponent(matchId)}`, { cache: "no-store" });
    const payload = response.ok ? await response.json() : null;
    const match = payload?.data;
    if (match) {
      return {
        title: `${match.map_name} · ${match.match_type} — KEKE`,
        description: `Resultado, equipos y estadísticas de la partida ${match.match_id} en KEKE Network.`,
        openGraph: { title: `${match.map_name} · ${match.match_type} — KEKE`, description: `Consulta el resultado completo de la partida ${match.match_id}.`, images: [] },
        twitter: { card: "summary", title: `${match.map_name} · ${match.match_type} — KEKE`, description: `Consulta el resultado completo de la partida ${match.match_id}.`, images: [] },
      };
    }
  } catch {}
  return { title: `Partida ${matchId} — KEKE`, description: "Detalle de partida de KEKE Network." };
}

export default async function MatchDetailPage({ params }: PageProps) {
  const { matchId } = await params;
  return <MatchDetailClient matchId={matchId} />;
}
