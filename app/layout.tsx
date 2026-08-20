import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);

  return {
    metadataBase,
    title: "KEKE — Ranked Minecraft Network",
    description: "Compite, escala y deja tu marca en la red competitiva de Minecraft.",
    icons: { icon: "/server-logo.png" },
    openGraph: {
      title: "KEKE — Ranked Network",
      description: "Tu partida. Tu rango. Compite en keke.live.",
      type: "website",
      images: [{ url: "/og.png", width: 1536, height: 1024, alt: "KEKE Ranked Network" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "KEKE — Ranked Network",
      description: "Tu partida. Tu rango. Compite en keke.live.",
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.dataset.theme=localStorage.getItem("keke-theme")==="light"?"light":"dark"}catch(e){document.documentElement.dataset.theme="dark"}`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
