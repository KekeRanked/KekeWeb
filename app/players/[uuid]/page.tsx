import type { Metadata } from "next";
import PlayerProfileClient from "./player-profile-client";

type PageProps = { params: Promise<{ uuid: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { uuid } = await params;
  try {
    const response = await fetch(`https://keke.live/api/ranked/players/${encodeURIComponent(uuid)}`, { cache: "no-store" });
    const payload = response.ok ? await response.json() : null;
    const player = payload?.data;
    if (player) {
      const canonicalUrl = `https://keke.live/players/${encodeURIComponent(player.minecraft_username)}`;
      return {
        title: `${player.minecraft_username} — KEKE`,
        description: `Rango, estadísticas e historial competitivo de ${player.minecraft_username} en KEKE Network.`,
        alternates: { canonical: canonicalUrl },
        openGraph: { title: `${player.minecraft_username} — KEKE`, description: `Consulta el perfil competitivo de ${player.minecraft_username}.`, images: [] },
        twitter: { card: "summary", title: `${player.minecraft_username} — KEKE`, description: `Consulta el perfil competitivo de ${player.minecraft_username}.`, images: [] },
      };
    }
  } catch {}
  return { title: "Perfil de jugador — KEKE", description: "Perfil competitivo de KEKE Network." };
}

export default async function PlayerProfilePage({ params }: PageProps) {
  const { uuid: identifier } = await params;
  return <PlayerProfileClient identifier={identifier} />;
}
