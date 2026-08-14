const BOARD_SIZE = 8;
const START = [
  "r", "n", "b", "q", "k", "b", "n", "r",
  "p", "p", "p", "p", "p", "p", "p", "p",
  "", "", "", "", "", "", "", "",
  "", "", "", "", "", "", "", "",
  "", "", "", "", "", "", "", "",
  "", "", "", "", "", "", "", "",
  "P", "P", "P", "P", "P", "P", "P", "P",
  "R", "N", "B", "Q", "K", "B", "N", "R",
];

const NAMES = {
  w: "White",
  b: "Black",
};

const VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

const KNIGHT_STEPS = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KING_STEPS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const BISHOP_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ROOK_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const QUEEN_DIRS = [...BISHOP_DIRS, ...ROOK_DIRS];

const DIFFICULTIES = {
  easy: { depth: 1, noise: 260, blunder: 0.34, time: 160 },
  casual: { depth: 2, noise: 90, blunder: 0.12, time: 420 },
  strong: { depth: 3, noise: 18, blunder: 0.03, time: 900 },
  expert: { depth: 4, noise: 3, blunder: 0, time: 1500 },
  impossible: { depth: 5, noise: 0, blunder: 0, time: 2600 },
};

const state = {
  board: [...START],
  current: "w",
  mode: "human",
  human: "w",
  difficulty: "strong",
  castling: { K: true, Q: true, k: true, q: true },
  enPassant: null,
  halfmove: 0,
  fullmove: 1,
  selected: null,
  legalForSelected: [],
  gameOver: false,
  winner: "",
  lastMove: null,
  scores: { w: 0, b: 0, d: 0 },
  turnId: 0,
  zoom: 1,
};

const boardEl = document.querySelector("#board");
const statusLine = document.querySelector("#statusLine");
const hintLine = document.querySelector("#hintLine");
const turnToken = document.querySelector("#turnToken");
const whiteScore = document.querySelector("#whiteScore");
const blackScore = document.querySelector("#blackScore");
const drawScore = document.querySelector("#drawScore");
const modeButtons = document.querySelectorAll("[data-mode]");
const humanButtons = document.querySelectorAll("[data-human]");
const resignButtons = document.querySelectorAll("[data-resign]");
const sideChoice = document.querySelector("#sideChoice");
const difficultyField = document.querySelector("#difficultyField");
const difficultySelect = document.querySelector("#difficulty");
const newGameButton = document.querySelector("#newGame");
const clearScoreButton = document.querySelector("#clearScore");
const resultBanner = document.querySelector("#resultBanner");
const resultKicker = document.querySelector("#resultKicker");
const resultTitle = document.querySelector("#resultTitle");
const bannerNewGameButton = document.querySelector("#bannerNewGame");
const zoomOutButton = document.querySelector("#zoomOut");
const zoomResetButton = document.querySelector("#zoomReset");
const zoomLevel = document.querySelector("#zoomLevel");

function colorOf(piece) {
  if (!piece) return "";
  return piece === piece.toUpperCase() ? "w" : "b";
}

function opponent(color) {
  return color === "w" ? "b" : "w";
}

function rowOf(index) {
  return Math.floor(index / BOARD_SIZE);
}

function colOf(index) {
  return index % BOARD_SIZE;
}

function indexOf(row, col) {
  return (row * BOARD_SIZE) + col;
}

function inBounds(row, col) {
  return row >= 0 && col >= 0 && row < BOARD_SIZE && col < BOARD_SIZE;
}

function rankFile(index) {
  return `${"abcdefgh"[colOf(index)]}${8 - rowOf(index)}`;
}

function clonePosition(position) {
  return {
    board: [...position.board],
    current: position.current,
    castling: { ...position.castling },
    enPassant: position.enPassant,
    halfmove: position.halfmove,
    fullmove: position.fullmove,
  };
}

function currentPosition() {
  return {
    board: state.board,
    current: state.current,
    castling: state.castling,
    enPassant: state.enPassant,
    halfmove: state.halfmove,
    fullmove: state.fullmove,
  };
}

function isCpuTurn() {
  return state.mode === "cpu" && state.current !== state.human;
}

function kingIndex(position, color) {
  const target = color === "w" ? "K" : "k";
  return position.board.indexOf(target);
}

