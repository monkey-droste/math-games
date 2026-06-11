const EMPTY = "";
const ARROW = "#";
const WHITE = "W";
const BLACK = "B";
const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

function squareFromName(name, size) {
  const match = /^([A-Z])(\d+)$/.exec(name);
  return [size - Number(match[2]), match[1].charCodeAt(0) - 65];
}

const SETUPS = {
  8: {
    amazons: 3,
    white: ["A2", "E1", "H3"].map((name) => squareFromName(name, 8)),
    black: ["A6", "D8", "H7"].map((name) => squareFromName(name, 8)),
  },
  10: {
    amazons: 4,
    white: ["A4", "D1", "G1", "J4"].map((name) => squareFromName(name, 10)),
    black: ["A7", "D10", "G10", "J7"].map((name) => squareFromName(name, 10)),
  },
  6: {
    amazons: 2,
    white: ["D1", "C6"].map((name) => squareFromName(name, 6)),
    black: ["A4", "F3"].map((name) => squareFromName(name, 6)),
  },
};

const state = {
  size: 8,
  board: [],
  current: WHITE,
  mode: "human",
  humanSide: WHITE,
  phase: "select",
  selected: null,
  moveTarget: null,
  legalTargets: [],
  lastCpuMove: null,
  gameOver: false,
  scores: { W: 0, B: 0 },
  turnId: 0,
  zoom: 1,
};

const boardEl = document.querySelector("#board");
const boardSizeEl = document.querySelector("#boardSize");
const statusLine = document.querySelector("#statusLine");
const hintLine = document.querySelector("#hintLine");
const turnBadge = document.querySelector("#turnBadge");
const modeButtons = document.querySelectorAll("[data-mode]");
const sideButtons = document.querySelectorAll("[data-side]");
const resignButtons = document.querySelectorAll("[data-resign]");
const sideField = document.querySelector("#sideField");
const newGameButton = document.querySelector("#newGame");
const resetScoreButton = document.querySelector("#resetScore");
const whiteScore = document.querySelector("#whiteScore");
const blackScore = document.querySelector("#blackScore");
const resultBanner = document.querySelector("#resultBanner");
const resultKicker = document.querySelector("#resultKicker");
const resultTitle = document.querySelector("#resultTitle");
const bannerNewGame = document.querySelector("#bannerNewGame");
const boardWrap = document.querySelector(".board-wrap");
const zoomOutButton = document.querySelector("#zoomOut");
const zoomResetButton = document.querySelector("#zoomReset");
const zoomLevel = document.querySelector("#zoomLevel");

function opponent(player) {
  return player === WHITE ? BLACK : WHITE;
}

function playerName(player) {
  return player === WHITE ? "Gold" : "Teal";
}

function playerClass(player) {
  return player === WHITE ? "gold" : "teal";
}

function coordName(row, col) {
  return `${String.fromCharCode(65 + col)}${state.size - row}`;
}

function sameSquare(a, b) {
  return Boolean(a && b && a.row === b.row && a.col === b.col);
}

function makeBoard(size) {
  return Array.from({ length: size }, () => Array(size).fill(EMPTY));
}

function setupBoard(size) {
  const board = makeBoard(size);
  const setup = SETUPS[size];
  setup.white.forEach(([row, col]) => {
    board[row][col] = WHITE;
  });
  setup.black.forEach(([row, col]) => {
    board[row][col] = BLACK;
  });
  return board;
}

function inBounds(row, col, size = state.size) {
  return row >= 0 && col >= 0 && row < size && col < size;
}

function raySquares(board, start) {
  const size = board.length;
  const squares = [];

  for (const [rowStep, colStep] of DIRECTIONS) {
    let row = start.row + rowStep;
    let col = start.col + colStep;
    while (inBounds(row, col, size) && board[row][col] === EMPTY) {
      squares.push({ row, col });
      row += rowStep;
      col += colStep;
    }
  }

  return squares;
}

function amazons(board, player) {
  const pieces = [];
  board.forEach((rowValues, row) => {
    rowValues.forEach((value, col) => {
      if (value === player) pieces.push({ row, col });
    });
  });
  return pieces;
}

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

function movePieceOn(board, start, end) {
  const copy = cloneBoard(board);
  const player = copy[start.row][start.col];
  copy[start.row][start.col] = EMPTY;
  copy[end.row][end.col] = player;
  return copy;
}

function legalMoves(board, player, limit = Infinity) {
  const moves = [];

  for (const start of amazons(board, player)) {
    for (const end of raySquares(board, start)) {
      const moved = movePieceOn(board, start, end);
      for (const arrow of raySquares(moved, end)) {
        moves.push({ start, end, arrow });
        if (moves.length >= limit) return moves;
      }
    }
  }

  return moves;
}

function hasLegalMove(player) {
  return legalMoves(state.board, player, 1).length > 0;
}

function mobility(board, player) {
  return amazons(board, player)
    .reduce((total, piece) => total + raySquares(board, piece).length, 0);
}

