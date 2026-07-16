import { initialState, legalMoves, makeMove, squareName } from "./chess-rules.js";
import { Peer } from "./vendor/room-connection.js";

const symbols = { wk:"♔", wq:"♕", wr:"♖", wb:"♗", wn:"♘", wp:"♙", bk:"♚", bq:"♛", br:"♜", bb:"♝", bn:"♞", bp:"♟" };
const modeChoice = document.querySelector("#mode-choice");
const friendLobby = document.querySelector("#friend-lobby");
const aiChoice = document.querySelector("#ai-choice");
const game = document.querySelector("#game");
const boardElement = document.querySelector("#chess-board");
const notice = document.querySelector("#notice");
const feedback = document.querySelector("#feedback");

let mode = "";
let code = "";
let color = "w";
let state = null;
let ready = false;
let selected = null;
let aiTimer = 0;
let aiThinking = false;
let peer = null;
let connection = null;
let isHost = false;
let movePending = false;

function showNotice(message) {
  notice.textContent = message;
  notice.hidden = false;
  clearTimeout(showNotice.timer);
  showNotice.timer = setTimeout(() => { notice.hidden = true; }, 3600);
}

function statusText() {
  if (!ready) return isHost ? "Waiting for your friend to join…" : "Connecting to your friend…";
  if (state.result) return state.result;
  if (movePending) return "Sending your move…";
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
  document.querySelector("#room-status").textContent = statusText();
  feedback.textContent = state.result || (state.lastMove ? `Last move: ${state.lastMove.notation}. ${statusText()}` : statusText());
  boardElement.replaceChildren();
  const order = color === "b" ? Array.from({ length:64 }, (_, index) => 63 - index) : Array.from({ length:64 }, (_, index) => index);
  const targets = selected === null ? [] : legalMoves(state, selected).map((move) => move.to);
  for (const index of order) {
    const row = Math.floor(index / 8);
    const column = index % 8;
    const piece = state.board[index];
    const square = document.createElement("button");
    square.type = "button";
    square.className = `square ${(row + column) % 2 ? "dark" : "light"}`;
    if (selected === index) square.classList.add("selected");
    if (state.lastMove && (state.lastMove.from === index || state.lastMove.to === index)) square.classList.add("last");
    if (targets.includes(index)) { square.classList.add("legal"); if (piece) square.classList.add("capture"); }
    square.setAttribute("aria-label", `${squareName(index)}${piece ? ` ${piece.color === "w" ? "white" : "black"} ${piece.type}` : " empty"}`);
    square.addEventListener("click", () => chooseSquare(index));
    if (column === (color === "b" ? 7 : 0)) {
      const coord = document.createElement("span");
      coord.className = "coord";
      coord.textContent = squareName(index)[1];
      square.appendChild(coord);
    }
    if (piece) {
      const pieceNode = document.createElement("span");
      pieceNode.className = `piece ${piece.color === "w" ? "white" : "black"}`;
      pieceNode.textContent = symbols[piece.color + piece.type];
      square.appendChild(pieceNode);
    }
    boardElement.appendChild(square);
  }
}

function send(message) {
  if (!connection?.open) return false;
  connection.send(message);
  return true;
}

function sendState() {
  send({ type:"state", state });
}

function applyFriendMove(from, to, promotion = "q") {
  const next = makeMove(state, from, to, promotion);
  if (!next) return false;
  state = next;
  selected = null;
  movePending = false;
  render();
  sendState();
  return true;
}

async function chooseSquare(index) {
  if (!ready) return showNotice(isHost ? "Share the room code and wait for your friend." : "Still connecting to the room.");
  if (movePending) return showNotice("Your move is being sent.");
  if (state.result) return showNotice(state.result);
  if (state.turn !== color) return showNotice(mode === "ai" ? "The AI is taking its turn." : "It is your friend’s turn.");
  const piece = state.board[index];
  if (selected === null) {
    if (!piece || piece.color !== color) return showNotice("Choose one of your own pieces.");
    selected = index; render(); return;
  }
  if (piece?.color === color) { selected = index; render(); return; }
  if (!legalMoves(state, selected).some((move) => move.to === index)) {
    selected = null; render(); return showNotice("That piece cannot move there.");
  }
  if (mode === "ai") {
    const next = makeMove(state, selected, index, "q");
    selected = null;
    if (!next) return showNotice("That move is not legal.");
    state = next; render(); scheduleAiMove(); return;
  }
  if (isHost) {
    if (!applyFriendMove(selected, index, "q")) showNotice("That move is not legal.");
  } else {
    const from = selected;
    selected = null;
    movePending = send({ type:"move", from, to:index, promotion:"q" });
    if (!movePending) showNotice("The connection was lost. Ask your friend to create a new room.");
    render();
  }
}

