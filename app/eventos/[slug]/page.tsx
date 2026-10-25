import type { Metadata } from "next";
import { headers } from "next/headers";
import EventDetailClient from "./event-detail-client";

type PageProps = { params: Promise<{ slug: string }> };
type EventMetadata = { date?: string | null; format?: string | null; prize?: string | null };
type EventDetail = {
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  metadata: EventMetadata | null;
  updated_at?: string;
};

async function requestOrigin() {
  const requestHeaders = await headers();
  const host = (requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "keke.live").split(",")[0].trim();
  const protocol = (requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")).split(",")[0].trim();
  return new URL(`${protocol}://${host}`);
}

async function eventMetadata(slug: string, origin: URL): Promise<EventDetail | null> {
  try {
    const response = await fetch(new URL(`/api/events/${encodeURIComponent(slug)}`, origin), {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    return ((await response.json()) as { data?: EventDetail }).data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const origin = await requestOrigin();
  const event = await eventMetadata(slug, origin);
  if (!event) {
    return {
      title: "Evento — KEKE",
      description: "Consulta los detalles de este evento en KEKE Network.",
    };
  }

  const title = `${event.title} — KEKE`;
  const facts = [event.metadata?.format, event.metadata?.date, event.metadata?.prize ? `Premio: ${event.metadata.prize}` : null].filter(Boolean).join(" · ");
  const description = [event.excerpt?.trim(), facts].filter(Boolean).join(" ").slice(0, 300);
  const eventUrl = new URL(`/eventos/${encodeURIComponent(slug)}`, origin);
  const imageUrl = new URL(event.cover_image || "/og.png", origin);
  if (event.updated_at) imageUrl.searchParams.set("v", event.updated_at);

  return {
    title,
    description,
    alternates: { canonical: eventUrl },
    openGraph: {
      title,
      description,
      type: "website",
      url: eventUrl,
      siteName: "KEKE Ranked Network",
      images: [{ url: imageUrl, alt: `Banner de ${event.title}` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function EventDetailPage({ params }: PageProps) {
  const { slug } = await params;
  return <EventDetailClient slug={slug} />;
}
