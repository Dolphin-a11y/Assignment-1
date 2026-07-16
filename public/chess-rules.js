// Original JavaScript chess rules for Drift. No python-chess source code is included.
const files = "abcdefgh";

export function initialState() {
  const board = Array(64).fill(null);
  const back = ["r", "n", "b", "q", "k", "b", "n", "r"];
  for (let column = 0; column < 8; column += 1) {
    board[column] = { color: "b", type: back[column] };
    board[8 + column] = { color: "b", type: "p" };
    board[48 + column] = { color: "w", type: "p" };
    board[56 + column] = { color: "w", type: back[column] };
  }
  return { board, turn: "w", castling: "KQkq", enPassant: null, lastMove: null, winner: null, result: null };
}

export function squareName(index) {
  return `${files[index % 8]}${8 - Math.floor(index / 8)}`;
}

function inside(row, column) { return row >= 0 && row < 8 && column >= 0 && column < 8; }
function opposite(color) { return color === "w" ? "b" : "w"; }
function cloneState(state) { return { ...state, board: state.board.map((piece) => piece ? { ...piece } : null) }; }

function rawMoves(state, from, attacksOnly = false) {
  const piece = state.board[from];
  if (!piece) return [];
  const row = Math.floor(from / 8); const column = from % 8; const moves = [];
  const add = (target, extra = {}) => {
    const occupant = state.board[target];
    if (!occupant || occupant.color !== piece.color) moves.push({ from, to: target, ...extra });
    return !occupant;
  };
  if (piece.type === "p") {
    const direction = piece.color === "w" ? -1 : 1;
    const startRow = piece.color === "w" ? 6 : 1;
    const promotionRow = piece.color === "w" ? 0 : 7;
    for (const delta of [-1, 1]) {
      const captureRow = row + direction; const captureColumn = column + delta;
      if (!inside(captureRow, captureColumn)) continue;
      const target = captureRow * 8 + captureColumn;
      const occupant = state.board[target];
      if (attacksOnly || (occupant && occupant.color !== piece.color) || state.enPassant === target) {
        moves.push({ from, to: target, promotion: captureRow === promotionRow ? "q" : null, enPassant: state.enPassant === target && !occupant });
      }
    }
    if (attacksOnly) return moves;
    const oneRow = row + direction;
    if (inside(oneRow, column) && !state.board[oneRow * 8 + column]) {
      moves.push({ from, to: oneRow * 8 + column, promotion: oneRow === promotionRow ? "q" : null });
      const twoRow = row + direction * 2;
      if (row === startRow && !state.board[twoRow * 8 + column]) moves.push({ from, to: twoRow * 8 + column, doublePawn: true });
    }
    return moves;
  }
  if (piece.type === "n") {
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) if (inside(row + dr, column + dc)) add((row + dr) * 8 + column + dc);
    return moves;
  }
  const slide = (directions) => {
    for (const [dr, dc] of directions) {
      let nextRow = row + dr; let nextColumn = column + dc;
      while (inside(nextRow, nextColumn)) {
        if (!add(nextRow * 8 + nextColumn)) break;
        nextRow += dr; nextColumn += dc;
      }
    }
  };
  if (piece.type === "b") slide([[-1,-1],[-1,1],[1,-1],[1,1]]);
  if (piece.type === "r") slide([[-1,0],[1,0],[0,-1],[0,1]]);
  if (piece.type === "q") slide([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]);
  if (piece.type === "k") {
    for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) if (inside(row + dr, column + dc)) add((row + dr) * 8 + column + dc);
    if (!attacksOnly && !isInCheck(state, piece.color)) {
      const rank = piece.color === "w" ? 7 : 0;
      const kingSide = piece.color === "w" ? "K" : "k"; const queenSide = piece.color === "w" ? "Q" : "q";
      if (state.castling.includes(kingSide) && !state.board[rank * 8 + 5] && !state.board[rank * 8 + 6] && !isSquareAttacked(state, rank * 8 + 5, opposite(piece.color)) && !isSquareAttacked(state, rank * 8 + 6, opposite(piece.color))) moves.push({ from, to: rank * 8 + 6, castle: "king" });
      if (state.castling.includes(queenSide) && !state.board[rank * 8 + 1] && !state.board[rank * 8 + 2] && !state.board[rank * 8 + 3] && !isSquareAttacked(state, rank * 8 + 3, opposite(piece.color)) && !isSquareAttacked(state, rank * 8 + 2, opposite(piece.color))) moves.push({ from, to: rank * 8 + 2, castle: "queen" });
    }
  }
  return moves;
}

export function isSquareAttacked(state, square, byColor) {
  for (let from = 0; from < 64; from += 1) {
    if (state.board[from]?.color !== byColor) continue;
    if (rawMoves(state, from, true).some((move) => move.to === square)) return true;
  }
  return false;
}

export function isInCheck(state, color) {
  const king = state.board.findIndex((piece) => piece?.color === color && piece.type === "k");
  return king >= 0 && isSquareAttacked(state, king, opposite(color));
}

function applyUnchecked(state, move) {
  const next = cloneState(state); const piece = next.board[move.from];
  next.board[move.from] = null;
  if (move.enPassant) next.board[move.to + (piece.color === "w" ? 8 : -8)] = null;
  next.board[move.to] = { ...piece, type: move.promotion || piece.type };
  if (move.castle) {
    const rank = piece.color === "w" ? 7 : 0;
    const rookFrom = rank * 8 + (move.castle === "king" ? 7 : 0); const rookTo = rank * 8 + (move.castle === "king" ? 5 : 3);
    next.board[rookTo] = next.board[rookFrom]; next.board[rookFrom] = null;
  }
  let castling = next.castling;
  if (piece.type === "k") castling = castling.replace(piece.color === "w" ? /[KQ]/g : /[kq]/g, "");
  const rightsBySquare = { 0:"q", 7:"k", 56:"Q", 63:"K" };
  castling = castling.replace(rightsBySquare[move.from] || " ", "").replace(rightsBySquare[move.to] || " ", "");
  next.castling = castling;
  next.enPassant = move.doublePawn ? (move.from + move.to) / 2 : null;
  next.lastMove = { from: move.from, to: move.to, notation: `${squareName(move.from)}–${squareName(move.to)}` };
  next.turn = opposite(piece.color);
  return next;
}

export function legalMoves(state, from) {
  const piece = state.board[from];
  if (!piece || piece.color !== state.turn || state.winner) return [];
  return rawMoves(state, from).filter((move) => !isInCheck(applyUnchecked(state, move), piece.color));
}

export function makeMove(state, from, to, promotion = "q") {
  const move = legalMoves(state, from).find((candidate) => candidate.to === to);
  if (!move) return null;
  if (move.promotion) move.promotion = ["q", "r", "b", "n"].includes(promotion) ? promotion : "q";
  const next = applyUnchecked(state, move);
  let hasMove = false;
  for (let square = 0; square < 64 && !hasMove; square += 1) if (next.board[square]?.color === next.turn && legalMoves(next, square).length) hasMove = true;
  if (!hasMove) {
    if (isInCheck(next, next.turn)) { next.winner = opposite(next.turn); next.result = `${next.winner === "w" ? "White" : "Black"} wins by checkmate`; }
    else { next.winner = "draw"; next.result = "Draw by stalemate"; }
  }
  return next;
}