function applyMove(move, player) {
  state.board[move.start.row][move.start.col] = EMPTY;
  state.board[move.end.row][move.end.col] = player;
  state.board[move.arrow.row][move.arrow.col] = ARROW;
}

function lastCpuMarked(square) {
  if (!state.lastCpuMove) return false;
  return sameSquare(square, state.lastCpuMove.end);
}

function squareInList(square, list) {
  return list.some((item) => sameSquare(square, item));
}

function isCpuTurn() {
  return state.mode === "cpu" && state.current !== state.humanSide;
}

function resetGame(keepScore = true) {
  state.size = Number(boardSizeEl.value);
  state.board = setupBoard(state.size);
  state.current = WHITE;
  state.phase = "select";
  state.selected = null;
  state.moveTarget = null;
  state.legalTargets = [];
  state.lastCpuMove = null;
  state.gameOver = false;
  state.turnId += 1;
  if (!keepScore) state.scores = { W: 0, B: 0 };
  resultBanner.className = "result-banner hidden";
  render();
  maybeCpuMove();
}

function render() {
  boardEl.innerHTML = "";
  fitBoardSize();
  boardEl.style.gridTemplateColumns = `repeat(${state.size}, 1fr)`;
  boardEl.style.gridTemplateRows = `repeat(${state.size}, 1fr)`;
  whiteScore.textContent = state.scores.W;
  blackScore.textContent = state.scores.B;
  sideField.classList.toggle("hidden", state.mode !== "cpu");

  for (let row = 0; row < state.size; row += 1) {
    for (let col = 0; col < state.size; col += 1) {
      const square = document.createElement("button");
      const value = state.board[row][col];
      const currentSquare = { row, col };
      square.type = "button";
      square.className = `square ${(row + col) % 2 === 0 ? "light" : "dark"}`;
      square.dataset.row = String(row);
      square.dataset.col = String(col);
      square.setAttribute("aria-label", coordName(row, col));

      if (value === ARROW) {
        square.classList.add("blocked");
      }
      if (squareInList(currentSquare, state.legalTargets)) {
        square.classList.add("legal");
        square.classList.add(state.phase === "arrow" ? "arrow-target" : "move-target", `${playerClass(state.current)}-turn`);
      }
      if (sameSquare(currentSquare, state.selected) || sameSquare(currentSquare, state.moveTarget)) {
        square.classList.add("selected");
      }
      if (lastCpuMarked(currentSquare)) {
        square.classList.add("last-cpu");
      }

      if (value === WHITE || value === BLACK) {
        const piece = document.createElement("span");
        piece.className = `piece ${playerClass(value)}`;
        square.append(piece);
      }

      if (row === state.size - 1 || col === 0) {
        const coord = document.createElement("span");
        coord.className = "coord";
        coord.textContent = row === state.size - 1 && col === 0
          ? coordName(row, col)
          : row === state.size - 1
            ? String.fromCharCode(65 + col)
            : String(state.size - row);
        square.append(coord);
      }

      boardEl.append(square);
    }
  }

  updateStatus();
}

function fitBoardSize() {
  const border = 10;
  const available = Math.min(boardWrap.clientWidth || 820, 820);
  const cellSize = Math.max(18, Math.floor(((available - border) / state.size) * state.zoom));
  const boardSize = (cellSize * state.size) + border;
  boardEl.style.width = `${boardSize}px`;
  zoomLevel.textContent = `${Math.round(state.zoom * 100)}%`;
}

function setZoom(nextZoom) {
  state.zoom = Math.min(1, Math.max(0.6, Number(nextZoom.toFixed(2))));
  fitBoardSize();
}

function updateStatus() {
  turnBadge.textContent = "";
  turnBadge.className = `turn-badge ${playerClass(state.current)}`;
  turnBadge.setAttribute("aria-label", `${playerName(state.current)} turn`);

  if (state.gameOver) return;

  if (isCpuTurn()) {
    statusLine.textContent = `CPU (${playerName(state.current)}) is thinking.`;
    hintLine.textContent = "The computer is choosing a move and an arrow shot.";
    return;
  }

  if (state.phase === "select") {
    statusLine.textContent = `${playerName(state.current)}: choose an amazon.`;
    hintLine.textContent = `Board: ${state.size} x ${state.size}, ${SETUPS[state.size].amazons} amazons each.`;
  } else if (state.phase === "move") {
    statusLine.textContent = `Move from ${coordName(state.selected.row, state.selected.col)}.`;
    hintLine.textContent = `Choose a square with a ${playerName(state.current).toLowerCase()} dot. Amazons move like chess queens.`;
  } else {
    statusLine.textContent = `Shoot an arrow from ${coordName(state.moveTarget.row, state.moveTarget.col)}.`;
    hintLine.textContent = "Choose a square with a red dot. That square will disappear.";
  }
}

