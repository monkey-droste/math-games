const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const state = {
  classical: Array(9).fill(null),
  moves: [],
  current: "X",
  mode: "human",
  human: "X",
  selected: [],
  pendingCycle: null,
  gameOver: false,
  winner: "",
  winLine: [],
  scores: { X: 0, O: 0, D: 0 },
  turnId: 0,
  zoom: 1,
};

const boardEl = document.querySelector("#board");
const quantumWrap = document.querySelector(".quantum-wrap");
const lineLayer = document.querySelector("#lineLayer");
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
const cyclePanel = document.querySelector("#cyclePanel");
const cycleText = document.querySelector("#cycleText");
const cycleActions = document.querySelector("#cycleActions");
const zoomOutButton = document.querySelector("#zoomOut");
const zoomResetButton = document.querySelector("#zoomReset");
const zoomLevel = document.querySelector("#zoomLevel");

function opponent(mark) {
  return mark === "X" ? "O" : "X";
}

function isCpuTurn() {
  return state.mode === "cpu" && state.current !== state.human;
}

function activeMoves() {
  return state.moves.filter((move) => !move.collapsed);
}

function openCells() {
  return state.classical.map((value, index) => value ? null : index).filter((value) => value !== null);
}

function cellCenter(index) {
  const row = Math.floor(index / 3);
  const col = index % 3;
  return {
    x: ((col + 0.5) / 3) * 100,
    y: ((row + 0.5) / 3) * 100,
  };
}

function hasPath(start, target, ignoredMoveId = null) {
  const graph = Array.from({ length: 9 }, () => []);
  for (const move of activeMoves()) {
    if (move.id === ignoredMoveId) continue;
    const [a, b] = move.cells;
    if (state.classical[a] || state.classical[b]) continue;
    graph[a].push(b);
    graph[b].push(a);
  }

  const seen = new Set([start]);
  const stack = [start];
  while (stack.length) {
    const cell = stack.pop();
    if (cell === target) return true;
    for (const next of graph[cell]) {
      if (seen.has(next)) continue;
      seen.add(next);
      stack.push(next);
    }
  }
  return false;
}

function winnerInfo(classical = state.classical) {
  const winners = [];
  for (const line of WIN_LINES) {
    const values = line.map((index) => classical[index]);
    if (!values.every(Boolean)) continue;
    if (values.every((value) => value.mark === values[0].mark)) {
      winners.push({
        mark: values[0].mark,
        line,
        completedAt: Math.max(...values.map((value) => value.id)),
      });
    }
  }
  winners.sort((a, b) => a.completedAt - b.completedAt);
  return winners[0] || null;
}

function renderLines() {
  lineLayer.innerHTML = "";
  for (const move of activeMoves()) {
    const [a, b] = move.cells;
    if (state.classical[a] || state.classical[b]) continue;
    const start = cellCenter(a);
    const end = cellCenter(b);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", start.x);
    line.setAttribute("y1", start.y);
    line.setAttribute("x2", end.x);
    line.setAttribute("y2", end.y);
    line.setAttribute("stroke", move.mark === "X" ? "#d94f45" : "#2478a6");
    line.setAttribute("stroke-width", "1.5");
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("stroke-dasharray", "3 2");
    line.setAttribute("opacity", "0.78");
    lineLayer.append(line);
  }
}

function renderBoard() {
  boardEl.innerHTML = "";
  updateBoardZoom();
  for (let index = 0; index < 9; index += 1) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cell-button quantum-cell";
    cell.dataset.index = String(index);
    cell.setAttribute("aria-label", `Square ${index + 1}`);

    const classical = state.classical[index];
    if (classical) {
      cell.textContent = classical.mark;
      cell.classList.add("classical", `mark-${classical.mark.toLowerCase()}`);
      if (state.winLine.includes(index)) cell.classList.add("win");
    } else {
      const marks = activeMoves().filter((move) => move.cells.includes(index));
      const list = document.createElement("div");
      list.className = "spooky-list";
      for (const move of marks) {
        const mark = document.createElement("span");
        mark.className = `spooky-mark mark-${move.mark.toLowerCase()}`;
        mark.textContent = `${move.mark}${move.id}`;
        list.append(mark);
      }
      cell.append(list);
      if (state.selected.includes(index)) cell.classList.add("pending");
    }

    cell.disabled = state.gameOver || Boolean(classical) || Boolean(state.pendingCycle) || isCpuTurn();
    boardEl.append(cell);
  }
  renderLines();
}

