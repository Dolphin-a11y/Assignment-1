import { env } from "cloudflare:workers";
import { initialState, makeMove } from "@/public/chess-rules.js";

const allowedOrigins = new Set(["https://dolphin-a11y.github.io", "https://drift-mindful-pause.ljade1107.chatgpt.site"]);
const codeCharacters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function cors(request: Request) {
  const origin = request.headers.get("origin") || "";
  return { "content-type": "application/json", "cache-control": "no-store", ...(allowedOrigins.has(origin) ? { "access-control-allow-origin": origin, "access-control-allow-credentials": "true", vary: "Origin" } : {}) };
}

function json(request: Request, body: unknown, status = 200) { return Response.json(body, { status, headers: cors(request) }); }
function roomCode() { return Array.from({ length: 6 }, () => codeCharacters[Math.floor(Math.random() * codeCharacters.length)]).join(""); }

async function ensureSchema() {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS chess_rooms (
    code TEXT PRIMARY KEY,
    state TEXT NOT NULL,
    white_token TEXT NOT NULL,
    black_token TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`).run();
}

export async function OPTIONS(request: Request) {
  const headers = cors(request); headers["access-control-allow-methods"] = "GET, POST, OPTIONS"; headers["access-control-allow-headers"] = "content-type";
  return new Response(null, { status: 204, headers });
}

export async function GET(request: Request) {
  await ensureSchema();
  const code = new URL(request.url).searchParams.get("code")?.toUpperCase().replace(/[^A-Z0-9]/g, "") || "";
  const room = await env.DB.prepare("SELECT code, state, black_token, version, updated_at FROM chess_rooms WHERE code = ?").bind(code).first<{ code:string; state:string; black_token:string|null; version:number; updated_at:number }>();
  if (!room) return json(request, { error: "Room not found" }, 404);
  return json(request, { code: room.code, state: JSON.parse(room.state), ready: Boolean(room.black_token), version: room.version, updatedAt: room.updated_at });
}

export async function POST(request: Request) {
  await ensureSchema();
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = String(body.action || ""); const now = Date.now();
  if (action === "create") {
    await env.DB.prepare("DELETE FROM chess_rooms WHERE updated_at < ?").bind(now - 7 * 24 * 60 * 60 * 1000).run();
    const token = crypto.randomUUID();
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const code = roomCode();
      const result = await env.DB.prepare("INSERT OR IGNORE INTO chess_rooms (code, state, white_token, version, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)").bind(code, JSON.stringify(initialState()), token, now, now).run();
      if (result.meta.changes) return json(request, { code, token, color: "w", state: initialState(), ready: false, version: 1 }, 201);
    }
    return json(request, { error: "Could not create a room. Please try again." }, 503);
  }
  const code = String(body.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const room = await env.DB.prepare("SELECT * FROM chess_rooms WHERE code = ?").bind(code).first<Record<string, unknown>>();
  if (!room) return json(request, { error: "Room not found" }, 404);
  if (action === "join") {
    if (room.black_token) return json(request, { error: "This room already has two players" }, 409);
    const token = crypto.randomUUID();
    const joined = await env.DB.prepare("UPDATE chess_rooms SET black_token = ?, updated_at = ?, version = version + 1 WHERE code = ? AND black_token IS NULL").bind(token, now, code).run();
    if (!joined.meta.changes) return json(request, { error: "This room already has two players" }, 409);
    return json(request, { code, token, color: "b", state: JSON.parse(String(room.state)), ready: true, version: Number(room.version) + 1 });
  }
  if (action === "move") {
    const token = String(body.token || ""); const state = JSON.parse(String(room.state));
    const color = token === room.white_token ? "w" : token === room.black_token ? "b" : null;
    if (!color) return json(request, { error: "You are not a player in this room" }, 403);
    if (!room.black_token) return json(request, { error: "Waiting for the second player" }, 409);
    if (state.turn !== color) return json(request, { error: "Wait for your turn" }, 409);
    const next = makeMove(state, Number(body.from), Number(body.to), String(body.promotion || "q"));
    if (!next) return json(request, { error: "That move is not legal" }, 400);
    const version = Number(room.version);
    const result = await env.DB.prepare("UPDATE chess_rooms SET state = ?, version = version + 1, updated_at = ? WHERE code = ? AND version = ?").bind(JSON.stringify(next), now, code, version).run();
    if (!result.meta.changes) return json(request, { error: "The board changed. Try your move again." }, 409);
    return json(request, { code, state: next, ready: true, version: version + 1 });
  }
  if (action === "reset") {
    const token = String(body.token || "");
    if (token !== room.white_token && token !== room.black_token) return json(request, { error: "You are not a player in this room" }, 403);
    const next = initialState();
    await env.DB.prepare("UPDATE chess_rooms SET state = ?, version = version + 1, updated_at = ? WHERE code = ?").bind(JSON.stringify(next), now, code).run();
    return json(request, { code, state: next, ready: Boolean(room.black_token), version: Number(room.version) + 1 });
  }
  return json(request, { error: "Unknown action" }, 400);
}