function rayAttacks(position, fromRow, fromCol, byColor, dirs, targets) {
  for (const [dr, dc] of dirs) {
    let row = fromRow + dr;
    let col = fromCol + dc;
    while (inBounds(row, col)) {
      const piece = position.board[indexOf(row, col)];
      if (piece) {
        if (colorOf(piece) === byColor && targets.includes(piece.toLowerCase())) return true;
        break;
      }
      row += dr;
      col += dc;
    }
  }
  return false;
}

function isSquareAttacked(position, index, byColor) {
  const row = rowOf(index);
  const col = colOf(index);
  const pawnRow = row + (byColor === "w" ? 1 : -1);
  for (const dc of [-1, 1]) {
    const pawnCol = col + dc;
    if (inBounds(pawnRow, pawnCol)) {
      const piece = position.board[indexOf(pawnRow, pawnCol)];
      if (piece && colorOf(piece) === byColor && piece.toLowerCase() === "p") return true;
    }
  }
  for (const [dr, dc] of KNIGHT_STEPS) {
    const nextRow = row + dr;
    const nextCol = col + dc;
    if (!inBounds(nextRow, nextCol)) continue;
    const piece = position.board[indexOf(nextRow, nextCol)];
    if (piece && colorOf(piece) === byColor && piece.toLowerCase() === "n") return true;
  }
  for (const [dr, dc] of KING_STEPS) {
    const nextRow = row + dr;
    const nextCol = col + dc;
    if (!inBounds(nextRow, nextCol)) continue;
    const piece = position.board[indexOf(nextRow, nextCol)];
    if (piece && colorOf(piece) === byColor && piece.toLowerCase() === "k") return true;
  }
  return rayAttacks(position, row, col, byColor, BISHOP_DIRS, ["b", "q"])
    || rayAttacks(position, row, col, byColor, ROOK_DIRS, ["r", "q"]);
}

function inCheck(position, color) {
  const king = kingIndex(position, color);
  return king >= 0 && isSquareAttacked(position, king, opponent(color));
}

function addSlideMoves(position, moves, from, color, dirs) {
  const startRow = rowOf(from);
  const startCol = colOf(from);
  for (const [dr, dc] of dirs) {
    let row = startRow + dr;
    let col = startCol + dc;
    while (inBounds(row, col)) {
      const to = indexOf(row, col);
      const piece = position.board[to];
      if (!piece) {
        moves.push({ from, to });
      } else {
        if (colorOf(piece) !== color) moves.push({ from, to, capture: piece });
        break;
      }
      row += dr;
      col += dc;
    }
  }
}

