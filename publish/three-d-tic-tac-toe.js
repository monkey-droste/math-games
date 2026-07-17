const SIZE = 4;
const CELL_COUNT = SIZE * SIZE * SIZE;
const DIRECTIONS = [
  [1, 0, 0], [0, 1, 0], [0, 0, 1],
  [1, 1, 0], [1, -1, 0], [1, 0, 1], [1, 0, -1],
  [0, 1, 1], [0, 1, -1],
  [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
];

const state = {
  board: Array(CELL_COUNT).fill(""),
  current: "X",
  mode: "human",
  human: "X",
  gameOver: false,
  winner: "",
  lastMove: null,
  winLine: [],
  scores: { X: 0, O: 0, D: 0 },
  turnId: 0,
  zoom: 1,
};

const MARKS = {
  X: { symbol: "X" },
  O: { symbol: "O" },
};

const boardEl = document.querySelector("#board");
const sceneEl = document.querySelector(".ttt3d-scene");
const statusLine = document.querySelector("#statusLine");
const hintLine = document.querySelector("#hintLine");
const turnToken = document.querySelector("#turnToken");
const xScore = document.querySelector("#xScore");
const oScore = document.querySelector("#oScore");
const drawScore = document.querySelector("#drawScore");
const modeButtons = document.querySelectorAll("[data-mode]");
const humanButtons = document.querySelectorAll("[data-human]");
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

function opponent(mark) {
  return mark === "X" ? "O" : "X";
}

function indexOf(x, y, z) {
  return (z * SIZE * SIZE) + (y * SIZE) + x;
}

function coordsOf(index) {
  const z = Math.floor(index / (SIZE * SIZE));
  const rest = index % (SIZE * SIZE);
  return { x: rest % SIZE, y: Math.floor(rest / SIZE), z };
}

function inBounds(x, y, z) {
  return x >= 0 && y >= 0 && z >= 0 && x < SIZE && y < SIZE && z < SIZE;
}

function allLines() {
  const lines = [];
  const seen = new Set();
  for (let z = 0; z < SIZE; z += 1) {
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        for (const [dx, dy, dz] of DIRECTIONS) {
          const endX = x + ((SIZE - 1) * dx);
          const endY = y + ((SIZE - 1) * dy);
          const endZ = z + ((SIZE - 1) * dz);
          if (!inBounds(endX, endY, endZ)) continue;
          const line = Array.from({ length: SIZE }, (_, offset) => {
            return indexOf(x + (offset * dx), y + (offset * dy), z + (offset * dz));
          });
          const key = [...line].sort((a, b) => a - b).join("-");
          if (seen.has(key)) continue;
          seen.add(key);
          lines.push(line);
        }
      }
    }
  }
  return lines;
}

const LINES = allLines();

function isCpuTurn() {
  return state.mode === "cpu" && state.current !== state.human;
}

function emptyCells(board = state.board) {
  return board.map((value, index) => value ? null : index).filter((value) => value !== null);
}

function winnerLine(board = state.board) {
  for (const line of LINES) {
    const values = line.map((index) => board[index]);
    if (values[0] && values.every((value) => value === values[0])) {
      return line;
    }
  }
  return [];
}

function render() {
  boardEl.innerHTML = "";
  updateBoardZoom();
  xScore.textContent = state.scores.X;
  oScore.textContent = state.scores.O;
  drawScore.textContent = state.scores.D;
  sideChoice.classList.toggle("hidden", state.mode !== "cpu");
  updateResignButtons();

  for (let z = 0; z < SIZE; z += 1) {
    const layer = document.createElement("section");
    layer.className = "layer-card";
    layer.setAttribute("aria-label", `Layer ${z + 1}`);
    const heading = document.createElement("h2");
    heading.textContent = `Layer ${z + 1}`;
    const grid = document.createElement("div");
    grid.className = "layer-grid";

    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        const index = indexOf(x, y, z);
        const value = state.board[index];
        const button = document.createElement("button");
        button.type = "button";
        button.className = `cell-button cell-3d depth-${z}`;
        button.dataset.index = String(index);
        button.setAttribute("aria-label", `Layer ${z + 1}, row ${y + 1}, column ${x + 1}`);
        button.textContent = value ? MARKS[value].symbol : "";
        if (value) button.classList.add(`mark-${value.toLowerCase()}`);
        if (state.lastMove === index) button.classList.add("last");
        if (state.winLine.includes(index)) button.classList.add("win");
        button.disabled = state.gameOver || Boolean(value) || isCpuTurn();
        grid.append(button);
      }
    }

    layer.append(heading, grid);
    boardEl.append(layer);
  }

  updateStatus();
}

