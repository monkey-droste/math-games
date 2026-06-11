const SIZE = 6;
const WIN_LENGTH = 5;
const PLAYERS = {
  O: { name: "Order", className: "order" },
  C: { name: "Chaos", className: "chaos" },
};
const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

const state = {
  board: Array(SIZE * SIZE).fill(""),
  current: "O",
  mode: "human",
  human: "O",
  selectedSymbol: "X",
  gameOver: false,
  winner: "",
  lastMove: null,
  winLine: [],
  scores: { O: 0, C: 0, D: 0 },
  turnId: 0,
  zoom: 1,
};

const boardEl = document.querySelector("#board");
const statusLine = document.querySelector("#statusLine");
const hintLine = document.querySelector("#hintLine");
const turnToken = document.querySelector("#turnToken");
const orderScore = document.querySelector("#orderScore");
const chaosScore = document.querySelector("#chaosScore");
const drawScore = document.querySelector("#drawScore");
const modeButtons = document.querySelectorAll("[data-mode]");
const humanButtons = document.querySelectorAll("[data-human]");
const symbolButtons = document.querySelectorAll("[data-symbol]");
const resignButtons = document.querySelectorAll("[data-resign]");
const sideChoice = document.querySelector("#sideChoice");
const newGameButton = document.querySelector("#newGame");
const clearScoreButton = document.querySelector("#clearScore");
const resultBanner = document.querySelector("#resultBanner");
const resultKicker = document.querySelector("#resultKicker");
const resultTitle = document.querySelector("#resultTitle");
const bannerNewGameButton = document.querySelector("#bannerNewGame");
const zoomOutButton = document.querySelector("#zoomOut");
const zoomResetButton = document.querySelector("#zoomReset");
const zoomLevel = document.querySelector("#zoomLevel");

function opponent(player) {
  return player === "O" ? "C" : "O";
}

function indexOf(row, col) {
  return row * SIZE + col;
}

function inBounds(row, col) {
  return row >= 0 && col >= 0 && row < SIZE && col < SIZE;
}

function isCpuTurn() {
  return state.mode === "cpu" && state.current !== state.human;
}

function emptyCells(board = state.board) {
  return board.map((value, index) => value ? null : index).filter((value) => value !== null);
}

function allLines() {
  const lines = [];
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      for (const [dr, dc] of DIRECTIONS) {
        const endRow = row + ((WIN_LENGTH - 1) * dr);
        const endCol = col + ((WIN_LENGTH - 1) * dc);
        if (!inBounds(endRow, endCol)) continue;
        lines.push(Array.from({ length: WIN_LENGTH }, (_, offset) => {
          return indexOf(row + (offset * dr), col + (offset * dc));
        }));
      }
    }
  }
  return lines;
}

const LINES = allLines();

function orderLine(board = state.board) {
  for (const line of LINES) {
    const values = line.map((index) => board[index]);
    if (values.every((value) => value === "X") || values.every((value) => value === "O")) {
      return line;
    }
  }
  return [];
}

function gameResult(board = state.board) {
  const line = orderLine(board);
  if (line.length) return { winner: "O", line };
  if (!emptyCells(board).length) return { winner: "C", line: [] };
  return { winner: "", line: [] };
}

function render() {
  boardEl.innerHTML = "";
  updateBoardZoom();
  orderScore.textContent = state.scores.O;
  chaosScore.textContent = state.scores.C;
  drawScore.textContent = state.scores.D;
  sideChoice.classList.toggle("hidden", state.mode !== "cpu");

  state.board.forEach((value, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cell-button order-cell";
    button.dataset.index = String(index);
    button.setAttribute("aria-label", `Row ${Math.floor(index / SIZE) + 1}, column ${(index % SIZE) + 1}`);
    button.textContent = value;
    if (value) button.classList.add(value.toLowerCase());
    if (state.lastMove === index) button.classList.add("last");
    if (state.winLine.includes(index)) button.classList.add("win");
    button.disabled = state.gameOver || Boolean(value) || isCpuTurn();
    boardEl.append(button);
  });

  updateStatus();
}

function updateBoardZoom() {
  boardEl.style.width = `${Math.round(680 * state.zoom)}px`;
  boardEl.style.maxWidth = state.zoom <= 1 ? "100%" : "none";
  zoomLevel.textContent = `${Math.round(state.zoom * 100)}%`;
}

function setZoom(nextZoom) {
  state.zoom = Math.min(1, Math.max(0.6, Number(nextZoom.toFixed(2))));
  updateBoardZoom();
}