function pseudoMoves(position) {
  const moves = [];
  const color = position.current;
  position.board.forEach((piece, from) => {
    if (!piece || colorOf(piece) !== color) return;
    const type = piece.toLowerCase();
    const row = rowOf(from);
    const col = colOf(from);

    if (type === "p") {
      const dir = color === "w" ? -1 : 1;
      const startRow = color === "w" ? 6 : 1;
      const promotionRow = color === "w" ? 0 : 7;
      const oneRow = row + dir;
      if (inBounds(oneRow, col)) {
        const one = indexOf(oneRow, col);
        if (!position.board[one]) {
          moves.push({ from, to: one, promotion: oneRow === promotionRow ? "q" : "" });
          const twoRow = row + (dir * 2);
          const two = indexOf(twoRow, col);
          if (row === startRow && !position.board[two]) moves.push({ from, to: two, doublePawn: true });
        }
      }
      for (const dc of [-1, 1]) {
        const captureRow = row + dir;
        const captureCol = col + dc;
        if (!inBounds(captureRow, captureCol)) continue;
        const to = indexOf(captureRow, captureCol);
        const target = position.board[to];
        if (target && colorOf(target) !== color) {
          moves.push({ from, to, capture: target, promotion: captureRow === promotionRow ? "q" : "" });
        } else if (position.enPassant === to) {
          moves.push({ from, to, enPassant: true, capture: color === "w" ? "p" : "P" });
        }
      }
      return;
    }

    if (type === "n") {
      for (const [dr, dc] of KNIGHT_STEPS) {
        const nextRow = row + dr;
        const nextCol = col + dc;
        if (!inBounds(nextRow, nextCol)) continue;
        const to = indexOf(nextRow, nextCol);
        const target = position.board[to];
        if (!target || colorOf(target) !== color) moves.push({ from, to, capture: target || "" });
      }
      return;
    }

    if (type === "b") {
      addSlideMoves(position, moves, from, color, BISHOP_DIRS);
      return;
    }
    if (type === "r") {
      addSlideMoves(position, moves, from, color, ROOK_DIRS);
      return;
    }
    if (type === "q") {
      addSlideMoves(position, moves, from, color, QUEEN_DIRS);
      return;
    }

    for (const [dr, dc] of KING_STEPS) {
      const nextRow = row + dr;
      const nextCol = col + dc;
      if (!inBounds(nextRow, nextCol)) continue;
      const to = indexOf(nextRow, nextCol);
      const target = position.board[to];
      if (!target || colorOf(target) !== color) moves.push({ from, to, capture: target || "" });
    }

    if (!inCheck(position, color)) {
      if (color === "w" && from === 60) {
        if (position.castling.K && !position.board[61] && !position.board[62]
          && !isSquareAttacked(position, 61, "b") && !isSquareAttacked(position, 62, "b")) {
          moves.push({ from, to: 62, castle: "K" });
        }
        if (position.castling.Q && !position.board[59] && !position.board[58] && !position.board[57]
          && !isSquareAttacked(position, 59, "b") && !isSquareAttacked(position, 58, "b")) {
          moves.push({ from, to: 58, castle: "Q" });
        }
      }
      if (color === "b" && from === 4) {
        if (position.castling.k && !position.board[5] && !position.board[6]
          && !isSquareAttacked(position, 5, "w") && !isSquareAttacked(position, 6, "w")) {
          moves.push({ from, to: 6, castle: "k" });
        }
        if (position.castling.q && !position.board[3] && !position.board[2] && !position.board[1]
          && !isSquareAttacked(position, 3, "w") && !isSquareAttacked(position, 2, "w")) {
          moves.push({ from, to: 2, castle: "q" });
        }
      }
    }
  });
  return moves;
}

function updateCastlingRights(next, piece, from, to) {
  if (piece === "K") {
    next.castling.K = false;
    next.castling.Q = false;
  }
  if (piece === "k") {
    next.castling.k = false;
    next.castling.q = false;
  }
  if (from === 63 || to === 63) next.castling.K = false;
  if (from === 56 || to === 56) next.castling.Q = false;
  if (from === 7 || to === 7) next.castling.k = false;
  if (from === 0 || to === 0) next.castling.q = false;
}

function makeMove(position, move) {
  const next = clonePosition(position);
  const piece = next.board[move.from];
  const color = colorOf(piece);
  next.board[move.from] = "";
  if (move.enPassant) {
    next.board[move.to + (color === "w" ? 8 : -8)] = "";
  }
  const promotion = move.promotion
    ? (color === "w" ? move.promotion.toUpperCase() : move.promotion)
    : piece;
  next.board[move.to] = promotion;
  if (move.castle === "K") {
    next.board[63] = "";
    next.board[61] = "R";
  } else if (move.castle === "Q") {
    next.board[56] = "";
    next.board[59] = "R";
  } else if (move.castle === "k") {
    next.board[7] = "";
    next.board[5] = "r";
  } else if (move.castle === "q") {
    next.board[0] = "";
    next.board[3] = "r";
  }
  updateCastlingRights(next, piece, move.from, move.to);
  next.enPassant = move.doublePawn ? move.from + (color === "w" ? -8 : 8) : null;
  next.halfmove = piece.toLowerCase() === "p" || move.capture ? 0 : next.halfmove + 1;
  if (color === "b") next.fullmove += 1;
  next.current = opponent(position.current);
  return next;
}

function legalMoves(position = currentPosition()) {
  const color = position.current;
  return pseudoMoves(position).filter((move) => !inCheck(makeMove(position, move), color));
}

function legalMovesFrom(index) {
  return legalMoves().filter((move) => move.from === index);
}