function updateBoardZoom() {
  quantumWrap.style.width = `${Math.round(690 * state.zoom)}px`;
  quantumWrap.style.maxWidth = state.zoom <= 1 ? "100%" : "none";
  zoomLevel.textContent = `${Math.round(state.zoom * 100)}%`;
  renderLines();
}

function setZoom(nextZoom) {
  state.zoom = Math.min(1, Math.max(0.6, Number(nextZoom.toFixed(2))));
  updateBoardZoom();
}

function updateStatus() {
  xScore.textContent = state.scores.X;
  oScore.textContent = state.scores.O;
  drawScore.textContent = state.scores.D;
  sideChoice.classList.toggle("hidden", state.mode !== "cpu");
  turnToken.textContent = state.current;
  turnToken.className = `turn-token ${state.current.toLowerCase()}`;

  cyclePanel.classList.toggle("hidden", !state.pendingCycle);
  cycleActions.innerHTML = "";
  if (state.pendingCycle) {
    const move = state.moves.find((item) => item.id === state.pendingCycle.moveId);
    cycleText.textContent = `Move ${move.mark}${move.id} made a loop. Choose which square becomes real.`;
    move.cells.forEach((cellIndex) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "text-button";
      button.textContent = `Square ${cellIndex + 1}`;
      button.addEventListener("click", () => collapseFrom(move.id, cellIndex));
      cycleActions.append(button);
    });
  }

  if (state.gameOver) return;
  if (state.pendingCycle) {
    statusLine.textContent = "A quantum loop appeared.";
    hintLine.textContent = "Pick one end of the newest pair; the connected spooky marks will collapse from there.";
    return;
  }
  if (isCpuTurn()) {
    statusLine.textContent = "CPU is thinking.";
    hintLine.textContent = "It is choosing a linked pair of spooky marks.";
    return;
  }
  statusLine.textContent = `${state.current}'s turn.`;
  hintLine.textContent = state.selected.length
    ? "Choose a second different open square to finish the quantum pair."
    : "Choose the first square for a linked quantum pair.";
}

function refresh() {
  renderBoard();
  updateStatus();
}

function finishGame(winner, line = []) {
  state.gameOver = true;
  state.winner = winner;
  state.winLine = line;
  state.scores[winner] += 1;
  refresh();
  resultBanner.className = `result-banner ${winner.toLowerCase()}`;
  resultKicker.textContent = "Game over";
  resultTitle.textContent = `${winner} Wins!`;
  statusLine.textContent = `${winner} wins.`;
  hintLine.textContent = "The earliest completed classical line wins after collapse.";
}

function finishDraw() {
  state.gameOver = true;
  state.scores.D += 1;
  refresh();
  resultBanner.className = "result-banner draw";
  resultKicker.textContent = "Game over";
  resultTitle.textContent = "Draw!";
  statusLine.textContent = "The board collapsed without a winning line.";
  hintLine.textContent = "Start a new game and try a different entanglement.";
}

function checkGameEnd() {
  const winner = winnerInfo();
  if (winner) {
    finishGame(winner.mark, winner.line);
    return true;
  }
  if (!openCells().length) {
    finishDraw();
    return true;
  }
  return false;
}

function collapseFrom(moveId, chosenCell) {
  const result = simulateCollapse(state.classical, state.moves, moveId, chosenCell);
  state.classical = result.classical;
  state.moves = result.moves;
  state.pendingCycle = null;
  state.selected = [];

  if (!checkGameEnd()) {
    state.current = opponent(state.current);
    state.turnId += 1;
    refresh();
    maybeCpuMove();
  }
}

function simulateCollapse(classicalSource, movesSource, moveId, chosenCell) {
  const classical = classicalSource.map((value) => value ? { ...value } : null);
  const moves = movesSource.map((move) => ({ ...move, cells: [...move.cells] }));
  const queue = [{ moveId, cell: chosenCell }];

  while (queue.length) {
    const item = queue.shift();
    const move = moves.find((candidate) => candidate.id === item.moveId);
    if (!move || move.collapsed) continue;
    move.collapsed = true;
    if (!classical[item.cell]) {
      classical[item.cell] = { mark: move.mark, id: move.id };
    }

    for (const otherMove of moves) {
      if (otherMove.collapsed || !otherMove.cells.includes(item.cell)) continue;
      const otherCell = otherMove.cells[0] === item.cell ? otherMove.cells[1] : otherMove.cells[0];
      queue.push({ moveId: otherMove.id, cell: otherCell });
    }
  }

  return { classical, moves };
}

