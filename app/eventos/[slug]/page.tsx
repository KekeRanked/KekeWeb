import type { Metadata } from "next";
import EventDetailClient from "./event-detail-client";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Evento — KEKE`,
    description: `Detalles del evento ${slug} en KEKE Network.`,
  };
}

export default async function EventDetailPage({ params }: PageProps) {
  const { slug } = await params;
  return <EventDetailClient slug={slug} />;
}