function finishGame(winner, statusText, hintText) {
  state.gameOver = true;
  state.phase = "select";
  state.selected = null;
  state.moveTarget = null;
  state.legalTargets = [];
  state.lastCpuMove = null;
  state.scores[winner] += 1;
  render();
  resultBanner.className = `result-banner ${playerClass(winner)}`;
  resultKicker.textContent = "Game over";
  resultTitle.textContent = `${playerName(winner)} Wins!`;
  statusLine.textContent = statusText;
  hintLine.textContent = hintText;
}

function endTurn() {
  state.phase = "select";
  state.selected = null;
  state.moveTarget = null;
  state.legalTargets = [];
  state.current = opponent(state.current);
  state.turnId += 1;

  if (!hasLegalMove(state.current)) {
    const winner = opponent(state.current);
    finishGame(
      winner,
      `${playerName(state.current)} has no legal moves.`,
      `${playerName(winner)} wins the game.`,
    );
    return;
  }

  render();
  maybeCpuMove();
}

function handleSquareClick(row, col) {
  if (state.gameOver || isCpuTurn()) return;

  const value = state.board[row][col];
  const square = { row, col };

  if (state.phase === "select") {
    if (value !== state.current) {
      statusLine.textContent = `${playerName(state.current)} must choose one of their own amazons.`;
      return;
    }
    state.lastCpuMove = null;
    state.selected = square;
    state.legalTargets = raySquares(state.board, square);
    state.phase = "move";
    render();
    return;
  }

  if (state.phase === "move") {
    if (value === state.current) {
      state.selected = square;
      state.legalTargets = raySquares(state.board, square);
      render();
      return;
    }
    if (!squareInList(square, state.legalTargets)) {
      statusLine.textContent = "That square is unavailable or not in a queen line.";
      return;
    }
    state.board = movePieceOn(state.board, state.selected, square);
    state.moveTarget = square;
    state.legalTargets = raySquares(state.board, square);
    state.phase = "arrow";
    render();
    return;
  }

  if (state.phase === "arrow") {
    if (!squareInList(square, state.legalTargets)) {
      statusLine.textContent = "The arrow cannot land there.";
      return;
    }
    state.board[row][col] = ARROW;
    endTurn();
  }
}

function resign(player) {
  if (state.gameOver) return;
  const winner = opponent(player);
  finishGame(
    winner,
    `${playerName(player)} resigns.`,
    `${playerName(winner)} wins the game.`,
  );
}

function chooseCpuMove() {
  const moveLimit = state.size === 10 ? 900 : state.size === 8 ? 600 : 260;
  const allMoves = legalMoves(state.board, state.current, moveLimit);
  if (!allMoves.length) return null;

  const shuffled = [...allMoves].sort(() => Math.random() - 0.5);
  const sampleLimit = state.size === 10 ? 320 : state.size === 8 ? 220 : 140;
  const candidates = shuffled.slice(0, sampleLimit);
  let bestScore = -Infinity;
  let bestMoves = [];

  for (const move of candidates) {
    const trial = movePieceOn(state.board, move.start, move.end);
    trial[move.arrow.row][move.arrow.col] = ARROW;

    const myMobility = mobility(trial, state.current);
    const theirMobility = mobility(trial, opponent(state.current));
    const edgePenalty = isEdge(move.end, state.size) ? -2 : 0;
    const centerBonus = centerScore(move.end, state.size);
    const score = myMobility - (theirMobility * 1.8) + centerBonus + edgePenalty + Math.random();

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

function centerScore(square, size) {
  const center = (size - 1) / 2;
  const distance = Math.abs(square.row - center) + Math.abs(square.col - center);
  return Math.max(0, size - distance) * 0.2;
}

function isEdge(square, size) {
  return square.row === 0 || square.col === 0 || square.row === size - 1 || square.col === size - 1;
}

function maybeCpuMove() {
  if (state.gameOver || !isCpuTurn()) return;
  const turn = state.turnId;
  render();
  window.setTimeout(() => {
    if (turn !== state.turnId || state.gameOver || !isCpuTurn()) return;
    const move = chooseCpuMove();
    if (!move) return;
    applyMove(move, state.current);
    state.lastCpuMove = move;
    endTurn();
  }, 120);
}

boardEl.addEventListener("click", (event) => {
  const square = event.target.closest(".square");
  if (!square) return;
  handleSquareClick(Number(square.dataset.row), Number(square.dataset.col));
});

boardSizeEl.addEventListener("change", () => resetGame());

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    modeButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.mode = button.dataset.mode;
    resetGame();
  });
});

sideButtons.forEach((button) => {
  button.addEventListener("click", () => {
    sideButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.humanSide = button.dataset.side;
    resetGame();
  });
});

resignButtons.forEach((button) => {
  button.addEventListener("click", () => resign(button.dataset.resign));
});

newGameButton.addEventListener("click", () => resetGame());
bannerNewGame.addEventListener("click", () => resetGame());
resetScoreButton.addEventListener("click", () => resetGame(false));
zoomOutButton.addEventListener("click", () => setZoom(state.zoom - 0.1));
zoomResetButton.addEventListener("click", () => setZoom(1));
window.addEventListener("resize", () => {
  fitBoardSize();
});

resetGame();
