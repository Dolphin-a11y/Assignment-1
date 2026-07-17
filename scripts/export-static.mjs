import { writeFile } from "node:fs/promises";

const { default: worker } = await import("../dist/server/index.js");
const response = await worker.fetch(
  new Request("https://drift-mindful-pause.ljade1107.chatgpt.site/", {
    headers: { accept: "text/html" },
  }),
  { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
  { waitUntil() {}, passThroughOnException() {} },
);

if (!response.ok) throw new Error(`Static export failed with ${response.status}`);
let html = await response.text();
html = html.replace(/<link rel="modulepreload"[^>]*>/g, "");
html = html.replace(/<script(?![^>]*cdnjs\.cloudflare\.com)[^>]*>[\s\S]*?<\/script>/g, "");
html = html.replace(/<\/html>[\s\S]*$/g, "</html>");
html = html.replace("</head>", '<script src="/vendor/Tone.js?v=15.5.27" defer></script></head>');
html = html.replace("</head>", '<link rel="stylesheet" href="/room.css?v=1"></head>');
html = html.replace("</head>", '<link rel="stylesheet" href="/room-3d.css?v=1"></head>');
html = html.replace("</head>", '<link rel="stylesheet" href="/breathing.css?v=1"></head>');
html = html.replace("</head>", '<link rel="stylesheet" href="/room-clutter.css?v=1"></head>');
html = html.replace("</head>", '<link rel="stylesheet" href="/video-update.css?v=1"></head>');
html = html.replace("</head>", '<link rel="stylesheet" href="/nav-update.css?v=1"></head>');
html = html.replace("</head>", '<link rel="stylesheet" href="/rhythm.css?v=1"></head>');
html = html.replace("</head>", '<link rel="stylesheet" href="/bemuse.css?v=1"></head>');
html = html.replace("</head>", '<link rel="stylesheet" href="/custom-rhythm-embed.css?v=1"></head>');
html = html.replace("</head>", '<link rel="stylesheet" href="/jigsaw-embed.css?v=1"></head>');
html = html.replace("</head>", '<link rel="stylesheet" href="/chess-embed.css?v=1"></head>');
html = html.replace("</body>", '<script src="/standalone.js?v=chess-hit-layer-v37" defer></script></body>');
await writeFile(new URL("../public/index.html", import.meta.url), html, "utf8");
console.log("Exported public/index.html");
