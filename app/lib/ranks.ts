export const RANKS = [
  { min: 0, max: 299, name: "IRON" },
  { min: 300, max: 599, name: "BRONZE" },
  { min: 600, max: 899, name: "SILVER" },
  { min: 900, max: 1199, name: "GOLD" },
  { min: 1200, max: 1499, name: "PLATINUM" },
  { min: 1500, max: 1799, name: "DIAMOND" },
  { min: 1800, max: 2149, name: "ASCENDANT" },
  { min: 2150, max: 2499, name: "IMMORTAL" },
  { min: 2500, max: Number.POSITIVE_INFINITY, name: "RADIANT" },
] as const;

export type RankName = (typeof RANKS)[number]["name"];

export function rankForElo(elo: number): RankName {
  const normalizedElo = Number.isFinite(elo) ? Math.max(0, Math.floor(elo)) : 0;
  return RANKS.find((rank) => normalizedElo >= rank.min && normalizedElo <= rank.max)?.name ?? "IRON";
}

export function nextRankThreshold(elo: number): number | null {
  return RANKS.find((rank) => rank.min > elo)?.min ?? null;
}

export function rankProgress(elo: number): number {
  const normalizedElo = Number.isFinite(elo) ? Math.max(0, Math.floor(elo)) : 0;
  const rank = RANKS.find((candidate) => normalizedElo >= candidate.min && normalizedElo <= candidate.max) ?? RANKS[0];
  if (!Number.isFinite(rank.max)) return 100;
  return Math.min(100, Math.max(0, ((normalizedElo - rank.min) / (rank.max - rank.min + 1)) * 100));
}
