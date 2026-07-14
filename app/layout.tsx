import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://drift-mindful-pause.ljade1107.chatgpt.site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Drift — A mindful pause",
  description: "Check in with your stress and discover a small, personalised moment of relief.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: { title: "Drift — A mindful pause", description: "A tiny pause, just for you.", images: [{ url: `${siteUrl}/og.png`, width: 1664, height: 934 }] },
  twitter: { card: "summary_large_image", title: "Drift — A mindful pause", description: "A tiny pause, just for you.", images: [`${siteUrl}/og.png`] },
};

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