function addQuantumMove(a, b) {
  if (a === b || state.classical[a] || state.classical[b]) return false;
  const closesCycle = hasPath(a, b);
  const move = {
    id: state.moves.length + 1,
    mark: state.current,
    cells: [a, b],
    collapsed: false,
  };
  state.moves.push(move);
  state.selected = [];
  if (closesCycle) {
    state.pendingCycle = { moveId: move.id };
    refresh();
    maybeCpuCollapse();
    return true;
  }
  state.current = opponent(state.current);
  state.turnId += 1;
  refresh();
  maybeCpuMove();
  return true;
}

function choosePair() {
  const cells = openCells();
  let best = null;
  let bestScore = -Infinity;
  for (let i = 0; i < cells.length; i += 1) {
    for (let j = i + 1; j < cells.length; j += 1) {
      const a = cells[i];
      const b = cells[j];
      let score = 0;
      if (hasPath(a, b)) score += 20;
      for (const line of WIN_LINES) {
        if (line.includes(a)) score += 2;
        if (line.includes(b)) score += 2;
        const mine = line.filter((index) => state.classical[index]?.mark === state.current).length;
        const empty = line.filter((index) => !state.classical[index]).length;
        if (mine === 2 && empty) score += (line.includes(a) || line.includes(b)) ? 18 : 0;
      }
      if (a === 4 || b === 4) score += 4;
      score += Math.random();
      if (score > bestScore) {
        bestScore = score;
        best = [a, b];
      }
    }
  }
  return best;
}

function chooseCollapseCell(move) {
  let bestCell = move.cells[0];
  let bestScore = -Infinity;
  for (const cell of move.cells) {
    const trial = simulateCollapse(state.classical, state.moves, move.id, cell);
    const score = evaluateClassical(trial.classical, state.current);
    if (score > bestScore) {
      bestScore = score;
      bestCell = cell;
    }
  }
  return bestCell;
}

function evaluateClassical(classical, mark) {
  const winner = winnerInfo(classical);
  if (winner?.mark === mark) return 1000;
  if (winner?.mark === opponent(mark)) return -1000;
  let score = 0;
  for (const line of WIN_LINES) {
    const values = line.map((index) => classical[index]?.mark || "");
    const mine = values.filter((value) => value === mark).length;
    const theirs = values.filter((value) => value === opponent(mark)).length;
    if (mine && theirs) continue;
    score += mine * mine * 4;
    score -= theirs * theirs * 5;
  }
  return score;
}

function maybeCpuCollapse() {
  if (!state.pendingCycle || !isCpuTurn()) return;
  window.setTimeout(() => {
    if (!state.pendingCycle || !isCpuTurn()) return;
    const move = state.moves.find((item) => item.id === state.pendingCycle.moveId);
    collapseFrom(move.id, chooseCollapseCell(move));
  }, 260);
}

function maybeCpuMove() {
  if (state.gameOver || state.pendingCycle || !isCpuTurn()) return;
  const turn = state.turnId;
  window.setTimeout(() => {
    if (state.gameOver || state.pendingCycle || !isCpuTurn() || turn !== state.turnId) return;
    const pair = choosePair();
    if (pair) addQuantumMove(pair[0], pair[1]);
  }, 280);
}

function resetGame(keepScores = true) {
  state.classical = Array(9).fill(null);
  state.moves = [];
  state.current = "X";
  state.selected = [];
  state.pendingCycle = null;
  state.gameOver = false;
  state.winner = "";
  state.winLine = [];
  state.turnId += 1;
  if (!keepScores) state.scores = { X: 0, O: 0, D: 0 };
  resultBanner.className = "result-banner hidden";
  refresh();
  maybeCpuMove();
}

function resign(mark) {
  if (state.gameOver) return;
  finishGame(opponent(mark));
}

boardEl.addEventListener("click", (event) => {
  const cell = event.target.closest(".quantum-cell");
  if (!cell || cell.disabled) return;
  const index = Number(cell.dataset.index);
  if (state.selected.includes(index)) {
    state.selected = state.selected.filter((value) => value !== index);
    refresh();
    return;
  }
  state.selected.push(index);
  if (state.selected.length === 2) {
    addQuantumMove(state.selected[0], state.selected[1]);
  } else {
    refresh();
  }
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