function updateBoardZoom() {
  sceneEl.style.width = `${Math.round(760 * state.zoom)}px`;
  sceneEl.style.maxWidth = state.zoom <= 1 ? "100%" : "none";
  boardEl.style.setProperty("--cell-mark-size", `${Math.round(40 * state.zoom)}px`);
  zoomLevel.textContent = `${Math.round(state.zoom * 100)}%`;
}

function setZoom(nextZoom) {
  state.zoom = Math.min(1, Math.max(0.6, Number(nextZoom.toFixed(2))));
  updateBoardZoom();
}

function updateStatus() {
  turnToken.textContent = MARKS[state.current].symbol;
  turnToken.className = `turn-token ${state.current.toLowerCase()}`;
  if (state.gameOver) return;
  if (isCpuTurn()) {
    statusLine.textContent = `CPU (${state.current}) is thinking.`;
    hintLine.textContent = "It is scanning the cube for threats and lines.";
    return;
  }
  statusLine.textContent = `${state.current}'s turn.`;
  hintLine.textContent = "Choose any open cube. Four in a straight 3D line wins.";
}

function finishGame(winner, line = []) {
  state.gameOver = true;
  state.winner = winner;
  state.winLine = line;
  state.scores[winner] += 1;
  render();
  resultBanner.className = `result-banner ${winner.toLowerCase()}`;
  resultKicker.textContent = "Game over";
  resultTitle.textContent = `${winner} Wins!`;
  statusLine.textContent = `${winner} wins in 3D.`;
  hintLine.textContent = "The highlighted cubes make a straight line through the cube.";
}

function finishDraw() {
  state.gameOver = true;
  state.scores.D += 1;
  render();
  resultBanner.className = "result-banner draw";
  resultKicker.textContent = "Game over";
  resultTitle.textContent = "Draw!";
  statusLine.textContent = "The cube is full.";
  hintLine.textContent = "No four-cube line was completed.";
}

function placeAt(index) {
  if (state.gameOver || state.board[index]) return false;
  state.board[index] = state.current;
  state.lastMove = index;
  const line = winnerLine();
  if (line.length) {
    finishGame(state.current, line);
    return true;
  }
  if (!emptyCells().length) {
    finishDraw();
    return true;
  }
  state.current = opponent(state.current);
  state.turnId += 1;
  render();
  maybeCpuMove();
  return true;
}

function scoreLine(values, mark) {
  const mine = values.filter((value) => value === mark).length;
  const theirs = values.filter((value) => value === opponent(mark)).length;
  if (mine && theirs) return 0;
  if (mine === 4) return 100000;
  if (mine === 3) return 2200;
  if (mine === 2) return 120;
  if (mine === 1) return 8;
  if (theirs === 3) return -2600;
  if (theirs === 2) return -160;
  if (theirs === 1) return -10;
  return 0;
}

function evaluateBoard(board, mark) {
  const line = winnerLine(board);
  if (line.length) return board[line[0]] === mark ? 100000 : -100000;
  let score = 0;
  for (const lineCells of LINES) {
    score += scoreLine(lineCells.map((index) => board[index]), mark);
  }
  return score;
}

function chooseCpuMove() {
  const mark = state.current;
  const moves = emptyCells().map((index) => {
    const trial = [...state.board];
    trial[index] = mark;
    let score = evaluateBoard(trial, mark);
    const replyScores = emptyCells(trial).map((replyIndex) => {
      const reply = [...trial];
      reply[replyIndex] = opponent(mark);
      return evaluateBoard(reply, opponent(mark));
    });
    if (replyScores.length) score -= Math.max(...replyScores) * 0.55;
    const { x, y, z } = coordsOf(index);
    const center = Math.abs(x - 1.5) + Math.abs(y - 1.5) + Math.abs(z - 1.5);
    score += (SIZE * 2 - center) * 0.2;
    return { index, score: score + Math.random() * 0.01 };
  });
  moves.sort((a, b) => b.score - a.score);
  return moves[0]?.index ?? null;
}

function maybeCpuMove() {
  if (state.gameOver || !isCpuTurn()) return;
  const turn = state.turnId;
  window.setTimeout(() => {
    if (state.gameOver || !isCpuTurn() || turn !== state.turnId) return;
    const move = chooseCpuMove();
    if (move !== null) placeAt(move);
  }, 260);
}

function resetGame(keepScores = true) {
  state.board = Array(CELL_COUNT).fill("");
  state.current = "X";
  state.gameOver = false;
  state.winner = "";
  state.lastMove = null;
  state.winLine = [];
  state.turnId += 1;
  if (!keepScores) state.scores = { X: 0, O: 0, D: 0 };
  resultBanner.className = "result-banner hidden";
  render();
  maybeCpuMove();
}

function resign(mark) {
  if (state.gameOver) return;
  if (state.mode === "cpu" && mark !== state.human) return;
  finishGame(opponent(mark));
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
  const button = event.target.closest(".cell-3d");
  if (!button || button.disabled) return;
  placeAt(Number(button.dataset.index));
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