function gameOutcome(position = currentPosition()) {
  const moves = legalMoves(position);
  if (moves.length) return { over: false, winner: "", draw: false, moves };
  if (inCheck(position, position.current)) return { over: true, winner: opponent(position.current), draw: false, moves };
  return { over: true, winner: "", draw: true, moves };
}

function moveLabel(move) {
  const piece = state.board[move.from].toUpperCase();
  const name = piece === "P" ? "" : piece;
  const capture = move.capture ? "x" : "-";
  const suffix = move.promotion ? "=Q" : "";
  if (move.castle === "K" || move.castle === "k") return "O-O";
  if (move.castle === "Q" || move.castle === "q") return "O-O-O";
  return `${name}${rankFile(move.from)}${capture}${rankFile(move.to)}${suffix}`;
}

function pieceSquare(piece, index) {
  const row = rowOf(index);
  const col = colOf(index);
  const color = colorOf(piece);
  const forwardRow = color === "w" ? 7 - row : row;
  const center = 3.5 - (Math.abs(col - 3.5) + Math.abs(row - 3.5));
  const type = piece.toLowerCase();
  if (type === "p") return forwardRow * 8 + center * 4;
  if (type === "n") return center * 18 - (row === 0 || row === 7 || col === 0 || col === 7 ? 24 : 0);
  if (type === "b") return center * 10;
  if (type === "r") return forwardRow * 2;
  if (type === "q") return center * 5;
  return -Math.max(0, forwardRow - 5) * 8;
}

function evaluate(position, rootColor) {
  const outcome = gameOutcome(position);
  if (outcome.over) {
    if (outcome.draw) return 0;
    return outcome.winner === rootColor ? 1000000 : -1000000;
  }
  let score = 0;
  position.board.forEach((piece, index) => {
    if (!piece) return;
    const sign = colorOf(piece) === rootColor ? 1 : -1;
    score += sign * (VALUES[piece.toLowerCase()] + pieceSquare(piece, index));
  });
  const ownPosition = { ...position, current: rootColor };
  const enemyPosition = { ...position, current: opponent(rootColor) };
  score += legalMoves(ownPosition).length * 3;
  score -= legalMoves(enemyPosition).length * 3;
  if (inCheck(position, opponent(rootColor))) score += 38;
  if (inCheck(position, rootColor)) score -= 48;
  return score;
}

function moveScore(position, move) {
  const piece = position.board[move.from];
  const target = move.enPassant ? (colorOf(piece) === "w" ? "p" : "P") : position.board[move.to];
  let score = 0;
  if (target) score += (VALUES[target.toLowerCase()] * 10) - VALUES[piece.toLowerCase()];
  if (move.promotion) score += 850;
  if (move.castle) score += 45;
  const next = makeMove(position, move);
  if (inCheck(next, next.current)) score += 80;
  return score;
}

function orderedMoves(position) {
  return legalMoves(position).sort((a, b) => moveScore(position, b) - moveScore(position, a));
}

