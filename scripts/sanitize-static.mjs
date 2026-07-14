import { readFile, writeFile } from "node:fs/promises";

const path = new URL("../public/index.html", import.meta.url);
let html = await readFile(path, "utf8");

html = html.replace(/<link rel="modulepreload"[^>]*>/g, "");
html = html.replace(/<script(?![^>]*cdnjs\.cloudflare\.com)[^>]*>[\s\S]*?<\/script>/g, "");
html = html.replace(/<\/html>[\s\S]*$/g, "</html>");
html = html.replace("</body>", '<script src="/standalone.js?v=tone-fallback" defer></script></body>');

await writeFile(path, html, "utf8");
console.log("Prepared standalone static page");