function updateStatus() {
  turnToken.textContent = state.current;
  turnToken.className = `turn-token ${PLAYERS[state.current].className}`;

  if (state.gameOver) return;

  if (isCpuTurn()) {
    statusLine.textContent = `CPU (${PLAYERS[state.current].name}) is thinking.`;
    hintLine.textContent = "It can choose either X or O before placing.";
    return;
  }

  statusLine.textContent = `${PLAYERS[state.current].name}'s turn.`;
  hintLine.textContent = `${PLAYERS[state.current].name} will place ${state.selectedSymbol}. Change the symbol before choosing a square.`;
}

function finishGame(winner, line = []) {
  state.gameOver = true;
  state.winner = winner;
  state.winLine = line;
  state.scores[winner] += 1;
  render();
  resultBanner.className = `result-banner ${PLAYERS[winner].className}`;
  resultKicker.textContent = "Game over";
  resultTitle.textContent = `${PLAYERS[winner].name} Wins!`;
  statusLine.textContent = `${PLAYERS[winner].name} wins.`;
  hintLine.textContent = winner === "O"
    ? "Order made five matching marks in a row."
    : "Chaos filled the board without allowing a five-in-a-row.";
}

function placeAt(index, symbol) {
  if (state.gameOver || state.board[index]) return false;
  state.board[index] = symbol;
  state.lastMove = index;
  state.turnId += 1;
  const result = gameResult();
  if (result.winner) {
    finishGame(result.winner, result.line);
    return true;
  }
  state.current = opponent(state.current);
  render();
  maybeCpuMove();
  return true;
}

function scoreLine(values, symbol) {
  const other = symbol === "X" ? "O" : "X";
  const mine = values.filter((value) => value === symbol).length;
  const rival = values.filter((value) => value === other).length;
  if (mine && rival) return 0;
  if (mine === 5) return 100000;
  if (mine === 4) return 1600;
  if (mine === 3) return 180;
  if (mine === 2) return 30;
  if (rival === 4) return 1200;
  if (rival === 3) return 120;
  return mine * 4;
}

function evaluateBoard(board) {
  const result = gameResult(board);
  if (result.winner === "O") return 100000;
  if (result.winner === "C") return -100000;

  let score = 0;
  for (const line of LINES) {
    score += scoreLine(line.map((index) => board[index]), "X");
    score += scoreLine(line.map((index) => board[index]), "O");
  }
  return score;
}

function chooseCpuMove() {
  const moves = [];
  for (const index of emptyCells()) {
    for (const symbol of ["X", "O"]) {
      const board = [...state.board];
      board[index] = symbol;
      let score = evaluateBoard(board);
      if (state.current === "C") score *= -1;
      const center = Math.abs((index % SIZE) - 2.5) + Math.abs(Math.floor(index / SIZE) - 2.5);
      score += (SIZE - center) * 0.01;
      moves.push({ index, symbol, score });
    }
  }
  moves.sort((a, b) => b.score - a.score);
  const bestScore = moves[0]?.score ?? 0;
  const best = moves.filter((move) => Math.abs(move.score - bestScore) < 0.0001);
  return best[Math.floor(Math.random() * best.length)] || null;
}

function maybeCpuMove() {
  if (state.gameOver || !isCpuTurn()) return;
  const turn = state.turnId;
  window.setTimeout(() => {
    if (state.gameOver || !isCpuTurn() || turn !== state.turnId) return;
    const move = chooseCpuMove();
    if (move) placeAt(move.index, move.symbol);
  }, 220);
}

function resetGame(keepScores = true) {
  state.board = Array(SIZE * SIZE).fill("");
  state.current = "O";
  state.gameOver = false;
  state.winner = "";
  state.lastMove = null;
  state.winLine = [];
  state.turnId += 1;
  if (!keepScores) state.scores = { O: 0, C: 0, D: 0 };
  resultBanner.className = "result-banner hidden";
  render();
  maybeCpuMove();
}

function resign(player) {
  if (state.gameOver) return;
  finishGame(opponent(player));
}

boardEl.addEventListener("click", (event) => {
  const button = event.target.closest(".order-cell");
  if (!button || button.disabled) return;
  placeAt(Number(button.dataset.index), state.selectedSymbol);
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

symbolButtons.forEach((button) => {
  button.addEventListener("click", () => {
    symbolButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.selectedSymbol = button.dataset.symbol;
    updateStatus();
  });
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