function search(position, depth, alpha, beta, rootColor, deadline, ply = 0) {
  if (Date.now() > deadline) return evaluate(position, rootColor);
  const moves = orderedMoves(position);
  if (!moves.length || depth <= 0) return evaluate(position, rootColor) - ply;
  const maximizing = position.current === rootColor;
  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      const value = search(makeMove(position, move), depth - 1, alpha, beta, rootColor, deadline, ply + 1);
      best = Math.max(best, value);
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }
  let best = Infinity;
  for (const move of moves) {
    const value = search(makeMove(position, move), depth - 1, alpha, beta, rootColor, deadline, ply + 1);
    best = Math.min(best, value);
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

function chooseCpuMove() {
  const position = currentPosition();
  const moves = orderedMoves(position);
  if (!moves.length) return null;
  const config = DIFFICULTIES[state.difficulty] || DIFFICULTIES.strong;
  const deadline = Date.now() + config.time;
  const depth = state.difficulty === "impossible" && position.board.filter(Boolean).length <= 18
    ? config.depth + 1
    : config.depth;
  const scored = moves.map((move) => {
    const value = search(makeMove(position, move), depth - 1, -Infinity, Infinity, position.current, deadline, 1);
    return { move, score: value + ((Math.random() - 0.5) * config.noise) };
  }).sort((a, b) => b.score - a.score);
  if (Math.random() < config.blunder && scored.length > 2) {
    const pool = scored.slice(1, Math.min(scored.length, 6));
    return pool[Math.floor(Math.random() * pool.length)].move;
  }
  return scored[0].move;
}

function applyMoveToState(move) {
  const label = moveLabel(move);
  const next = makeMove(currentPosition(), move);
  state.board = next.board;
  state.current = next.current;
  state.castling = next.castling;
  state.enPassant = next.enPassant;
  state.halfmove = next.halfmove;
  state.fullmove = next.fullmove;
  state.selected = null;
  state.legalForSelected = [];
  state.lastMove = { from: move.from, to: move.to };
  state.turnId += 1;
  const outcome = gameOutcome(next);
  if (outcome.over) {
    if (outcome.draw) finishDraw();
    else finishGame(outcome.winner);
    return;
  }
  render();
  maybeCpuMove(label);
}

function pieceName(piece) {
  const names = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
  return `${NAMES[colorOf(piece)]} ${names[piece.toLowerCase()]}`;
}

function pieceAsset(piece) {
  const color = colorOf(piece);
  const type = piece.toLowerCase();
  return `https://images.chesscomfiles.com/chess-themes/pieces/neo/300/${color}${type}.png`;
}

function render() {
  boardEl.innerHTML = "";
  updateBoardZoom();
  whiteScore.textContent = state.scores.w;
  blackScore.textContent = state.scores.b;
  drawScore.textContent = state.scores.d;
  sideChoice.classList.toggle("hidden", state.mode !== "cpu");
  difficultyField.classList.toggle("hidden", state.mode !== "cpu");
  updateResignButtons();

  const legalTargets = new Map(state.legalForSelected.map((move) => [move.to, move]));
  const checkIndex = inCheck(currentPosition(), state.current) ? kingIndex(currentPosition(), state.current) : -1;

  state.board.forEach((piece, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chess-square ${((rowOf(index) + colOf(index)) % 2) ? "dark" : "light"}`;
    button.dataset.index = String(index);
    button.setAttribute("aria-label", `${rankFile(index)}${piece ? ` ${pieceName(piece)}` : ""}`);
    if (piece) {
      const mark = document.createElement("span");
      mark.className = `chess-piece ${colorOf(piece) === "w" ? "white-piece" : "black-piece"} piece-${piece.toLowerCase()}`;
      const image = document.createElement("img");
      image.src = pieceAsset(piece);
      image.alt = "";
      image.draggable = false;
      mark.append(image);
      button.append(mark);
    }
    if (state.selected === index) button.classList.add("selected");
    if (legalTargets.has(index)) button.classList.add(state.board[index] ? "capture-move" : "legal-move");
    if (state.lastMove && (state.lastMove.from === index || state.lastMove.to === index)) button.classList.add("last");
    if (checkIndex === index) button.classList.add("check");
    button.disabled = state.gameOver || isCpuTurn();
    boardEl.append(button);
  });

  updateStatus();
}

function updateBoardZoom() {
  boardEl.style.width = `${Math.round(680 * state.zoom)}px`;
  boardEl.style.maxWidth = state.zoom <= 1 ? "100%" : "none";
  boardEl.style.setProperty("--chess-piece-size", `${Math.round(54 * state.zoom)}px`);
  zoomLevel.textContent = `${Math.round(state.zoom * 100)}%`;
}

function setZoom(nextZoom) {
  state.zoom = Math.min(1, Math.max(0.6, Number(nextZoom.toFixed(2))));
  updateBoardZoom();
}

function updateStatus(lastCpuMove = "") {
  turnToken.textContent = state.current === "w" ? "W" : "B";
  turnToken.className = `turn-token ${state.current === "w" ? "white" : "black"}`;
  if (state.gameOver) return;
  if (isCpuTurn()) {
    statusLine.textContent = `CPU (${NAMES[state.current]}) is thinking.`;
    hintLine.textContent = state.difficulty === "impossible"
      ? "Impossible level is searching the deepest tactical lines."
      : "The CPU is choosing from legal chess moves.";
    return;
  }
  statusLine.textContent = `${NAMES[state.current]}'s turn.`;
  if (inCheck(currentPosition(), state.current)) {
    hintLine.textContent = `${NAMES[state.current]} is in check. Find a legal escape.`;
  } else if (state.selected !== null) {
    hintLine.textContent = "Choose a highlighted square, or choose another piece.";
  } else {
    hintLine.textContent = lastCpuMove ? `CPU played ${lastCpuMove}. Choose a piece.` : "Choose one of your pieces. Legal moves light up.";
  }
}

function finishGame(winner) {
  state.gameOver = true;
  state.winner = winner;
  state.scores[winner] += 1;
  render();
  resultBanner.className = `result-banner ${winner === "w" ? "white" : "black"}`;
  resultKicker.textContent = "Checkmate";
  resultTitle.textContent = `${NAMES[winner]} Wins!`;
  statusLine.textContent = `${NAMES[winner]} wins.`;
  hintLine.textContent = "The king has no legal escape.";
}

function finishDraw() {
  state.gameOver = true;
  state.scores.d += 1;
  render();
  resultBanner.className = "result-banner draw";
  resultKicker.textContent = "Game over";
  resultTitle.textContent = "Draw!";
  statusLine.textContent = "Draw.";
  hintLine.textContent = "No legal winning move remains.";
}

function maybeCpuMove(lastMove = "") {
  if (state.gameOver || !isCpuTurn()) {
    if (lastMove) updateStatus(lastMove);
    return;
  }
  const turn = state.turnId;
  render();
  window.setTimeout(() => {
    if (state.gameOver || !isCpuTurn() || turn !== state.turnId) return;
    const move = chooseCpuMove();
    if (move) applyMoveToState(move);
  }, 180);
}

function resetGame(keepScores = true) {
  state.board = [...START];
  state.current = "w";
  state.castling = { K: true, Q: true, k: true, q: true };
  state.enPassant = null;
  state.halfmove = 0;
  state.fullmove = 1;
  state.selected = null;
  state.legalForSelected = [];
  state.gameOver = false;
  state.winner = "";
  state.lastMove = null;
  state.turnId += 1;
  if (!keepScores) state.scores = { w: 0, b: 0, d: 0 };
  resultBanner.className = "result-banner hidden";
  render();
  maybeCpuMove();
}

function resign(color) {
  if (state.gameOver) return;
  if (state.mode === "cpu" && color !== state.human) return;
  finishGame(opponent(color));
}

function updateResignButtons() {
  resignButtons.forEach((button) => {
    if (!button.dataset.defaultLabel) button.dataset.defaultLabel = button.textContent;
    const isHumanResign = state.mode === "cpu" && button.dataset.resign === state.human;
    button.classList.toggle("hidden", state.mode === "cpu" && !isHumanResign);
    button.textContent = state.mode === "cpu" && isHumanResign ? "Resign" : button.dataset.defaultLabel;
  });
}

boardEl.addEventListener("click", (event) => {
  const square = event.target.closest(".chess-square");
  if (!square || square.disabled) return;
  const index = Number(square.dataset.index);
  const piece = state.board[index];
  const chosenMove = state.legalForSelected.find((move) => move.to === index);
  if (chosenMove) {
    applyMoveToState(chosenMove);
    return;
  }
  if (piece && colorOf(piece) === state.current) {
    state.selected = index;
    state.legalForSelected = legalMovesFrom(index);
  } else {
    state.selected = null;
    state.legalForSelected = [];
  }
  render();
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    modeButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.mode = button.dataset.mode;
    resetGame();
  });
});

humanButtons.forEach((button) => {
  button.addEventListener("click", () => {
    humanButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.human = button.dataset.human;
    resetGame();
  });
});

difficultySelect.addEventListener("change", () => {
  state.difficulty = difficultySelect.value;
  resetGame();
});

resignButtons.forEach((button) => {
  button.addEventListener("click", () => resign(button.dataset.resign));
});

newGameButton.addEventListener("click", () => resetGame());
clearScoreButton.addEventListener("click", () => resetGame(false));
bannerNewGameButton.addEventListener("click", () => resetGame());
zoomOutButton.addEventListener("click", () => setZoom(state.zoom - 0.1));
zoomResetButton.addEventListener("click", () => setZoom(1));
window.addEventListener("resize", updateBoardZoom);

resetGame();
