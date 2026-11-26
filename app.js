(() => {
  "use strict";

  // =========================================================================
  // Constants & Theme Palettes
  // =========================================================================
  const ALGO_META = {
    bfs: {
      id: "bfs",
      name: "BFS 廣度優先",
      fullName: "BFS 廣度優先搜尋",
      dotClass: "algo-bfs",
      exploredFill: "rgba(56, 189, 248, 0.25)",
      exploredStroke: "rgba(56, 189, 248, 0.45)",
      frontierFill: "rgba(244, 114, 182, 0.72)",
      headColor: "#f472b6",
      pathColor: "#fde047",
      pathGlow: "rgba(253, 224, 71, 0.75)"
    },
    dfs: {
      id: "dfs",
      name: "DFS 深度優先",
      fullName: "DFS 深度優先搜尋",
      dotClass: "algo-dfs",
      exploredFill: "rgba(192, 132, 252, 0.25)",
      exploredStroke: "rgba(192, 132, 252, 0.45)",
      frontierFill: "rgba(251, 146, 60, 0.75)",
      headColor: "#fb923c",
      pathColor: "#f472b6",
      pathGlow: "rgba(244, 114, 182, 0.75)"
    },
    astar: {
      id: "astar",
      name: "A* 星演算法",
      fullName: "A* 星演算法",
      dotClass: "algo-astar",
      exploredFill: "rgba(52, 211, 153, 0.24)",
      exploredStroke: "rgba(52, 211, 153, 0.45)",
      frontierFill: "rgba(56, 189, 248, 0.78)",
      headColor: "#38bdf8",
      pathColor: "#fde047",
      pathGlow: "rgba(253, 224, 71, 0.85)"
    }
  };

  const DIRS = [
    { key: "top", dr: -1, dc: 0, opp: "bottom" },
    { key: "right", dr: 0, dc: 1, opp: "left" },
    { key: "bottom", dr: 1, dc: 0, opp: "top" },
    { key: "left", dr: 0, dc: -1, opp: "right" }
  ];

  // =========================================================================
  // Application State
  // =========================================================================
  const state = {
    mode: "ai", // "ai" | "manual"
    size: 20,
    grid: [],
    selectedAlgo: "astar",
    speed: 50,

    // Playback / Animation
    animStatus: "idle", // "idle" | "running" | "paused" | "finished"
    isRacing: false,
    raceQueue: [],
    raceIndex: 0,
    raceResults: [],
    raceTimerId: null,
    selectedLeaderboardAlgo: null,

    activeResult: null,
    activeAlgoId: "astar",
    exploredStepCursor: 0,
    pathStepCursor: 0,
    stepAccumulator: 0,
    lastFrameTime: 0,
    rafId: null,

    // Visual subsets for current animation frame
    exploredCells: [],
    exploredSet: new Set(),
    frontierSet: new Set(),
    currentHeadKey: null,

    // Manual Challenge State
    manual: {
      r: 0,
      c: 0,
      steps: 0,
      trail: [{ r: 0, c: 0 }],
      visitedSet: new Set(["0,0"]),
      started: false,
      startTime: 0,
      elapsedMs: 0,
      finished: false,
      bumpAlpha: 0,
      optimalResult: null,
      showOptimal: false
    }
  };

  // =========================================================================
  // DOM References
  // =========================================================================
  const dom = {
    canvas: document.getElementById("mazeCanvas"),
    canvasWrapper: document.getElementById("canvasWrapper"),
    statusPill: document.getElementById("statusPill"),
    statusText: document.getElementById("statusText"),
    mazeMeta: document.getElementById("mazeMeta"),

    modeAiBtn: document.getElementById("modeAiBtn"),
    modeManualBtn: document.getElementById("modeManualBtn"),

    aiHud: document.getElementById("aiHud"),
    manualHud: document.getElementById("manualHud"),
    hudAlgo: document.getElementById("hudAlgo"),
    hudExplored: document.getElementById("hudExplored"),
    hudPath: document.getElementById("hudPath"),
    hudTime: document.getElementById("hudTime"),

    manualSteps: document.getElementById("manualSteps"),
    manualTimer: document.getElementById("manualTimer"),
    manualDist: document.getElementById("manualDist"),
    manualOptimalHint: document.getElementById("manualOptimalHint"),

    legendExplored: document.getElementById("legendExplored"),
    legendFrontier: document.getElementById("legendFrontier"),
    legendPath: document.getElementById("legendPath"),
    legendPlayer: document.getElementById("legendPlayer"),
    legendOptimal: document.getElementById("legendOptimal"),

    sizeBtns: document.querySelectorAll(".seg-btn"),
    generateMazeBtn: document.getElementById("generateMazeBtn"),

    aiControlsPanel: document.getElementById("aiControlsPanel"),
    manualControlsPanel: document.getElementById("manualControlsPanel"),
    leaderboardPanel: document.getElementById("leaderboardPanel"),

    algoBtns: document.querySelectorAll(".algo-option"),
    startBtn: document.getElementById("startBtn"),
    pauseBtn: document.getElementById("pauseBtn"),
    resetBtn: document.getElementById("resetBtn"),
    speedSlider: document.getElementById("speedSlider"),
    speedValue: document.getElementById("speedValue"),
    raceBtn: document.getElementById("raceBtn"),
    skipRaceBtn: document.getElementById("skipRaceBtn"),

    raceStatusBadge: document.getElementById("raceStatusBadge"),
    leaderboardBody: document.getElementById("leaderboardBody"),

    dpadBtns: document.querySelectorAll(".dpad-btn"),
    manualResetBtn: document.getElementById("manualResetBtn"),
    manualResultCard: document.getElementById("manualResultCard"),
    manualGradeText: document.getElementById("manualGradeText"),
    resPlayerSteps: document.getElementById("resPlayerSteps"),
    resOptimalSteps: document.getElementById("resOptimalSteps"),
    resPlayerTime: document.getElementById("resPlayerTime"),
    resAiTime: document.getElementById("resAiTime"),
    resEfficiency: document.getElementById("resEfficiency"),
    resEfficiencyBar: document.getElementById("resEfficiencyBar"),
    toggleOptimalPathBtn: document.getElementById("toggleOptimalPathBtn")
  };

  const ctx = dom.canvas.getContext("2d");

  // =========================================================================
  // Utility Helpers
  // =========================================================================
  const cellKey = (r, c) => `${r},${c}`;

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function formatMs(ms) {
    if (ms < 0.01) return "< 0.01 ms";
    return `${ms.toFixed(2)} ms`;
  }

  function setStatus(text, visualState = "idle") {
    dom.statusText.textContent = text;
    dom.statusPill.classList.remove("running", "paused");
    if (visualState === "running") dom.statusPill.classList.add("running");
    if (visualState === "paused") dom.statusPill.classList.add("paused");
  }

  // =========================================================================
  // Maze Generation (Iterative Recursive Backtracker + Controlled Braiding)
  // =========================================================================
  function createEmptyGrid(n) {
    const grid = [];
    for (let r = 0; r < n; r++) {
      const row = [];
      for (let c = 0; c < n; c++) {
        row.push({
          r,
          c,
          walls: { top: true, right: true, bottom: true, left: true }
        });
      }
      grid.push(row);
    }
    return grid;
  }

  function generateMaze(n) {
    const grid = createEmptyGrid(n);
    const visited = Array.from({ length: n }, () => Array(n).fill(false));
    const stack = [{ r: 0, c: 0 }];
    visited[0][0] = true;

    while (stack.length > 0) {
      const curr = stack[stack.length - 1];
      const neighbors = [];

      for (const dir of DIRS) {
        const nr = curr.r + dir.dr;
        const nc = curr.c + dir.dc;
        if (nr >= 0 && nr < n && nc >= 0 && nc < n && !visited[nr][nc]) {
          neighbors.push({ nr, nc, dir });
        }
      }

      if (neighbors.length === 0) {
        stack.pop();
      } else {
        const chosen = neighbors[Math.floor(Math.random() * neighbors.length)];
        grid[curr.r][curr.c].walls[chosen.dir.key] = false;
        grid[chosen.nr][chosen.nc].walls[chosen.dir.opp] = false;
        visited[chosen.nr][chosen.nc] = true;
        stack.push({ r: chosen.nr, c: chosen.nc });
      }
    }

    // Add controlled braiding (~12% dead-end / wall openings) so multiple routes exist.
    // This guarantees BFS/A* find the true shortest path while DFS may take longer paths.
    const candidates = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (r + 1 < n && grid[r][c].walls.bottom) {
          candidates.push({ r, c, dir: DIRS[2] });
        }
        if (c + 1 < n && grid[r][c].walls.right) {
          candidates.push({ r, c, dir: DIRS[1] });
        }
      }
    }
    shuffle(candidates);
    const extraOpenings = Math.max(1, Math.floor(n * n * 0.1));
    for (let i = 0; i < Math.min(extraOpenings, candidates.length); i++) {
      const { r, c, dir } = candidates[i];
      const nr = r + dir.dr;
      const nc = c + dir.dc;
      grid[r][c].walls[dir.key] = false;
      grid[nr][nc].walls[dir.opp] = false;
    }

    // Safety verification: ensure (0,0) -> (n-1,n-1) is always reachable
    if (!verifyPathExists(grid, n)) {
      return generateMaze(n);
    }

    return grid;
  }

  function verifyPathExists(grid, n) {
    const seen = Array.from({ length: n }, () => Array(n).fill(false));
    const queue = [{ r: 0, c: 0 }];
    seen[0][0] = true;
    let head = 0;

    while (head < queue.length) {
      const { r, c } = queue[head++];
      if (r === n - 1 && c === n - 1) return true;
      for (const dir of DIRS) {
        if (!grid[r][c].walls[dir.key]) {
          const nr = r + dir.dr;
          const nc = c + dir.dc;
          if (!seen[nr][nc]) {
            seen[nr][nc] = true;
            queue.push({ r: nr, c: nc });
          }
        }
      }
    }
    return false;
  }

  // =========================================================================
  // Min-Heap Priority Queue for A*
  // =========================================================================
  class MinHeap {
    constructor(compareFn) {
      this.data = [];
      this.compare = compareFn;
    }

    get size() {
      return this.data.length;
    }

    push(item) {
      this.data.push(item);
      this._bubbleUp(this.data.length - 1);
    }

    pop() {
      if (this.data.length === 0) return null;
      const top = this.data[0];
      const last = this.data.pop();
      if (this.data.length > 0) {
        this.data[0] = last;
        this._sinkDown(0);
      }
      return top;
    }

    _bubbleUp(idx) {
      while (idx > 0) {
        const parent = (idx - 1) >> 1;
        if (this.compare(this.data[idx], this.data[parent]) < 0) {
          [this.data[idx], this.data[parent]] = [this.data[parent], this.data[idx]];
          idx = parent;
        } else {
          break;
        }
      }
    }

    _sinkDown(idx) {
      const len = this.data.length;
      while (true) {
        const left = (idx << 1) + 1;
        const right = left + 1;
        let smallest = idx;

        if (left < len && this.compare(this.data[left], this.data[smallest]) < 0) {
          smallest = left;
        }
        if (right < len && this.compare(this.data[right], this.data[smallest]) < 0) {
          smallest = right;
        }
        if (smallest === idx) break;
        [this.data[idx], this.data[smallest]] = [this.data[smallest], this.data[idx]];
        idx = smallest;
      }
    }
  }

  // =========================================================================
  // Pathfinding Solvers (BFS, DFS, A*)
  // =========================================================================
  function reconstructPath(parentMap, goalR, goalC) {
    const path = [];
    let curr = cellKey(goalR, goalC);
    while (curr) {
      const [rStr, cStr] = curr.split(",");
      path.push({ r: Number(rStr), c: Number(cStr) });
      curr = parentMap.get(curr) || null;
    }
    path.reverse();
    return path;
  }

  function runBFS(grid, n, recordTrace = true) {
    const goalR = n - 1;
    const goalC = n - 1;
    const visited = Array.from({ length: n }, () => Array(n).fill(false));
    const parent = new Map();
    const queue = [{ r: 0, c: 0 }];
    let head = 0;

    visited[0][0] = true;
    const steps = recordTrace ? [] : null;
    let exploredCount = 0;
    let found = false;

    while (head < queue.length) {
      const curr = queue[head++];
      exploredCount++;

      const discovered = recordTrace ? [] : null;

      if (curr.r === goalR && curr.c === goalC) {
        if (recordTrace) steps.push({ current: curr, discovered: [] });
        found = true;
        break;
      }

      const walls = grid[curr.r][curr.c].walls;
      for (const dir of DIRS) {
        if (!walls[dir.key]) {
          const nr = curr.r + dir.dr;
          const nc = curr.c + dir.dc;
          if (!visited[nr][nc]) {
            visited[nr][nc] = true;
            parent.set(cellKey(nr, nc), cellKey(curr.r, curr.c));
            queue.push({ r: nr, c: nc });
            if (recordTrace) discovered.push({ r: nr, c: nc });
          }
        }
      }

      if (recordTrace) {
        steps.push({ current: curr, discovered });
      }
    }

    const path = found ? reconstructPath(parent, goalR, goalC) : [];
    return {
      algo: "bfs",
      found,
      steps: steps || [],
      path,
      exploredCount,
      pathLength: found ? path.length - 1 : 0
    };
  }

  function runDFS(grid, n, recordTrace = true) {
    const goalR = n - 1;
    const goalC = n - 1;
    const visited = Array.from({ length: n }, () => Array(n).fill(false));
    const parent = new Map();
    const stack = [{ r: 0, c: 0 }];

    // Push order chosen so DFS explores branches naturally rather than hugging right-bottom blindly
    const dfsDirs = [DIRS[1], DIRS[2], DIRS[3], DIRS[0]]; // right, bottom, left, top (LIFO pops top/left first)

    const steps = recordTrace ? [] : null;
    let exploredCount = 0;
    let found = false;

    while (stack.length > 0) {
      const curr = stack.pop();
      if (visited[curr.r][curr.c]) continue;
      visited[curr.r][curr.c] = true;
      exploredCount++;

      const discovered = recordTrace ? [] : null;

      if (curr.r === goalR && curr.c === goalC) {
        if (recordTrace) steps.push({ current: curr, discovered: [] });
        found = true;
        break;
      }

      const walls = grid[curr.r][curr.c].walls;
      for (const dir of dfsDirs) {
        if (!walls[dir.key]) {
          const nr = curr.r + dir.dr;
          const nc = curr.c + dir.dc;
          if (!visited[nr][nc]) {
            parent.set(cellKey(nr, nc), cellKey(curr.r, curr.c));
            stack.push({ r: nr, c: nc });
            if (recordTrace) discovered.push({ r: nr, c: nc });
          }
        }
      }

      if (recordTrace) {
        steps.push({ current: curr, discovered });
      }
    }

    const path = found ? reconstructPath(parent, goalR, goalC) : [];
    return {
      algo: "dfs",
      found,
      steps: steps || [],
      path,
      exploredCount,
      pathLength: found ? path.length - 1 : 0
    };
  }

  function runAStar(grid, n, recordTrace = true) {
    const goalR = n - 1;
    const goalC = n - 1;
    const heuristic = (r, c) => Math.abs(goalR - r) + Math.abs(goalC - c);

    const gScore = Array.from({ length: n }, () => Array(n).fill(Infinity));
    const closed = Array.from({ length: n }, () => Array(n).fill(false));
    const parent = new Map();

    const pq = new MinHeap((a, b) => {
      if (a.f !== b.f) return a.f - b.f;
      return a.h - b.h;
    });

    gScore[0][0] = 0;
    const h0 = heuristic(0, 0);
    pq.push({ r: 0, c: 0, g: 0, h: h0, f: h0 });

    const steps = recordTrace ? [] : null;
    let exploredCount = 0;
    let found = false;

    while (pq.size > 0) {
      const curr = pq.pop();
      if (closed[curr.r][curr.c]) continue;
      closed[curr.r][curr.c] = true;
      exploredCount++;

      const discovered = recordTrace ? [] : null;

      if (curr.r === goalR && curr.c === goalC) {
        if (recordTrace) steps.push({ current: { r: curr.r, c: curr.c }, discovered: [] });
        found = true;
        break;
      }

      const walls = grid[curr.r][curr.c].walls;
      for (const dir of DIRS) {
        if (!walls[dir.key]) {
          const nr = curr.r + dir.dr;
          const nc = curr.c + dir.dc;
          if (closed[nr][nc]) continue;

          const tentativeG = curr.g + 1;
          if (tentativeG < gScore[nr][nc]) {
            gScore[nr][nc] = tentativeG;
            parent.set(cellKey(nr, nc), cellKey(curr.r, curr.c));
            const h = heuristic(nr, nc);
            pq.push({ r: nr, c: nc, g: tentativeG, h, f: tentativeG + h });
            if (recordTrace) discovered.push({ r: nr, c: nc });
          }
        }
      }

      if (recordTrace) {
        steps.push({ current: { r: curr.r, c: curr.c }, discovered });
      }
    }

    const path = found ? reconstructPath(parent, goalR, goalC) : [];
    return {
      algo: "astar",
      found,
      steps: steps || [],
      path,
      exploredCount,
      pathLength: found ? path.length - 1 : 0
    };
  }

  function executeAlgorithmTimed(algoId) {
    const runner =
      algoId === "bfs" ? runBFS : algoId === "dfs" ? runDFS : runAStar;

    // Measure single run first
    const t0 = performance.now();
    const result = runner(state.grid, state.size, true);
    const t1 = performance.now();
    let elapsedMs = t1 - t0;

    // If browser timer resolution coarsens a fast 10x10 run below 0.08ms, benchmark pure execution over 25 passes
    if (elapsedMs < 0.08) {
      const iterations = 25;
      const bt0 = performance.now();
      for (let i = 0; i < iterations; i++) {
        runner(state.grid, state.size, false);
      }
      const bt1 = performance.now();
      elapsedMs = (bt1 - bt0) / iterations;
    }

    result.elapsedMs = elapsedMs;
    return result;
  }

  // =========================================================================
  // Canvas Sizing & High-DPI Rendering
  // =========================================================================
  function resizeCanvas() {
    const rect = dom.canvasWrapper.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const side = Math.max(240, Math.floor(rect.width));
    dom.canvas.width = side * dpr;
    dom.canvas.height = side * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
  }

  function render() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = dom.canvas.width / dpr;
    const height = dom.canvas.height / dpr;
    const n = state.size;
    const padding = Math.max(8, Math.floor(width * 0.025));
    const boardSize = width - padding * 2;
    const cellSize = boardSize / n;

    // Clear background
    ctx.fillStyle = "#04070e";
    ctx.fillRect(0, 0, width, height);

    // Subtle board grid backdrop
    ctx.fillStyle = "#070c18";
    ctx.fillRect(padding, padding, boardSize, boardSize);

    if (state.mode === "ai") {
      renderAiLayers(padding, cellSize);
    } else {
      renderManualLayers(padding, cellSize);
    }

    // Start (0,0) & Goal (n-1,n-1) markers
    drawTerminalCell(padding, cellSize, 0, 0, "#22d3ee", "起");
    drawTerminalCell(padding, cellSize, n - 1, n - 1, "#10b981", "終");

    // Draw maze walls sharply on top
    drawWalls(padding, cellSize, n);
  }

  function drawTerminalCell(padding, cellSize, r, c, color, label) {
    const x = padding + c * cellSize;
    const y = padding + r * cellSize;
    const inset = Math.max(1.5, cellSize * 0.12);

    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.28;
    ctx.fillRect(x + inset, y + inset, cellSize - inset * 2, cellSize - inset * 2);

    ctx.globalAlpha = 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.2, cellSize * 0.06);
    ctx.strokeRect(x + inset, y + inset, cellSize - inset * 2, cellSize - inset * 2);

    if (cellSize >= 18) {
      ctx.fillStyle = "#f8fafc";
      ctx.font = `700 ${Math.floor(cellSize * 0.42)}px "Noto Sans TC", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x + cellSize / 2, y + cellSize / 2 + 0.5);
    }
    ctx.restore();
  }

  function renderAiLayers(padding, cellSize) {
    const theme = ALGO_META[state.activeAlgoId] || ALGO_META.astar;
    const inset = Math.max(0.8, cellSize * 0.08);

    // 1. Explored cells
    if (state.exploredCells.length > 0) {
      ctx.save();
      ctx.fillStyle = theme.exploredFill;
      ctx.strokeStyle = theme.exploredStroke;
      ctx.lineWidth = 0.8;

      for (const cell of state.exploredCells) {
        const x = padding + cell.c * cellSize + inset;
        const y = padding + cell.r * cellSize + inset;
        const s = cellSize - inset * 2;
        ctx.fillRect(x, y, s, s);
      }
      ctx.restore();
    }

    // 2. Frontier cells
    if (state.frontierSet.size > 0) {
      ctx.save();
      ctx.fillStyle = theme.frontierFill;
      const fInset = Math.max(1.2, cellSize * 0.18);
      for (const key of state.frontierSet) {
        const [rStr, cStr] = key.split(",");
        const r = Number(rStr);
        const c = Number(cStr);
        const x = padding + c * cellSize + fInset;
        const y = padding + r * cellSize + fInset;
        ctx.fillRect(x, y, cellSize - fInset * 2, cellSize - fInset * 2);
      }
      ctx.restore();
    }

    // 3. Active head cell
    if (state.currentHeadKey && state.animStatus === "running") {
      const [rStr, cStr] = state.currentHeadKey.split(",");
      const r = Number(rStr);
      const c = Number(cStr);
      const cx = padding + (c + 0.5) * cellSize;
      const cy = padding + (r + 0.5) * cellSize;

      ctx.save();
      ctx.fillStyle = theme.headColor;
      ctx.shadowColor = theme.headColor;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(2.5, cellSize * 0.28), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. Final glowing path
    if (state.activeResult && state.activeResult.found && state.pathStepCursor > 0) {
      const path = state.activeResult.path;
      const count = Math.min(state.pathStepCursor, path.length);
      drawPathRibbon(padding, cellSize, path, count, theme.pathColor, theme.pathGlow);
    }
  }

  function renderManualLayers(padding, cellSize) {
    const m = state.manual;

    // 1. Optional AI optimal path overlay
    if (m.showOptimal && m.optimalResult && m.optimalResult.found) {
      drawPathRibbon(
        padding,
        cellSize,
        m.optimalResult.path,
        m.optimalResult.path.length,
        "#34d399",
        "rgba(52, 211, 153, 0.7)",
        0.75
      );
    }

    // 2. Player visited cells tint
    ctx.save();
    ctx.fillStyle = "rgba(251, 191, 36, 0.16)";
    const inset = Math.max(1, cellSize * 0.12);
    for (const key of m.visitedSet) {
      const [rStr, cStr] = key.split(",");
      const r = Number(rStr);
      const c = Number(cStr);
      ctx.fillRect(
        padding + c * cellSize + inset,
        padding + r * cellSize + inset,
        cellSize - inset * 2,
        cellSize - inset * 2
      );
    }
    ctx.restore();

    // 3. Player trail line
    if (m.trail.length > 1) {
      drawPathRibbon(
        padding,
        cellSize,
        m.trail,
        m.trail.length,
        "#fbbf24",
        "rgba(251, 191, 36, 0.55)",
        0.9
      );
    }

    // 4. Player avatar orb
    const px = padding + (m.c + 0.5) * cellSize;
    const py = padding + (m.r + 0.5) * cellSize;
    const radius = Math.max(3.5, cellSize * 0.3);

    ctx.save();
    const isBumping = m.bumpAlpha > 0.02;
    const orbColor = isBumping ? "#fb7185" : "#fbbf24";
    ctx.fillStyle = orbColor;
    ctx.shadowColor = orbColor;
    ctx.shadowBlur = isBumping ? 18 : 14;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fffbeb";
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(px, py, radius * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPathRibbon(padding, cellSize, path, count, color, glowColor, alpha = 1) {
    if (count < 1) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = Math.max(6, cellSize * 0.35);
    ctx.lineWidth = Math.max(2.2, cellSize * 0.26);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const pt = path[i];
      const x = padding + (pt.c + 0.5) * cellSize;
      const y = padding + (pt.r + 0.5) * cellSize;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawWalls(padding, cellSize, n) {
    ctx.save();
    ctx.strokeStyle = "#38bdf8";
    ctx.globalAlpha = 0.72;
    ctx.lineWidth = n === 40 ? 1.35 : n === 20 ? 1.9 : 2.5;
    ctx.lineCap = "square";

    ctx.beginPath();
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const w = state.grid[r][c].walls;
        const x1 = padding + c * cellSize;
        const y1 = padding + r * cellSize;
        const x2 = x1 + cellSize;
        const y2 = y1 + cellSize;

        if (w.top) {
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y1);
        }
        if (w.left) {
          ctx.moveTo(x1, y1);
          ctx.lineTo(x1, y2);
        }
        if (r === n - 1 && w.bottom) {
          ctx.moveTo(x1, y2);
          ctx.lineTo(x2, y2);
        }
        if (c === n - 1 && w.right) {
          ctx.moveTo(x2, y1);
          ctx.lineTo(x2, y2);
        }
      }
    }
    ctx.stroke();

    // Outer neon border emphasis
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = "rgba(56, 189, 248, 0.9)";
    ctx.lineWidth = Math.max(2, ctx.lineWidth + 0.4);
    ctx.strokeRect(padding, padding, n * cellSize, n * cellSize);
    ctx.restore();
  }

  // =========================================================================
  // Animation Loop & Playback Control
  // =========================================================================
  function getStepsPerSecond(speedVal) {
    // Exponential curve: 1 -> ~3 steps/s, 50 -> ~70 steps/s, 100 -> ~2400 steps/s
    return 2.5 * Math.pow(1.0715, speedVal);
  }

  function stopLoop() {
    if (state.rafId !== null) {
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }
    if (state.raceTimerId !== null) {
      clearTimeout(state.raceTimerId);
      state.raceTimerId = null;
    }
  }

  function clearVisualTrace() {
    state.exploredCells = [];
    state.exploredSet.clear();
    state.frontierSet.clear();
    state.currentHeadKey = null;
    state.exploredStepCursor = 0;
    state.pathStepCursor = 0;
    state.stepAccumulator = 0;
  }

  function resetAiState(keepLeaderboard = true) {
    stopLoop();
    state.animStatus = "idle";
    state.isRacing = false;
    state.raceQueue = [];
    state.raceIndex = 0;
    state.activeResult = null;
    state.activeAlgoId = state.selectedAlgo;
    clearVisualTrace();

    if (!keepLeaderboard) {
      state.raceResults = [];
      state.selectedLeaderboardAlgo = null;
      renderLeaderboard();
      dom.raceStatusBadge.textContent = "尚未競賽";
      dom.raceStatusBadge.className = "badge";
    }

    updatePlaybackButtons();
    updateAiHud();
    if (state.mode === "ai") {
      setStatus("就緒：請選擇演算法或開始競賽", "idle");
    }
    render();
  }

  function updatePlaybackButtons() {
    const s = state.animStatus;
    if (state.isRacing) {
      dom.startBtn.disabled = true;
      dom.startBtn.textContent = "競賽中";
      dom.pauseBtn.disabled = s !== "running" && s !== "paused";
      dom.pauseBtn.textContent = s === "paused" ? "繼續" : "暫停";
      dom.resetBtn.disabled = false;
      dom.raceBtn.disabled = true;
      dom.skipRaceBtn.classList.remove("hidden");
      return;
    }

    dom.skipRaceBtn.classList.add("hidden");
    dom.raceBtn.disabled = false;

    if (s === "idle") {
      dom.startBtn.disabled = false;
      dom.startBtn.textContent = "開始";
      dom.pauseBtn.disabled = true;
      dom.pauseBtn.textContent = "暫停";
    } else if (s === "running") {
      dom.startBtn.disabled = true;
      dom.startBtn.textContent = "執行中";
      dom.pauseBtn.disabled = false;
      dom.pauseBtn.textContent = "暫停";
    } else if (s === "paused") {
      dom.startBtn.disabled = false;
      dom.startBtn.textContent = "繼續";
      dom.pauseBtn.disabled = true;
      dom.pauseBtn.textContent = "暫停";
    } else if (s === "finished") {
      dom.startBtn.disabled = false;
      dom.startBtn.textContent = "重播";
      dom.pauseBtn.disabled = true;
      dom.pauseBtn.textContent = "暫停";
    }
  }

  function updateAiHud() {
    const meta = ALGO_META[state.activeAlgoId] || ALGO_META[state.selectedAlgo];
    dom.hudAlgo.textContent = meta.fullName;

    if (!state.activeResult) {
      dom.hudExplored.textContent = "0 格";
      dom.hudPath.textContent = "-- 步";
      dom.hudTime.textContent = "-- ms";
      return;
    }

    dom.hudExplored.textContent = `${state.exploredCells.length} 格`;
    dom.hudTime.textContent = formatMs(state.activeResult.elapsedMs);

    if (state.animStatus === "finished" || state.pathStepCursor >= state.activeResult.path.length) {
      dom.hudPath.textContent = state.activeResult.found
        ? `${state.activeResult.pathLength} 步`
        : "無解";
    } else {
      dom.hudPath.textContent = "搜尋中...";
    }
  }

  function startSingleAlgorithm() {
    if (state.animStatus === "paused" && state.activeResult && !state.isRacing) {
      resumeAnimation();
      return;
    }

    stopLoop();
    state.isRacing = false;
    state.activeAlgoId = state.selectedAlgo;
    state.activeResult = executeAlgorithmTimed(state.selectedAlgo);
    clearVisualTrace();

    state.animStatus = "running";
    state.lastFrameTime = performance.now();
    updatePlaybackButtons();
    updateAiHud();

    const meta = ALGO_META[state.selectedAlgo];
    setStatus(`正在執行：${meta.fullName}`, "running");

    state.rafId = requestAnimationFrame(tickAnimation);
  }

  function startRace() {
    stopLoop();
    state.isRacing = true;
    state.raceQueue = ["bfs", "dfs", "astar"];
    state.raceIndex = 0;
    state.raceResults = [];
    state.selectedLeaderboardAlgo = null;

    renderLeaderboard();
    dom.raceStatusBadge.textContent = "競賽進行中 (1/3)";
    dom.raceStatusBadge.className = "badge badge-cyan";

    // Precompute all 3 on the exact same maze cleanly
    state.precomputedRace = state.raceQueue.map((id) => executeAlgorithmTimed(id));
    beginRaceLeg(0);
  }

  function beginRaceLeg(index) {
    const result = state.precomputedRace[index];
    state.raceIndex = index;
    state.activeAlgoId = result.algo;
    state.activeResult = result;
    clearVisualTrace();

    state.animStatus = "running";
    state.lastFrameTime = performance.now();

    const meta = ALGO_META[result.algo];
    dom.raceStatusBadge.textContent = `競賽進行中 (${index + 1}/3)`;
    setStatus(`一鍵競賽 (${index + 1}/3)：${meta.fullName}`, "running");
    updatePlaybackButtons();
    updateAiHud();

    state.rafId = requestAnimationFrame(tickAnimation);
  }

  function skipRaceAnimation() {
    if (!state.isRacing || !state.precomputedRace) return;
    stopLoop();
    state.raceResults = [...state.precomputedRace];
    finishWholeRace();
  }

  function finishWholeRace() {
    state.isRacing = false;
    state.animStatus = "finished";

    // Sort results to find top performer, and show top performer (or A*) on canvas
    const sorted = getSortedRaceResults();
    const winner = sorted[0];
    if (winner) {
      displayCompletedResult(winner);
      state.selectedLeaderboardAlgo = winner.algo;
    }

    renderLeaderboard();
    dom.raceStatusBadge.textContent = "競賽完成";
    dom.raceStatusBadge.className = "badge badge-emerald";
    setStatus(`競賽完成！最佳表現：${ALGO_META[winner.algo].name}`, "idle");
    updatePlaybackButtons();
  }

  function displayCompletedResult(result) {
    state.activeAlgoId = result.algo;
    state.activeResult = result;
    state.exploredCells = [];
    state.exploredSet.clear();
    state.frontierSet.clear();
    state.currentHeadKey = null;

    for (const step of result.steps) {
      state.exploredCells.push(step.current);
      state.exploredSet.add(cellKey(step.current.r, step.current.c));
    }
    state.exploredStepCursor = result.steps.length;
    state.pathStepCursor = result.path.length;
    state.animStatus = "finished";

    updateAiHud();
    render();
  }

  function resumeAnimation() {
    if (state.animStatus !== "paused") return;
    state.animStatus = "running";
    state.lastFrameTime = performance.now();
    const meta = ALGO_META[state.activeAlgoId];
    setStatus(
      state.isRacing
        ? `一鍵競賽 (${state.raceIndex + 1}/3)：${meta.fullName}`
        : `正在執行：${meta.fullName}`,
      "running"
    );
    updatePlaybackButtons();
    state.rafId = requestAnimationFrame(tickAnimation);
  }

  function togglePauseAnimation() {
    if (state.animStatus === "running") {
      stopLoop();
      state.animStatus = "paused";
      setStatus("動畫已暫停", "paused");
      updatePlaybackButtons();
    } else if (state.animStatus === "paused") {
      resumeAnimation();
    }
  }

  function tickAnimation(now) {
    if (state.animStatus !== "running" || !state.activeResult) return;

    const dt = Math.min(0.05, Math.max(0.001, (now - state.lastFrameTime) / 1000));
    state.lastFrameTime = now;

    const stepsPerSec = getStepsPerSecond(state.speed);
    state.stepAccumulator += stepsPerSec * dt;

    const result = state.activeResult;
    const totalExploredSteps = result.steps.length;
    const totalPathSteps = result.path.length;

    let stepsToAdvance = Math.floor(state.stepAccumulator);
    if (stepsToAdvance > 0) {
      state.stepAccumulator -= stepsToAdvance;
    }

    // Advance exploration steps first, then final path reveal
    while (stepsToAdvance > 0) {
      if (state.exploredStepCursor < totalExploredSteps) {
        const step = result.steps[state.exploredStepCursor++];
        const key = cellKey(step.current.r, step.current.c);
        state.frontierSet.delete(key);
        state.exploredSet.add(key);
        state.exploredCells.push(step.current);
        state.currentHeadKey = key;

        for (const d of step.discovered) {
          const dk = cellKey(d.r, d.c);
          if (!state.exploredSet.has(dk)) {
            state.frontierSet.add(dk);
          }
        }
        stepsToAdvance--;
      } else if (result.found && state.pathStepCursor < totalPathSteps) {
        state.currentHeadKey = null;
        // Reveal path smoothly at least 2x faster than slow crawl
        state.pathStepCursor = Math.min(totalPathSteps, state.pathStepCursor + Math.max(1, Math.ceil(stepsToAdvance * 0.5)));
        stepsToAdvance = 0;
      } else {
        break;
      }
    }

    updateAiHud();
    render();

    const explorationDone = state.exploredStepCursor >= totalExploredSteps;
    const pathDone = !result.found || state.pathStepCursor >= totalPathSteps;

    if (explorationDone && pathDone) {
      handleAnimationLegComplete();
    } else {
      state.rafId = requestAnimationFrame(tickAnimation);
    }
  }

  function handleAnimationLegComplete() {
    const result = state.activeResult;
    state.currentHeadKey = null;
    state.frontierSet.clear();

    if (state.isRacing) {
      state.raceResults.push(result);
      renderLeaderboard();

      if (state.raceIndex + 1 < state.raceQueue.length) {
        // Brief 380ms pause between race legs so user can visually absorb each path
        setStatus(`${ALGO_META[result.algo].name} 完成！準備下一位選手...`, "running");
        state.raceTimerId = setTimeout(() => {
          state.raceTimerId = null;
          if (state.isRacing) {
            beginRaceLeg(state.raceIndex + 1);
          }
        }, 380);
      } else {
        finishWholeRace();
      }
      return;
    }

    // Single algorithm completion: upsert into leaderboard too
    state.animStatus = "finished";
    upsertSingleResultIntoLeaderboard(result);
    state.selectedLeaderboardAlgo = result.algo;
    renderLeaderboard();
    updatePlaybackButtons();
    updateAiHud();
    render();

    const meta = ALGO_META[result.algo];
    setStatus(
      result.found
        ? `搜尋完成：${meta.name}（探索 ${result.exploredCount} 格，路徑 ${result.pathLength} 步）`
        : `搜尋完成：${meta.name} 未找到出口`,
      "idle"
    );
  }

  // =========================================================================
  // Leaderboard Management
  // =========================================================================
  function upsertSingleResultIntoLeaderboard(result) {
    const idx = state.raceResults.findIndex((r) => r.algo === result.algo);
    if (idx >= 0) {
      state.raceResults[idx] = result;
    } else {
      state.raceResults.push(result);
    }
  }

  function getSortedRaceResults() {
    return [...state.raceResults].sort((a, b) => {
      if (a.found !== b.found) return a.found ? -1 : 1;
      if (a.pathLength !== b.pathLength) return a.pathLength - b.pathLength;
      if (a.exploredCount !== b.exploredCount) return a.exploredCount - b.exploredCount;
      return a.elapsedMs - b.elapsedMs;
    });
  }

  function renderLeaderboard() {
    const results = getSortedRaceResults();
    if (results.length === 0) {
      dom.leaderboardBody.innerHTML = `
        <tr class="empty-row">
          <td colspan="6">點擊「一鍵競賽」或執行單一演算法後，數據將即時統計於此</td>
        </tr>
      `;
      return;
    }

    dom.leaderboardBody.innerHTML = results
      .map((res, idx) => {
        const rank = idx + 1;
        const meta = ALGO_META[res.algo];
        const rankClass = rank <= 3 ? `rank-${rank}` : "";
        const selectedClass = state.selectedLeaderboardAlgo === res.algo ? "selected-row" : "";
        const foundBadge = res.found
          ? `<span class="status-found">✓ 已找到</span>`
          : `<span class="status-missing">✕ 未找到</span>`;

        return `
          <tr class="result-row ${selectedClass}" data-algo="${res.algo}">
            <td><span class="rank-pill ${rankClass}">#${rank}</span></td>
            <td>
              <span class="algo-cell">
                <span class="algo-dot ${meta.dotClass}"></span>
                ${meta.name}
              </span>
            </td>
            <td>${res.exploredCount} 格</td>
            <td>${res.found ? `${res.pathLength} 步` : "--"}</td>
            <td>${formatMs(res.elapsedMs)}</td>
            <td>${foundBadge}</td>
          </tr>
        `;
      })
      .join("");

    // Bind row clicks to inspect that algorithm's result on canvas
    dom.leaderboardBody.querySelectorAll(".result-row").forEach((row) => {
      row.addEventListener("click", () => {
        if (state.isRacing || state.animStatus === "running") return;
        const algoId = row.dataset.algo;
        const target = state.raceResults.find((r) => r.algo === algoId);
        if (target) {
          state.selectedLeaderboardAlgo = algoId;
          displayCompletedResult(target);
          renderLeaderboard();
          setStatus(`檢視結果：${ALGO_META[algoId].fullName}`, "idle");
        }
      });
    });
  }

  // =========================================================================
  // Manual Challenge Mode
  // =========================================================================
  function resetManualChallenge() {
    stopLoop();
    const m = state.manual;
    m.r = 0;
    m.c = 0;
    m.steps = 0;
    m.trail = [{ r: 0, c: 0 }];
    m.visitedSet = new Set(["0,0"]);
    m.started = false;
    m.startTime = 0;
    m.elapsedMs = 0;
    m.finished = false;
    m.bumpAlpha = 0;
    m.optimalResult = null;
    m.showOptimal = false;

    dom.manualResultCard.classList.add("hidden");
    dom.toggleOptimalPathBtn.textContent = "在迷宮上顯示電腦最佳路徑";
    dom.manualOptimalHint.textContent = "完賽後揭曉";
    updateManualHud();

    if (state.mode === "manual") {
      setStatus("手動挑戰就緒：按方向鍵或 WASD 移動", "idle");
    }
    render();
  }

  function updateManualHud() {
    const m = state.manual;
    const n = state.size;
    const dist = Math.abs(n - 1 - m.r) + Math.abs(n - 1 - m.c);

    dom.manualSteps.textContent = `${m.steps} 步`;
    dom.manualTimer.textContent = `${(m.elapsedMs / 1000).toFixed(2)} 秒`;
    dom.manualDist.textContent = `${dist} 格`;
  }

  function tickManualLoop(now) {
    if (state.mode !== "manual") return;
    const m = state.manual;

    let needsNextFrame = false;
    if (m.started && !m.finished) {
      m.elapsedMs = now - m.startTime;
      updateManualHud();
      needsNextFrame = true;
    }

    if (m.bumpAlpha > 0.01) {
      m.bumpAlpha *= 0.82;
      if (m.bumpAlpha <= 0.01) m.bumpAlpha = 0;
      render();
      needsNextFrame = true;
    }

    if (needsNextFrame) {
      state.rafId = requestAnimationFrame(tickManualLoop);
    } else {
      state.rafId = null;
    }
  }

  function movePlayer(dirKey) {
    if (state.mode !== "manual" || state.manual.finished) return;

    const dir = DIRS.find((d) => d.key === dirKey);
    if (!dir) return;

    const m = state.manual;
    const n = state.size;
    const cell = state.grid[m.r][m.c];

    if (cell.walls[dir.key]) {
      m.bumpAlpha = 1;
      render();
      if (state.rafId === null) {
        state.rafId = requestAnimationFrame(tickManualLoop);
      }
      return;
    }

    // Start stopwatch on first valid move
    if (!m.started) {
      m.started = true;
      m.startTime = performance.now();
      setStatus("手動挑戰計時中...", "running");
      if (state.rafId === null) {
        state.rafId = requestAnimationFrame(tickManualLoop);
      }
    }

    m.r += dir.dr;
    m.c += dir.dc;
    m.steps += 1;
    m.trail.push({ r: m.r, c: m.c });
    m.visitedSet.add(cellKey(m.r, m.c));

    updateManualHud();
    render();

    if (m.r === n - 1 && m.c === n - 1) {
      completeManualChallenge();
    }
  }

  function completeManualChallenge() {
    const m = state.manual;
    m.finished = true;
    m.elapsedMs = m.started ? performance.now() - m.startTime : 0;
    stopLoop();

    // Compute AI optimal path (A*) on the exact same maze
    const optimal = executeAlgorithmTimed("astar");
    m.optimalResult = optimal;

    const playerSteps = m.steps;
    const optSteps = optimal.pathLength;
    const diff = playerSteps - optSteps;
    const efficiency = optSteps > 0 ? Math.min(100, Math.round((optSteps / playerSteps) * 100)) : 100;

    dom.manualOptimalHint.textContent = `${optSteps} 步`;
    dom.resPlayerSteps.textContent = `${playerSteps} 步`;
    dom.resOptimalSteps.textContent = `${optSteps} 步`;
    dom.resPlayerTime.textContent = `${(m.elapsedMs / 1000).toFixed(2)} 秒`;
    dom.resAiTime.textContent = formatMs(optimal.elapsedMs);
    dom.resEfficiency.textContent = `${efficiency}%`;
    dom.resEfficiencyBar.style.width = `${efficiency}%`;

    if (diff === 0) {
      dom.manualGradeText.textContent = "完美通關！你的路線與電腦最佳路徑完全一致！";
    } else {
      dom.manualGradeText.textContent = `比電腦最佳路徑多走了 ${diff} 步，可點擊下方按鈕比對差異`;
    }

    dom.manualResultCard.classList.remove("hidden");
    updateManualHud();
    setStatus(`挑戰完成！共 ${playerSteps} 步（AI 最佳 ${optSteps} 步）`, "idle");
    render();
  }

  // =========================================================================
  // Mode Switching & Maze Regeneration
  // =========================================================================
  function switchMode(newMode) {
    if (state.mode === newMode) return;
    stopLoop();
    state.mode = newMode;

    const isAi = newMode === "ai";
    dom.modeAiBtn.classList.toggle("active", isAi);
    dom.modeManualBtn.classList.toggle("active", !isAi);

    dom.aiHud.classList.toggle("hidden", !isAi);
    dom.manualHud.classList.toggle("hidden", isAi);

    dom.aiControlsPanel.classList.toggle("hidden", !isAi);
    dom.leaderboardPanel.classList.toggle("hidden", !isAi);
    dom.manualControlsPanel.classList.toggle("hidden", isAi);

    dom.legendExplored.classList.toggle("hidden", !isAi);
    dom.legendFrontier.classList.toggle("hidden", !isAi);
    dom.legendPath.classList.toggle("hidden", !isAi);
    dom.legendPlayer.classList.toggle("hidden", isAi);
    dom.legendOptimal.classList.toggle("hidden", isAi);

    if (isAi) {
      resetAiState(true);
    } else {
      resetManualChallenge();
    }
  }

  function createNewMaze() {
    state.grid = generateMaze(state.size);
    dom.mazeMeta.textContent = `尺寸：${state.size} × ${state.size}`;
    resetAiState(false);
    resetManualChallenge();
    if (state.mode === "ai") {
      setStatus(`已生成 ${state.size}×${state.size} 隨機迷宮`, "idle");
    } else {
      setStatus(`已生成 ${state.size}×${state.size} 迷宮：請用方向鍵或 WASD 開始`, "idle");
    }
    render();
  }

  function updateSpeedLabel() {
    const v = Number(dom.speedSlider.value);
    state.speed = v;
    let label = "標準";
    if (v < 25) label = "慢速";
    else if (v >= 80) label = "極速";
    else if (v >= 60) label = "快速";
    dom.speedValue.textContent = `${label} (${v})`;
  }

  // =========================================================================
  // Event Listeners
  // =========================================================================
  function bindEvents() {
    window.addEventListener("resize", resizeCanvas);

    dom.modeAiBtn.addEventListener("click", () => switchMode("ai"));
    dom.modeManualBtn.addEventListener("click", () => switchMode("manual"));

    dom.sizeBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const newSize = Number(btn.dataset.size);
        if (newSize === state.size) return;
        dom.sizeBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.size = newSize;
        createNewMaze();
      });
    });

    dom.generateMazeBtn.addEventListener("click", createNewMaze);

    dom.algoBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (state.isRacing) return;
        dom.algoBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.selectedAlgo = btn.dataset.algo;
        if (state.animStatus === "idle" || state.animStatus === "finished") {
          state.activeAlgoId = state.selectedAlgo;
          resetAiState(true);
        }
      });
    });

    dom.startBtn.addEventListener("click", startSingleAlgorithm);
    dom.pauseBtn.addEventListener("click", togglePauseAnimation);
    dom.resetBtn.addEventListener("click", () => resetAiState(true));
    dom.speedSlider.addEventListener("input", updateSpeedLabel);
    dom.raceBtn.addEventListener("click", startRace);
    dom.skipRaceBtn.addEventListener("click", skipRaceAnimation);

    // Manual D-pad & reset
    dom.dpadBtns.forEach((btn) => {
      btn.addEventListener("click", () => movePlayer(btn.dataset.dir));
    });
    dom.manualResetBtn.addEventListener("click", resetManualChallenge);

    dom.toggleOptimalPathBtn.addEventListener("click", () => {
      state.manual.showOptimal = !state.manual.showOptimal;
      dom.toggleOptimalPathBtn.textContent = state.manual.showOptimal
        ? "隱藏電腦最佳路徑"
        : "在迷宮上顯示電腦最佳路徑";
      render();
    });

    // Keyboard navigation for manual mode
    window.addEventListener("keydown", (e) => {
      if (state.mode !== "manual") return;
      const keyMap = {
        ArrowUp: "top",
        w: "top",
        W: "top",
        ArrowRight: "right",
        d: "right",
        D: "right",
        ArrowDown: "bottom",
        s: "bottom",
        S: "bottom",
        ArrowLeft: "left",
        a: "left",
        A: "left"
      };

      const dirKey = keyMap[e.key];
      if (dirKey) {
        e.preventDefault();
        movePlayer(dirKey);
      }
    });
  }

  // =========================================================================
  // Initialization
  // =========================================================================
  function init() {
    bindEvents();
    updateSpeedLabel();
    state.grid = generateMaze(state.size);
    resizeCanvas();
    updateAiHud();
    updatePlaybackButtons();
  }

  init();
})();
