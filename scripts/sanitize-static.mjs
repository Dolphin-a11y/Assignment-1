import { readFile, writeFile } from "node:fs/promises";

const path = new URL("../public/index.html", import.meta.url);
let html = await readFile(path, "utf8");

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
html = html.replace("</body>", '<script src="/standalone.js?v=beat-follow-v12" defer></script></body>');

await writeFile(path, html, "utf8");
console.log("Prepared standalone static page");
