import { legalMoves, squareName } from "./chess-rules.js";

const API = location.hostname.endsWith("github.io") ? "https://drift-mindful-pause.ljade1107.chatgpt.site/api/chess" : "./api/chess";
const symbols = { wk:"♔", wq:"♕", wr:"♖", wb:"♗", wn:"♘", wp:"♙", bk:"♚", bq:"♛", br:"♜", bb:"♝", bn:"♞", bp:"♟" };
const lobby = document.querySelector("#lobby"); const game = document.querySelector("#game"); const boardElement = document.querySelector("#chess-board");
const notice = document.querySelector("#notice"); const feedback = document.querySelector("#feedback");
let code = ""; let token = ""; let color = "w"; let state = null; let ready = false; let version = 0; let selected = null; let poller = 0;

function showNotice(message) { notice.textContent = message; notice.hidden = false; clearTimeout(showNotice.timer); showNotice.timer = setTimeout(() => { notice.hidden = true; }, 3200); }
async function request(method, payload, query = "") {
  const response = await fetch(`${API}${query}`, { method, headers: method === "POST" ? { "content-type":"application/json" } : {}, body: method === "POST" ? JSON.stringify(payload) : undefined });
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
  return `Waiting for ${state.turn === "w" ? "White" : "Black"} to move.`;
}

function render() {
  if (!state) return;
  document.querySelector("#room-code").textContent = code;
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
  if (state.turn !== color) return showNotice("It is your friend’s turn.");
  const piece = state.board[index];
  if (selected === null) {
    if (!piece || piece.color !== color) return showNotice("Choose one of your own pieces.");
    selected = index; render(); return;
  }
  if (piece?.color === color) { selected = index; render(); return; }
  if (!legalMoves(state, selected).some((move) => move.to === index)) { selected = null; render(); return showNotice("That piece cannot move there."); }
  try {
    const data = await request("POST", { action:"move", code, token, from:selected, to:index, promotion:"q" }); selected = null; state = data.state; version = data.version; render();
  } catch (error) { selected = null; showNotice(error.message); await refresh(); }
}

function enterRoom(data, playerColor, playerToken) {
  code = data.code; color = playerColor; token = playerToken; state = data.state; ready = data.ready; version = data.version; selected = null;
  lobby.hidden = true; game.hidden = false; saveSession(); render(); clearInterval(poller); poller = setInterval(refresh, 1200);
}
async function refresh() {
  if (!code) return;
  try { const data = await request("GET", null, `?code=${encodeURIComponent(code)}`); if (data.version !== version) { state = data.state; ready = data.ready; version = data.version; selected = null; render(); } }
  catch (error) { if (error.message === "Room not found") leaveRoom(); }
}
function leaveRoom() { clearInterval(poller); code = ""; token = ""; state = null; clearSession(); game.hidden = true; lobby.hidden = false; }

document.querySelector("#create-room").addEventListener("click", async () => { try { const data = await request("POST", { action:"create" }); enterRoom(data, "w", data.token); } catch (error) { showNotice(error.message); } });
document.querySelector("#join-form").addEventListener("submit", async (event) => { event.preventDefault(); const requestedCode = document.querySelector("#room-code-input").value.trim().toUpperCase(); try { const data = await request("POST", { action:"join", code:requestedCode }); enterRoom(data, "b", data.token); } catch (error) { showNotice(error.message); } });
document.querySelector("#room-code-input").addEventListener("input", (event) => { event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); });
document.querySelector("#copy-code").addEventListener("click", async () => { await navigator.clipboard.writeText(code); showNotice("Room code copied"); });
document.querySelector("#leave-room").addEventListener("click", leaveRoom);
document.querySelector("#reset-game").addEventListener("click", async () => { try { const data = await request("POST", { action:"reset", code, token }); state = data.state; ready = data.ready; version = data.version; render(); } catch (error) { showNotice(error.message); } });

const saved = JSON.parse(sessionStorage.getItem("driftChessRoom") || "null");
if (saved?.code && saved?.token && ["w","b"].includes(saved.color)) request("GET", null, `?code=${encodeURIComponent(saved.code)}`).then((data) => enterRoom(data, saved.color, saved.token)).catch(clearSession);
