import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const incoming = await headers();
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "localhost:3000";
  const protocol = incoming.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/og.png`;
  return {
    title: "Drift — A mindful pause",
    description: "Check in with your stress and discover a small, personalised moment of relief.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: { title: "Drift — A mindful pause", description: "A tiny pause, just for you.", images: [{ url: image, width: 1664, height: 934 }] },
    twitter: { card: "summary_large_image", title: "Drift — A mindful pause", description: "A tiny pause, just for you.", images: [image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <script
          src="https://cdnjs.cloudflare.com/ajax/libs/tone/15.5.27/Tone.js"
          crossOrigin="anonymous"
          defer
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
