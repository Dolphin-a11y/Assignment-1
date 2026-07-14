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
await writeFile(new URL("../public/index.html", import.meta.url), await response.text(), "utf8");
console.log("Exported public/index.html");
