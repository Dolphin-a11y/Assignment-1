import { initialState, legalMoves, makeMove, squareName } from "./chess-rules.js";

const IS_GITHUB = location.hostname.endsWith("github.io");
const LIVE_CHESS = "https://drift-mindful-pause.ljade1107.chatgpt.site/chess-room.html";
const API = IS_GITHUB ? `${LIVE_CHESS.replace("/chess-room.html", "")}/api/chess` : "./api/chess";
const symbols = { wk:"♔", wq:"♕", wr:"♖", wb:"♗", wn:"♘", wp:"♙", bk:"♚", bq:"♛", br:"♜", bb:"♝", bn:"♞", bp:"♟" };
const modeChoice = document.querySelector("#mode-choice"); const friendLobby = document.querySelector("#friend-lobby"); const aiChoice = document.querySelector("#ai-choice");
const game = document.querySelector("#game"); const boardElement = document.querySelector("#chess-board");
const notice = document.querySelector("#notice"); const feedback = document.querySelector("#feedback");
let mode = ""; let code = ""; let token = ""; let color = "w"; let state = null; let ready = false; let version = 0; let selected = null; let poller = 0; let aiTimer = 0; let aiThinking = false;

function showNotice(message) { notice.textContent = message; notice.hidden = false; clearTimeout(showNotice.timer); showNotice.timer = setTimeout(() => { notice.hidden = true; }, 3200); }
function openLiveFriend(roomCode = "") {
  const target = `${LIVE_CHESS}?mode=friend${roomCode ? `&code=${encodeURIComponent(roomCode)}` : ""}`;
  window.top.location.assign(target);
}
async function request(method, payload, query = "") {
  const response = await fetch(`${API}${query}`, { method, credentials:"include", headers: method === "POST" ? { "content-type":"application/json" } : {}, body: method === "POST" ? JSON.stringify(payload) : undefined });
  const data = await response.json().catch(() => ({ error:"The room service did not respond" }));
  if (!response.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

function saveSession() { sessionStorage.setItem("driftChessRoom", JSON.stringify({ code, token, color })); }
function clearSession() { sessionStorage.removeItem("driftChessRoom"); }
function statusText() {
  if (!ready) return "Waiting for a friend to join…";
  if (state.result) return state.result;
  if (state.turn === color) return "Your turn — choose a piece.";
  if (mode === "ai") return aiThinking ? "The AI is considering its move…" : "The AI will move next.";
  return `Waiting for ${state.turn === "w" ? "White" : "Black"} to move.`;
}

function render() {
  if (!state) return;
  document.querySelector("#game-mode-label").textContent = mode === "ai" ? "AI game" : "Friend game";
  document.querySelector("#room-details").hidden = mode === "ai";
  document.querySelector("#ai-opponent").hidden = mode !== "ai";
  document.querySelector("#room-code").textContent = code || "------";
  document.querySelector("#player-color").textContent = color === "w" ? "White" : "Black";
  document.querySelector("#player-piece").textContent = color === "w" ? "♙" : "♟";
  document.querySelector("#turn-label").textContent = state.result ? "Game finished" : state.turn === "w" ? "White" : "Black";
  document.querySelector("#room-status").textContent = statusText(); feedback.textContent = state.result || (state.lastMove ? `Last move: ${state.lastMove.notation}. ${statusText()}` : statusText());
  boardElement.replaceChildren();
  const order = color === "b" ? Array.from({ length:64 }, (_, index) => 63 - index) : Array.from({ length:64 }, (_, index) => index);
  const targets = selected === null ? [] : legalMoves(state, selected).map((move) => move.to);
  for (const index of order) {
    const row = Math.floor(index / 8); const column = index % 8; const piece = state.board[index];
    const square = document.createElement("button"); square.type = "button"; square.className = `square ${(row + column) % 2 ? "dark" : "light"}`;
    if (selected === index) square.classList.add("selected");
    if (state.lastMove && (state.lastMove.from === index || state.lastMove.to === index)) square.classList.add("last");
    if (targets.includes(index)) { square.classList.add("legal"); if (piece) square.classList.add("capture"); }
    square.setAttribute("aria-label", `${squareName(index)}${piece ? ` ${piece.color === "w" ? "white" : "black"} ${piece.type}` : " empty"}`);
    square.addEventListener("click", () => chooseSquare(index));
    if (column === (color === "b" ? 7 : 0)) { const coord = document.createElement("span"); coord.className = "coord"; coord.textContent = squareName(index)[1]; square.appendChild(coord); }
    if (piece) { const pieceNode = document.createElement("span"); pieceNode.className = `piece ${piece.color === "w" ? "white" : "black"}`; pieceNode.textContent = symbols[piece.color + piece.type]; square.appendChild(pieceNode); }
    boardElement.appendChild(square);
  }
}

async function chooseSquare(index) {
  if (!ready) return showNotice("Share the room code and wait for your friend.");
  if (state.result) return showNotice(state.result);
  if (state.turn !== color) return showNotice(mode === "ai" ? "The AI is taking its turn." : "It is your friend’s turn.");
  const piece = state.board[index];
  if (selected === null) {
    if (!piece || piece.color !== color) return showNotice("Choose one of your own pieces.");
    selected = index; render(); return;
  }
  if (piece?.color === color) { selected = index; render(); return; }
  if (!legalMoves(state, selected).some((move) => move.to === index)) { selected = null; render(); return showNotice("That piece cannot move there."); }
  if (mode === "ai") {
    const next = makeMove(state, selected, index, "q"); selected = null;
    if (!next) return showNotice("That move is not legal.");
    state = next; render(); scheduleAiMove(); return;
  }
  try {
    const data = await request("POST", { action:"move", code, token, from:selected, to:index, promotion:"q" }); selected = null; state = data.state; version = data.version; render();
  } catch (error) { selected = null; showNotice(error.message); await refresh(); }
}

function chooseAiMove() {
  const values = { p:1, n:3, b:3.2, r:5, q:9, k:100 }; const candidates = [];
  for (let from = 0; from < 64; from += 1) {
    if (state.board[from]?.color !== state.turn) continue;
    for (const move of legalMoves(state, from)) {
      const captured = state.board[move.to]; const next = makeMove(state, move.from, move.to, move.promotion || "q");
      const score = (captured ? values[captured.type] * 12 : 0) + (move.promotion ? 40 : 0) + (next?.winner === state.turn ? 1000 : 0) + Math.random() * 5;
      candidates.push({ move, next, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.next || null;
}

function scheduleAiMove() {
  if (mode !== "ai" || !state || state.result || state.turn === color || aiThinking) return;
  aiThinking = true; render();
  clearTimeout(aiTimer);
  aiTimer = window.setTimeout(() => { if (mode !== "ai" || !state) return; const next = chooseAiMove(); if (next) state = next; aiThinking = false; render(); }, 650);
}

function startAiGame(playerColor) {
  clearInterval(poller); clearTimeout(aiTimer); clearSession(); mode = "ai"; color = playerColor; code = ""; token = ""; state = initialState(); ready = true; version = 0; selected = null; aiThinking = false;
  modeChoice.hidden = true; friendLobby.hidden = true; aiChoice.hidden = true; game.hidden = false; render(); scheduleAiMove();
}

function enterRoom(data, playerColor, playerToken) {
  mode = "friend"; code = data.code; color = playerColor; token = playerToken; state = data.state; ready = data.ready; version = data.version; selected = null;
  modeChoice.hidden = true; friendLobby.hidden = true; aiChoice.hidden = true; game.hidden = false; saveSession(); render(); clearInterval(poller); poller = setInterval(refresh, 1200);
}
async function refresh() {
  if (!code) return;
  try { const data = await request("GET", null, `?code=${encodeURIComponent(code)}`); if (data.version !== version) { state = data.state; ready = data.ready; version = data.version; selected = null; render(); } }
  catch (error) { if (error.message === "Room not found") showModes(); }
}
function showModes() { clearInterval(poller); clearTimeout(aiTimer); code = ""; token = ""; state = null; mode = ""; aiThinking = false; clearSession(); game.hidden = true; friendLobby.hidden = true; aiChoice.hidden = true; modeChoice.hidden = false; }

document.querySelector("#choose-ai").addEventListener("click", () => { modeChoice.hidden = true; aiChoice.hidden = false; });
document.querySelector("#choose-friend").addEventListener("click", () => { if (IS_GITHUB) return openLiveFriend(); modeChoice.hidden = true; friendLobby.hidden = false; });
document.querySelectorAll("[data-back]").forEach((button) => button.addEventListener("click", showModes));
document.querySelector("#ai-white").addEventListener("click", () => startAiGame("w"));
document.querySelector("#ai-black").addEventListener("click", () => startAiGame("b"));
document.querySelector("#create-room").addEventListener("click", async () => { if (IS_GITHUB) return openLiveFriend(); try { const data = await request("POST", { action:"create" }); enterRoom(data, "w", data.token); } catch (error) { showNotice(error.message); } });
document.querySelector("#join-form").addEventListener("submit", async (event) => { event.preventDefault(); const requestedCode = document.querySelector("#room-code-input").value.trim().toUpperCase(); if (IS_GITHUB) return openLiveFriend(requestedCode); try { const data = await request("POST", { action:"join", code:requestedCode }); enterRoom(data, "b", data.token); } catch (error) { showNotice(error.message); } });
document.querySelector("#room-code-input").addEventListener("input", (event) => { event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); });
document.querySelector("#copy-code").addEventListener("click", async () => { await navigator.clipboard.writeText(code); showNotice("Room code copied"); });
document.querySelector("#leave-room").addEventListener("click", showModes);
document.querySelector("#reset-game").addEventListener("click", async () => {
  if (mode === "ai") { clearTimeout(aiTimer); state = initialState(); selected = null; aiThinking = false; render(); scheduleAiMove(); return; }
  try { const data = await request("POST", { action:"reset", code, token }); state = data.state; ready = data.ready; version = data.version; render(); } catch (error) { showNotice(error.message); }
});

const saved = JSON.parse(sessionStorage.getItem("driftChessRoom") || "null");
if (saved?.code && saved?.token && ["w","b"].includes(saved.color)) request("GET", null, `?code=${encodeURIComponent(saved.code)}`).then((data) => enterRoom(data, saved.color, saved.token)).catch(clearSession);
else {
  const params = new URLSearchParams(location.search);
  if (params.get("mode") === "friend") { modeChoice.hidden = true; friendLobby.hidden = false; document.querySelector("#room-code-input").value = (params.get("code") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6); }
}