function chooseAiMove() {
  const values = { p:1, n:3, b:3.2, r:5, q:9, k:100 };
  const candidates = [];
  for (let from = 0; from < 64; from += 1) {
    if (state.board[from]?.color !== state.turn) continue;
    for (const move of legalMoves(state, from)) {
      const captured = state.board[move.to];
      const next = makeMove(state, move.from, move.to, move.promotion || "q");
      const score = (captured ? values[captured.type] * 12 : 0) + (move.promotion ? 40 : 0) + (next?.winner === state.turn ? 1000 : 0) + Math.random() * 5;
      candidates.push({ next, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.next || null;
}

function scheduleAiMove() {
  if (mode !== "ai" || !state || state.result || state.turn === color || aiThinking) return;
  aiThinking = true; render();
  clearTimeout(aiTimer);
  aiTimer = window.setTimeout(() => {
    if (mode !== "ai" || !state) return;
    const next = chooseAiMove();
    if (next) state = next;
    aiThinking = false;
    render();
  }, 650);
}

function destroyPeer() {
  if (connection) { connection.close(); connection = null; }
  if (peer) { peer.destroy(); peer = null; }
}

function showGame() {
  modeChoice.hidden = true;
  friendLobby.hidden = true;
  aiChoice.hidden = true;
  game.hidden = false;
  render();
}

function startAiGame(playerColor) {
  destroyPeer(); clearTimeout(aiTimer);
  mode = "ai"; color = playerColor; code = ""; state = initialState(); ready = true; selected = null; aiThinking = false; isHost = false; movePending = false;
  showGame(); scheduleAiMove();
}

function peerId(roomCode) { return `drift-chess-${roomCode.toLowerCase()}`; }
function randomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

function peerFailure(error, joining = false) {
  console.error("Chess connection error", error);
  if (joining && error?.type === "peer-unavailable") showNotice("That room was not found. Check the six-character code.");
  else showNotice("The friend connection could not start. Please try again.");
  if (joining) { destroyPeer(); game.hidden = true; friendLobby.hidden = false; }
}

function attachConnection(nextConnection, host) {
  if (host && connection?.open) { nextConnection.close(); return; }
  connection = nextConnection;
  connection.on("open", () => {
    ready = true;
    movePending = false;
    if (host) sendState(); else send({ type:"hello" });
    render();
    showNotice("Your friend is connected. Enjoy the game!");
  });
  connection.on("data", (message) => {
    if (!message || typeof message !== "object") return;
    if (host && message.type === "move") {
      if (state.turn !== "b" || !applyFriendMove(Number(message.from), Number(message.to), message.promotion)) sendState();
    } else if (host && message.type === "reset") {
      state = initialState(); selected = null; movePending = false; render(); sendState();
    } else if (!host && message.type === "state" && message.state?.board) {
      state = message.state; selected = null; movePending = false; ready = true; render();
    } else if (host && message.type === "hello") sendState();
  });
  connection.on("close", () => { ready = false; movePending = false; render(); showNotice("Your friend disconnected. Create a new room to play again."); });
  connection.on("error", () => { ready = false; movePending = false; render(); showNotice("The connection to your friend was interrupted."); });
}

function ensurePeerLibrary() {
  if (typeof Peer === "function") return true;
  showNotice("The room connection library did not load. Check your internet connection and refresh.");
  return false;
}

function createRoom(attempt = 0) {
  if (!ensurePeerLibrary()) return;
  destroyPeer();
  code = randomCode(); color = "w"; state = initialState(); ready = false; selected = null; mode = "friend"; isHost = true; movePending = false;
  peer = new Peer(peerId(code));
  peer.on("open", showGame);
  peer.on("connection", (incoming) => attachConnection(incoming, true));
  peer.on("error", (error) => {
    if (error?.type === "unavailable-id" && attempt < 3) return createRoom(attempt + 1);
    peerFailure(error, false);
  });
}

function joinRoom(roomCode) {
  if (!ensurePeerLibrary()) return;
  destroyPeer();
  code = roomCode; color = "b"; state = initialState(); ready = false; selected = null; mode = "friend"; isHost = false; movePending = false;
  peer = new Peer();
  peer.on("open", () => {
    showGame();
    attachConnection(peer.connect(peerId(code), { reliable:true }), false);
  });
  peer.on("error", (error) => peerFailure(error, true));
}

function showModes() {
  destroyPeer(); clearTimeout(aiTimer);
  code = ""; state = null; mode = ""; ready = false; selected = null; aiThinking = false; isHost = false; movePending = false;
  game.hidden = true; friendLobby.hidden = true; aiChoice.hidden = true; modeChoice.hidden = false;
}

document.querySelector("#choose-ai").addEventListener("click", () => { modeChoice.hidden = true; aiChoice.hidden = false; });
document.querySelector("#choose-friend").addEventListener("click", () => { modeChoice.hidden = true; friendLobby.hidden = false; });
document.querySelectorAll("[data-back]").forEach((button) => button.addEventListener("click", showModes));
document.querySelector("#ai-white").addEventListener("click", () => startAiGame("w"));
document.querySelector("#ai-black").addEventListener("click", () => startAiGame("b"));
document.querySelector("#create-room").addEventListener("click", () => createRoom());
document.querySelector("#join-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const requestedCode = document.querySelector("#room-code-input").value.trim().toUpperCase();
  if (requestedCode.length !== 6) return showNotice("Enter the complete six-character room code.");
  joinRoom(requestedCode);
});
document.querySelector("#room-code-input").addEventListener("input", (event) => { event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); });
document.querySelector("#copy-code").addEventListener("click", async () => { await navigator.clipboard.writeText(code); showNotice("Room code copied"); });
document.querySelector("#leave-room").addEventListener("click", showModes);
document.querySelector("#reset-game").addEventListener("click", () => {
  if (mode === "ai") { clearTimeout(aiTimer); state = initialState(); selected = null; aiThinking = false; render(); scheduleAiMove(); return; }
  if (isHost) { state = initialState(); selected = null; movePending = false; render(); sendState(); }
  else if (!send({ type:"reset" })) showNotice("The connection was lost. Ask your friend to create a new room.");
});
window.addEventListener("beforeunload", destroyPeer);

const params = new URLSearchParams(location.search);
if (params.get("mode") === "friend") {
  modeChoice.hidden = true;
  friendLobby.hidden = false;
  document.querySelector("#room-code-input").value = (params.get("code") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}
