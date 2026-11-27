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
      dsName: "佇列 (先進先出)",
      dotClass: "algo-bfs",
      exploredFill: "rgba(56, 189, 248, 0.26)",
      frontierFill: "rgba(251, 191, 36, 0.78)",
      headColor: "#fbbf24",
      pathColor: "#facc15",
      pathGlow: "rgba(250, 204, 21, 0.75)"
    },
    dfs: {
      id: "dfs",
      name: "DFS 深度優先",
      fullName: "DFS 深度優先搜尋",
      dsName: "堆疊 (後進先出)",
      dotClass: "algo-dfs",
      exploredFill: "rgba(251, 113, 133, 0.25)",
      frontierFill: "rgba(251, 191, 36, 0.78)",
      headColor: "#fbbf24",
      pathColor: "#f472b6",
      pathGlow: "rgba(244, 114, 182, 0.75)"
    },
    astar: {
      id: "astar",
      name: "A* 搜尋演算法",
      fullName: "A* 搜尋演算法",
      dsName: "優先佇列 (成本+估距)",
      dotClass: "algo-astar",
      exploredFill: "rgba(52, 211, 153, 0.25)",
      frontierFill: "rgba(56, 189, 248, 0.78)",
      headColor: "#38bdf8",
      pathColor: "#facc15",
      pathGlow: "rgba(250, 204, 21, 0.8)"
    }
  };

  const DIRS = [
    { key: "top", dr: -1, dc: 0, opp: "bottom" },
    { key: "right", dr: 0, dc: 1, opp: "left" },
    { key: "bottom", dr: 1, dc: 0, opp: "top" },
    { key: "left", dr: 0, dc: -1, opp: "right" }
  ];

  const SWAMP_COST = 5;
  const BEST_RECORD_KEY = "maze_lab_g2_best_records_v1";

  // =========================================================================
  // Application State
  // =========================================================================
  const state = {
    mode: "ai", // "ai" | "manual"
    size: 20,
    preset: "random", // "random" | "obstacles" | "swamp"
    seed: 2026,
    grid: [],
    start: { r: 0, c: 0 },
    goal: { r: 19, c: 19 },

    selectedAlgo: "astar",
    speed: 50,
    brush: "none", // "none" | "wall" | "swamp" | "clear"
    isPainting: false,

    // View & Playback
    viewMode: "single", // "single" | "race"
    animStatus: "idle", // "idle" | "running" | "paused" | "finished"
    isRacing: false,
    raceResults: [],
    selectedLeaderboardAlgo: null,

    // Single trace state
    activeAlgoId: "astar",
    activeResult: null,
    singleTrack: null,

    // Simultaneous 3-way race tracks
    raceTracks: null,

    stepAccumulator: 0,
    lastFrameTime: 0,
    rafId: null,

    // Manual Challenge State
    manual: {
      r: 0,
      c: 0,
      steps: 0,
      cost: 0,
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
    appShell: document.querySelector(".app-shell"),
    canvas: document.getElementById("mazeCanvas"),
    canvasWrapper: document.getElementById("canvasWrapper"),
    raceGrid: document.getElementById("raceGrid"),
    raceViewSwitch: document.getElementById("raceViewSwitch"),
    raceReplayBtn: document.getElementById("raceReplayBtn"),
    racePauseBtn: document.getElementById("racePauseBtn"),
    raceSkipBarBtn: document.getElementById("raceSkipBarBtn"),
    raceSpeedSlider: document.getElementById("raceSpeedSlider"),
    raceSpeedBadge: document.getElementById("raceSpeedBadge"),
    backToSingleBtn: document.getElementById("backToSingleBtn"),
    raceCanvases: {
      bfs: document.getElementById("raceCanvasBfs"),
      dfs: document.getElementById("raceCanvasDfs"),
      astar: document.getElementById("raceCanvasAstar")
    },
    raceStats: {
      bfs: document.getElementById("raceStatBfs"),
      dfs: document.getElementById("raceStatDfs"),
      astar: document.getElementById("raceStatAstar")
    },
    raceFoots: {
      bfs: document.getElementById("raceFootBfs"),
      dfs: document.getElementById("raceFootDfs"),
      astar: document.getElementById("raceFootAstar")
    },
    raceCards: document.querySelectorAll(".race-card"),

    statusPill: document.getElementById("statusPill"),
    statusText: document.getElementById("statusText"),
    mazeMeta: document.getElementById("mazeMeta"),
    mazeSeedMeta: document.getElementById("mazeSeedMeta"),
    insightText: document.getElementById("insightText"),

    editorToolbar: document.getElementById("editorToolbar"),
    brushBtns: document.querySelectorAll(".brush-btn"),
    clearCustomBtn: document.getElementById("clearCustomBtn"),

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
    presetBtns: document.querySelectorAll(".preset-btn"),
    seedInput: document.getElementById("seedInput"),
    loadSeedBtn: document.getElementById("loadSeedBtn"),
    copyShareBtn: document.getElementById("copyShareBtn"),
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

    bestRecordSize: document.getElementById("bestRecordSize"),
    bestRecordText: document.getElementById("bestRecordText"),
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

  // =========================================================================
  // Seeded PRNG & Utilities
  // =========================================================================
  const cellKey = (r, c) => `${r},${c}`;

  function createRng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function parseSeedNumber(raw) {
    const cleaned = String(raw || "").trim().toUpperCase().replace(/^#/, "");
    if (!/^\d+$/.test(cleaned)) return null;
    return Math.min(9999, Math.max(1, Number(cleaned)));
  }

  function randomSeed() {
    return 1 + Math.floor(Math.random() * 9999);
  }

  function formatSeedCode(seed) {
    return String(Math.min(9999, Math.max(1, seed))).padStart(4, "0");
  }

  function shuffle(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
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

  function setInsight(text) {
    dom.insightText.textContent = text;
  }

  // =========================================================================
  // Maze & Preset Generation
  // =========================================================================
  function createEmptyGrid(n, openAll = false) {
    const grid = [];
    for (let r = 0; r < n; r++) {
      const row = [];
      for (let c = 0; c < n; c++) {
        row.push({
          r,
          c,
          type: "normal", // "normal" | "wall" | "swamp"
          walls: {
            top: openAll ? r === 0 : true,
            right: openAll ? c === n - 1 : true,
            bottom: openAll ? r === n - 1 : true,
            left: openAll ? c === 0 : true
          }
        });
      }
      grid.push(row);
    }
    return grid;
  }

  function generateRandomMaze(n, seed) {
    const rng = createRng(seed);
    const grid = createEmptyGrid(n, false);
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
        const chosen = neighbors[Math.floor(rng() * neighbors.length)];
        grid[curr.r][curr.c].walls[chosen.dir.key] = false;
        grid[chosen.nr][chosen.nc].walls[chosen.dir.opp] = false;
        visited[chosen.nr][chosen.nc] = true;
        stack.push({ r: chosen.nr, c: chosen.nc });
      }
    }

    // Controlled braiding (~10%) so multiple paths exist
    const candidates = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (r + 1 < n && grid[r][c].walls.bottom) candidates.push({ r, c, dir: DIRS[2] });
        if (c + 1 < n && grid[r][c].walls.right) candidates.push({ r, c, dir: DIRS[1] });
      }
    }
    shuffle(candidates, rng);
    const extraOpenings = Math.max(1, Math.floor(n * n * 0.1));
    for (let i = 0; i < Math.min(extraOpenings, candidates.length); i++) {
      const { r, c, dir } = candidates[i];
      grid[r][c].walls[dir.key] = false;
      grid[r + dir.dr][c + dir.dc].walls[dir.opp] = false;
    }

    if (!verifyPathExists(grid, n)) {
      return generateRandomMaze(n, seed + 1);
    }
    return grid;
  }

  function generateObstaclesPreset() {
    const n = 20;
    const grid = createEmptyGrid(n, true);

    // Scattered island walls in an open arena so A* navigates like a guided beam
    for (let r = 2; r <= 7; r++) grid[r][6].type = "wall";
    for (let c = 2; c <= 6; c++) grid[7][c].type = "wall";
    for (let c = 9; c <= 14; c++) grid[4][c].type = "wall";
    for (let r = 8; r <= 13; r++) grid[r][10].type = "wall";
    for (let c = 10; c <= 15; c++) grid[10][c].type = "wall";
    for (let r = 13; r <= 17; r++) grid[r][15].type = "wall";
    for (let c = 0; c <= 4; c++) grid[12][c].type = "wall";
    for (let r = 15; r <= 19; r++) grid[r][11].type = "wall";
    for (let r = 0; r <= 2; r++) grid[r][10].type = "wall";
    for (let c = 16; c <= 19; c++) grid[7][c].type = "wall";

    return grid;
  }

  function generateSwampPreset() {
    const n = 20;
    const grid = createEmptyGrid(n, true);

    // Start with all wall blocks, then carve a trunk + swamp shortcut + clean detour + dead-end
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        grid[r][c].type = "wall";
      }
    }

    const carve = (r, c, type = "normal") => {
      grid[r][c].type = type;
    };

    // 1. Trunk from Start (0,0) -> down c=0 to (8,0) -> right r=8 to Fork (8,8) [16 steps]
    for (let r = 0; r <= 8; r++) carve(r, 0);
    for (let c = 1; c <= 8; c++) carve(8, c);

    // 2. Swamp Shortcut from Fork (8,8) -> down c=8 through 6 swamp tiles -> (17,8) -> (17,17) [18 steps, cost 42]
    for (let r = 9; r <= 17; r++) {
      const isSwamp = r >= 10 && r <= 15;
      carve(r, 8, isSwamp ? "swamp" : "normal");
    }
    for (let c = 9; c <= 17; c++) carve(17, c);

    // 3. Clean Detour from Fork (8,8) -> up c=8 to (2,8) -> right r=2 to (2,17) -> down c=17 to (17,17) [30 steps, cost 30]
    for (let r = 2; r <= 7; r++) carve(r, 8);
    for (let c = 9; c <= 17; c++) carve(2, c);
    for (let r = 3; r <= 16; r++) carve(r, 17);

    // 4. Tail from (17,17) -> (17,19) -> Goal (19,19) [4 steps]
    carve(17, 18);
    carve(17, 19);
    carve(18, 19);
    carve(19, 19);

    // 5. Left-branching dead-end off the swamp corridor so DFS explores it & hits a wall while A* avoids the swamp entirely
    for (let c = 3; c <= 7; c++) carve(12, c);
    for (let r = 12; r <= 15; r++) carve(r, 3);
    for (let c = 1; c <= 4; c++) carve(4, c);
    for (let r = 1; r <= 4; r++) carve(r, 4);

    return grid;
  }

  function canPass(grid, n, r, c, dir) {
    if (grid[r][c].type === "wall") return false;
    if (grid[r][c].walls[dir.key]) return false;
    const nr = r + dir.dr;
    const nc = c + dir.dc;
    if (nr < 0 || nr >= n || nc < 0 || nc >= n) return false;
    return grid[nr][nc].type !== "wall";
  }

  function getEnterCost(grid, r, c) {
    return grid[r][c].type === "swamp" ? SWAMP_COST : 1;
  }

  function verifyPathExists(grid, n, start = { r: 0, c: 0 }, goal = { r: n - 1, c: n - 1 }) {
    if (grid[start.r][start.c].type === "wall" || grid[goal.r][goal.c].type === "wall") return false;
    const seen = Array.from({ length: n }, () => Array(n).fill(false));
    const queue = [{ r: start.r, c: start.c }];
    seen[start.r][start.c] = true;
    let head = 0;

    while (head < queue.length) {
      const { r, c } = queue[head++];
      if (r === goal.r && c === goal.c) return true;
      for (const dir of DIRS) {
        if (canPass(grid, n, r, c, dir)) {
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
        } else break;
      }
    }

    _sinkDown(idx) {
      const len = this.data.length;
      while (true) {
        const left = (idx << 1) + 1;
        const right = left + 1;
        let smallest = idx;
        if (left < len && this.compare(this.data[left], this.data[smallest]) < 0) smallest = left;
        if (right < len && this.compare(this.data[right], this.data[smallest]) < 0) smallest = right;
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

  function computePathCost(grid, path) {
    let cost = 0;
    for (let i = 1; i < path.length; i++) {
      cost += getEnterCost(grid, path[i].r, path[i].c);
    }
    return cost;
  }

  function runBFS(grid, n, recordTrace = true, start = { r: 0, c: 0 }, goal = { r: n - 1, c: n - 1 }) {
    const startR = start.r;
    const startC = start.c;
    const goalR = goal.r;
    const goalC = goal.c;
    const visited = Array.from({ length: n }, () => Array(n).fill(false));
    const parent = new Map();
    const queue = [{ r: startR, c: startC }];
    let head = 0;

    visited[startR][startC] = true;
    const steps = recordTrace ? [] : null;
    let exploredCount = 0;
    let found = false;

    while (head < queue.length) {
      const curr = queue[head++];
      exploredCount++;
      const discovered = recordTrace ? [] : null;

      if (curr.r === goalR && curr.c === goalC) {
        if (recordTrace) {
          steps.push({
            current: curr,
            discovered: [],
            dsCount: queue.length - head
          });
        }
        found = true;
        break;
      }

      for (const dir of DIRS) {
        if (canPass(grid, n, curr.r, curr.c, dir)) {
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
        steps.push({
          current: curr,
          discovered,
          dsCount: queue.length - head
        });
      }
    }

    const path = found ? reconstructPath(parent, goalR, goalC) : [];
    const totalCost = found ? computePathCost(grid, path) : 0;
    return {
      algo: "bfs",
      found,
      steps: steps || [],
      path,
      exploredCount,
      pathLength: found ? path.length - 1 : 0,
      totalCost
    };
  }

  function runDFS(grid, n, recordTrace = true, start = { r: 0, c: 0 }, goal = { r: n - 1, c: n - 1 }) {
    const goalR = goal.r;
    const goalC = goal.c;
    const visited = Array.from({ length: n }, () => Array(n).fill(false));
    const parent = new Map();
    const stack = [{ r: start.r, c: start.c }];

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
        if (recordTrace) {
          steps.push({
            current: curr,
            discovered: [],
            dsCount: stack.length
          });
        }
        found = true;
        break;
      }

      for (const dir of DIRS) {
        if (canPass(grid, n, curr.r, curr.c, dir)) {
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
        steps.push({
          current: curr,
          discovered,
          dsCount: stack.length
        });
      }
    }

    const path = found ? reconstructPath(parent, goalR, goalC) : [];
    const totalCost = found ? computePathCost(grid, path) : 0;
    return {
      algo: "dfs",
      found,
      steps: steps || [],
      path,
      exploredCount,
      pathLength: found ? path.length - 1 : 0,
      totalCost
    };
  }

  function runAStar(grid, n, recordTrace = true, start = { r: 0, c: 0 }, goal = { r: n - 1, c: n - 1 }) {
    const startR = start.r;
    const startC = start.c;
    const goalR = goal.r;
    const goalC = goal.c;
    const heuristic = (r, c) => Math.abs(goalR - r) + Math.abs(goalC - c);

    const gScore = Array.from({ length: n }, () => Array(n).fill(Infinity));
    const closed = Array.from({ length: n }, () => Array(n).fill(false));
    const parent = new Map();

    const pq = new MinHeap((a, b) => {
      if (a.f !== b.f) return a.f - b.f;
      return a.h - b.h;
    });

    gScore[startR][startC] = 0;
    const h0 = heuristic(startR, startC);
    pq.push({ r: startR, c: startC, g: 0, h: h0, f: h0 });

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
        if (recordTrace) {
          steps.push({
            current: { r: curr.r, c: curr.c },
            discovered: [],
            dsCount: pq.size,
            g: curr.g,
            h: curr.h,
            f: curr.f
          });
        }
        found = true;
        break;
      }

      for (const dir of DIRS) {
        if (canPass(grid, n, curr.r, curr.c, dir)) {
          const nr = curr.r + dir.dr;
          const nc = curr.c + dir.dc;
          if (closed[nr][nc]) continue;

          const tentativeG = curr.g + getEnterCost(grid, nr, nc);
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
        steps.push({
          current: { r: curr.r, c: curr.c },
          discovered,
          dsCount: pq.size,
          g: curr.g,
          h: curr.h,
          f: curr.f
        });
      }
    }

    const path = found ? reconstructPath(parent, goalR, goalC) : [];
    const totalCost = found ? computePathCost(grid, path) : 0;
    return {
      algo: "astar",
      found,
      steps: steps || [],
      path,
      exploredCount,
      pathLength: found ? path.length - 1 : 0,
      totalCost
    };
  }

  function executeAlgorithmTimed(algoId) {
    const runner = algoId === "bfs" ? runBFS : algoId === "dfs" ? runDFS : runAStar;
    const t0 = performance.now();
    const result = runner(state.grid, state.size, true, state.start, state.goal);
    const t1 = performance.now();
    let elapsedMs = t1 - t0;

    if (elapsedMs < 0.08) {
      const iterations = 25;
      const bt0 = performance.now();
      for (let i = 0; i < iterations; i++) {
        runner(state.grid, state.size, false, state.start, state.goal);
      }
      const bt1 = performance.now();
      elapsedMs = (bt1 - bt0) / iterations;
    }

    result.elapsedMs = elapsedMs;
    return result;
  }

  // =========================================================================
  // Trace Track Factory & Shared Canvas Renderer
  // =========================================================================
  function createTrack(result, prefillComplete = false) {
    const track = {
      algo: result.algo,
      result,
      exploredCells: [],
      exploredSet: new Set(),
      frontierSet: new Set(),
      currentHeadKey: null,
      exploredCursor: 0,
      pathCursor: 0,
      lastStepInfo: null
    };

    if (prefillComplete) {
      for (const s of result.steps) {
        track.exploredCells.push(s.current);
        track.exploredSet.add(cellKey(s.current.r, s.current.c));
      }
      track.exploredCursor = result.steps.length;
      track.pathCursor = result.path.length;
      track.lastStepInfo = result.steps[result.steps.length - 1] || null;
    }
    return track;
  }

  function advanceTrack(track, stepsToAdvance) {
    const { result } = track;
    const totalExplored = result.steps.length;
    const totalPath = result.path.length;

    while (stepsToAdvance > 0) {
      if (track.exploredCursor < totalExplored) {
        const step = result.steps[track.exploredCursor++];
        const key = cellKey(step.current.r, step.current.c);
        track.frontierSet.delete(key);
        track.exploredSet.add(key);
        track.exploredCells.push(step.current);
        track.currentHeadKey = key;
        track.lastStepInfo = step;

        for (const d of step.discovered) {
          const dk = cellKey(d.r, d.c);
          if (!track.exploredSet.has(dk)) {
            track.frontierSet.add(dk);
          }
        }
        stepsToAdvance--;
      } else if (result.found && track.pathCursor < totalPath) {
        track.currentHeadKey = null;
        track.frontierSet.clear();
        track.pathCursor = Math.min(totalPath, track.pathCursor + Math.max(1, Math.ceil(stepsToAdvance * 0.6)));
        stepsToAdvance = 0;
      } else {
        track.currentHeadKey = null;
        track.frontierSet.clear();
        break;
      }
    }

    const done = track.exploredCursor >= totalExplored && (!result.found || track.pathCursor >= totalPath);
    if (done) {
      track.currentHeadKey = null;
      track.frontierSet.clear();
    }
    return done;
  }

  function syncCanvasSize(canvasEl) {
    const prevW = canvasEl.style.width;
    const prevH = canvasEl.style.height;
    canvasEl.style.width = "0px";
    canvasEl.style.height = "0px";
    const rect = canvasEl.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const availH = rect.height > 0 ? rect.height : rect.width;
    const side = Math.max(150, Math.floor(Math.min(rect.width, availH)));
    if (rect.width > 0 && rect.height > 0) {
      canvasEl.style.width = `${side}px`;
      canvasEl.style.height = `${side}px`;
    } else {
      canvasEl.style.width = prevW;
      canvasEl.style.height = prevH;
    }
    if (canvasEl._lastSide === side && canvasEl._lastDpr === dpr) {
      return side;
    }
    canvasEl._lastSide = side;
    canvasEl._lastDpr = dpr;
    canvasEl.width = side * dpr;
    canvasEl.height = side * dpr;
    const context = canvasEl.getContext("2d");
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    return side;
  }

  function resizeAllCanvases() {
    syncCanvasSize(dom.canvas);
    Object.values(dom.raceCanvases).forEach((c) => syncCanvasSize(c));
    renderCurrentView();
  }

  function renderCurrentView() {
    if (state.viewMode === "race" && state.mode === "ai" && state.raceTracks) {
      for (const algoId of ["bfs", "dfs", "astar"]) {
        drawScene(dom.raceCanvases[algoId], "ai", state.raceTracks[algoId], algoId);
      }
    } else {
      drawScene(dom.canvas, state.mode, state.singleTrack, state.activeAlgoId);
    }
  }

  function drawScene(canvasEl, renderMode, track, algoId) {
    const c = canvasEl.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvasEl.width / dpr;
    const n = state.size;
    const padding = Math.max(5, Math.floor(width * 0.025));
    const boardSize = width - padding * 2;
    const cellSize = boardSize / n;

    c.fillStyle = "#080c14";
    c.fillRect(0, 0, width, width);

    c.fillStyle = "#0b111d";
    c.fillRect(padding, padding, boardSize, boardSize);

    // 1. Terrain cells (swamp & solid wall blocks)
    drawTerrainCells(c, padding, cellSize, n);

    // 2. Mode overlay
    if (renderMode === "ai" && track) {
      drawAiOverlay(c, padding, cellSize, track, algoId);
    } else if (renderMode === "manual") {
      drawManualOverlay(c, padding, cellSize);
    }

    // 3. Start & Goal markers
    drawTerminalCell(c, padding, cellSize, state.start.r, state.start.c, "#38bdf8", "起");
    drawTerminalCell(c, padding, cellSize, state.goal.r, state.goal.c, "#34d399", "終");

    // 4. Maze walls
    drawWalls(c, padding, cellSize, n);
  }

  function drawTerrainCells(c, padding, cellSize, n) {
    for (let r = 0; r < n; r++) {
      for (let col = 0; col < n; col++) {
        const type = state.grid[r][col].type;
        if (type === "normal") continue;

        const x = padding + col * cellSize;
        const y = padding + r * cellSize;

        if (type === "wall") {
          c.fillStyle = "#334155";
          c.fillRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
          c.strokeStyle = "#64748b";
          c.lineWidth = 0.8;
          c.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
        } else if (type === "swamp") {
          c.fillStyle = "rgba(180, 83, 9, 0.45)";
          c.fillRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
          if (cellSize >= 14) {
            c.fillStyle = "rgba(251, 191, 36, 0.55)";
            c.font = `700 ${Math.max(8, Math.floor(cellSize * 0.34))}px sans-serif`;
            c.textAlign = "center";
            c.textBaseline = "middle";
            c.fillText("×5", x + cellSize / 2, y + cellSize / 2);
          }
        }
      }
    }
  }

  function drawTerminalCell(c, padding, cellSize, r, col, color, label) {
    const x = padding + col * cellSize;
    const y = padding + r * cellSize;
    const inset = Math.max(1.2, cellSize * 0.12);

    c.save();
    c.fillStyle = color;
    c.globalAlpha = 0.28;
    c.fillRect(x + inset, y + inset, cellSize - inset * 2, cellSize - inset * 2);

    c.globalAlpha = 1;
    c.strokeStyle = color;
    c.lineWidth = Math.max(1, cellSize * 0.06);
    c.strokeRect(x + inset, y + inset, cellSize - inset * 2, cellSize - inset * 2);

    if (cellSize >= 14) {
      c.fillStyle = "#f8fafc";
      c.font = `700 ${Math.floor(cellSize * 0.42)}px "Noto Sans TC", sans-serif`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(label, x + cellSize / 2, y + cellSize / 2 + 0.5);
    }
    c.restore();
  }

  function drawAiOverlay(c, padding, cellSize, track, algoId) {
    const theme = ALGO_META[algoId] || ALGO_META.astar;
    const inset = Math.max(0.6, cellSize * 0.08);

    if (track.exploredCells.length > 0) {
      c.save();
      c.fillStyle = theme.exploredFill;
      for (const cell of track.exploredCells) {
        c.fillRect(
          padding + cell.c * cellSize + inset,
          padding + cell.r * cellSize + inset,
          cellSize - inset * 2,
          cellSize - inset * 2
        );
      }
      c.restore();
    }

    if (track.frontierSet.size > 0) {
      c.save();
      c.fillStyle = theme.frontierFill;
      const fInset = Math.max(1, cellSize * 0.2);
      for (const key of track.frontierSet) {
        const [rStr, cStr] = key.split(",");
        c.fillRect(
          padding + Number(cStr) * cellSize + fInset,
          padding + Number(rStr) * cellSize + fInset,
          cellSize - fInset * 2,
          cellSize - fInset * 2
        );
      }
      c.restore();
    }

    if (track.currentHeadKey && state.animStatus === "running") {
      const [rStr, cStr] = track.currentHeadKey.split(",");
      const cx = padding + (Number(cStr) + 0.5) * cellSize;
      const cy = padding + (Number(rStr) + 0.5) * cellSize;
      c.save();
      c.fillStyle = theme.headColor;
      c.beginPath();
      c.arc(cx, cy, Math.max(2, cellSize * 0.28), 0, Math.PI * 2);
      c.fill();
      c.restore();
    }

    if (track.result.found && track.pathCursor > 0) {
      drawPathRibbon(
        c,
        padding,
        cellSize,
        track.result.path,
        Math.min(track.pathCursor, track.result.path.length),
        theme.pathColor,
        theme.pathGlow
      );
    }
  }

  function drawManualOverlay(c, padding, cellSize) {
    const m = state.manual;

    c.save();
    c.fillStyle = "rgba(251, 191, 36, 0.14)";
    const inset = Math.max(1, cellSize * 0.12);
    for (const key of m.visitedSet) {
      const [rStr, cStr] = key.split(",");
      c.fillRect(
        padding + Number(cStr) * cellSize + inset,
        padding + Number(rStr) * cellSize + inset,
        cellSize - inset * 2,
        cellSize - inset * 2
      );
    }
    c.restore();

    if (m.trail.length > 1) {
      drawPathRibbon(c, padding, cellSize, m.trail, m.trail.length, "#fbbf24", "rgba(251, 191, 36, 0.45)", 0.72);
    }

    // Draw optimal AI path ON TOP as a high-contrast dashed neon-pink line so overlapping paths stay distinct
    if (m.showOptimal && m.optimalResult && m.optimalResult.found) {
      drawPathRibbon(
        c,
        padding,
        cellSize,
        m.optimalResult.path,
        m.optimalResult.path.length,
        "#f472b6",
        "rgba(244, 114, 182, 0.8)",
        1,
        { dashed: true, widthScale: 0.56 }
      );
    }

    const px = padding + (m.c + 0.5) * cellSize;
    const py = padding + (m.r + 0.5) * cellSize;
    const radius = Math.max(3.5, cellSize * 0.3);

    c.save();
    const isBumping = m.bumpAlpha > 0.02;
    const orbColor = isBumping ? "#fb7185" : "#fbbf24";
    c.fillStyle = orbColor;
    c.shadowColor = orbColor;
    c.shadowBlur = isBumping ? 14 : 10;
    c.beginPath();
    c.arc(px, py, radius, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = "#fffbeb";
    c.shadowBlur = 0;
    c.beginPath();
    c.arc(px, py, radius * 0.4, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  function drawPathRibbon(c, padding, cellSize, path, count, color, glowColor, alpha = 1, options = {}) {
    if (count < 1) return;
    c.save();
    c.globalAlpha = alpha;
    c.strokeStyle = color;
    c.shadowColor = glowColor;
    c.shadowBlur = Math.max(4, cellSize * 0.28);
    c.lineWidth = Math.max(2, cellSize * 0.25 * (options.widthScale || 1));
    c.lineCap = "round";
    c.lineJoin = "round";
    if (options.dashed) {
      c.setLineDash([Math.max(4, cellSize * 0.36), Math.max(3, cellSize * 0.26)]);
    }

    c.beginPath();
    for (let i = 0; i < count; i++) {
      const pt = path[i];
      const x = padding + (pt.c + 0.5) * cellSize;
      const y = padding + (pt.r + 0.5) * cellSize;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
    c.restore();
  }

  function drawWalls(c, padding, cellSize, n) {
    c.save();
    c.strokeStyle = "rgba(148, 163, 184, 0.72)";
    c.lineWidth = n === 40 ? 1.1 : n === 20 ? 1.6 : 2.1;
    c.lineCap = "square";

    c.beginPath();
    for (let r = 0; r < n; r++) {
      for (let col = 0; col < n; col++) {
        const w = state.grid[r][col].walls;
        const x1 = padding + col * cellSize;
        const y1 = padding + r * cellSize;
        const x2 = x1 + cellSize;
        const y2 = y1 + cellSize;

        if (w.top) {
          c.moveTo(x1, y1);
          c.lineTo(x2, y1);
        }
        if (w.left) {
          c.moveTo(x1, y1);
          c.lineTo(x1, y2);
        }
        if (r === n - 1 && w.bottom) {
          c.moveTo(x1, y2);
          c.lineTo(x2, y2);
        }
        if (col === n - 1 && w.right) {
          c.moveTo(x2, y1);
          c.lineTo(x2, y2);
        }
      }
    }
    c.stroke();

    c.strokeStyle = "rgba(56, 189, 248, 0.65)";
    c.lineWidth = Math.max(1.6, c.lineWidth + 0.4);
    c.strokeRect(padding, padding, n * cellSize, n * cellSize);
    c.restore();
  }

  // =========================================================================
  // View Switching & Playback Engine
  // =========================================================================
  function getStepsPerSecond(speedVal) {
    return 2.5 * Math.pow(1.0715, speedVal);
  }

  function stopLoop() {
    if (state.rafId !== null) {
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }
  }

  function setArenaView(viewMode) {
    state.viewMode = viewMode;
    const isRace = viewMode === "race" && state.mode === "ai";
    dom.appShell.classList.toggle("race-theatre", isRace);
    dom.canvasWrapper.classList.toggle("hidden", isRace);
    dom.editorToolbar.classList.toggle("hidden", isRace || state.mode !== "ai");
    dom.raceGrid.classList.toggle("hidden", !isRace);
    dom.raceViewSwitch.classList.toggle("hidden", !isRace);
    resizeAllCanvases();
  }

  function resetAiState(keepLeaderboard = true) {
    stopLoop();
    state.animStatus = "idle";
    state.isRacing = false;
    state.activeResult = null;
    state.singleTrack = null;
    state.raceTracks = null;
    state.activeAlgoId = state.selectedAlgo;
    state.stepAccumulator = 0;

    if (state.mode === "ai") {
      setArenaView("single");
    }

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
      setStatus("準備好了，請選擇演算法、編輯地形或直接同時競速", "idle");
      setInsight("點「開始」看單一演算法怎麼找路，或點「一鍵同時競速」一起比較。");
    }
    renderCurrentView();
  }

  function updatePlaybackButtons() {
    const s = state.animStatus;
    if (state.isRacing) {
      dom.startBtn.disabled = true;
      dom.startBtn.textContent = "競速中";
      dom.pauseBtn.disabled = s !== "running" && s !== "paused";
      dom.pauseBtn.textContent = s === "paused" ? "繼續" : "暫停";
      dom.resetBtn.disabled = false;
      dom.raceBtn.disabled = true;
      dom.skipRaceBtn.classList.remove("hidden");

      dom.raceReplayBtn.disabled = true;
      dom.racePauseBtn.disabled = s !== "running" && s !== "paused";
      dom.racePauseBtn.textContent = s === "paused" ? "繼續" : "暫停";
      dom.raceSkipBarBtn.classList.remove("hidden");
      return;
    }

    dom.skipRaceBtn.classList.add("hidden");
    dom.raceBtn.disabled = false;

    dom.raceReplayBtn.disabled = false;
    dom.racePauseBtn.disabled = true;
    dom.racePauseBtn.textContent = "暫停";
    dom.raceSkipBarBtn.classList.add("hidden");

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
    if (state.viewMode === "race" && state.raceTracks) {
      dom.hudAlgo.textContent = "三演算法同時競速";
      const totalExp =
        state.raceTracks.bfs.exploredCells.length +
        state.raceTracks.dfs.exploredCells.length +
        state.raceTracks.astar.exploredCells.length;
      dom.hudExplored.textContent = `合計 ${totalExp} 格`;
      const bestDone = state.raceResults.filter((r) => r.found).sort((a, b) => a.totalCost - b.totalCost)[0];
      dom.hudPath.textContent = bestDone ? `最佳 ${bestDone.pathLength} 步 / 成本 ${bestDone.totalCost}` : "競速進行中...";
      dom.hudTime.textContent = bestDone ? formatMs(bestDone.elapsedMs) : "-- ms";
      return;
    }

    const meta = ALGO_META[state.activeAlgoId] || ALGO_META[state.selectedAlgo];
    dom.hudAlgo.textContent = meta.fullName;

    if (!state.activeResult || !state.singleTrack) {
      dom.hudExplored.textContent = "0 格";
      dom.hudPath.textContent = "--";
      dom.hudTime.textContent = "-- ms";
      return;
    }

    dom.hudExplored.textContent = `${state.singleTrack.exploredCells.length} 格`;
    dom.hudTime.textContent = formatMs(state.activeResult.elapsedMs);

    if (state.animStatus === "finished" || state.singleTrack.pathCursor >= state.activeResult.path.length) {
      dom.hudPath.textContent = state.activeResult.found
        ? `${state.activeResult.pathLength} 步 / 成本 ${state.activeResult.totalCost}`
        : "無解（路徑受阻）";
    } else {
      dom.hudPath.textContent = "搜尋中...";
    }
  }

  function updateSingleInsight() {
    const track = state.singleTrack;
    if (!track || !track.lastStepInfo) return;
    const info = track.lastStepInfo;
    const meta = ALGO_META[track.algo];

    if (track.algo === "bfs") {
      setInsight(`待檢查：${info.dsCount} 格｜先進先出，像水波一樣逐層往外找路`);
    } else if (track.algo === "dfs") {
      setInsight(`待回溯：${info.dsCount} 格｜後進先出，沿這條分支深入探索、遇死路再回頭`);
    } else {
      setInsight(`候選格：${info.dsCount} 格｜目前最小估價：已走成本 ${info.g} + 預估距離 ${info.h} = ${info.f}`);
    }
  }

  function startSingleAlgorithm() {
    if (state.animStatus === "paused" && state.singleTrack && !state.isRacing) {
      resumeAnimation();
      return;
    }

    stopLoop();
    state.isRacing = false;
    setArenaView("single");

    state.activeAlgoId = state.selectedAlgo;
    state.activeResult = executeAlgorithmTimed(state.selectedAlgo);
    state.singleTrack = createTrack(state.activeResult, false);
    state.stepAccumulator = 0;
    state.animStatus = "running";
    state.lastFrameTime = performance.now();

    updatePlaybackButtons();
    updateAiHud();
    setStatus(`正在執行：${ALGO_META[state.selectedAlgo].fullName}`, "running");

    state.rafId = requestAnimationFrame(tickSingleAnimation);
  }

  function startRace() {
    stopLoop();
    state.isRacing = true;
    state.raceResults = [];
    state.selectedLeaderboardAlgo = null;

    const bfsRes = executeAlgorithmTimed("bfs");
    const dfsRes = executeAlgorithmTimed("dfs");
    const astarRes = executeAlgorithmTimed("astar");

    state.raceTracks = {
      bfs: createTrack(bfsRes, false),
      dfs: createTrack(dfsRes, false),
      astar: createTrack(astarRes, false)
    };
    state.stepAccumulator = 0;
    state.animStatus = "running";
    state.lastFrameTime = performance.now();

    setArenaView("race");
    renderLeaderboard();
    updateRaceMiniCards();

    dom.raceStatusBadge.textContent = "三路同時競速中";
    dom.raceStatusBadge.className = "badge badge-cyan";
    setStatus("三種演算法同時開跑（BFS vs DFS vs A*）！", "running");
    setInsight("同時比較：看看 A* 怎麼靠預估距離往終點找路，而 BFS 逐層擴散、DFS 深入繞行。");
    updatePlaybackButtons();
    updateAiHud();

    state.rafId = requestAnimationFrame(tickRaceAnimation);
  }

  function updateRaceMiniCards() {
    if (!state.raceTracks) return;
    const map = { bfs: "Bfs", dfs: "Dfs", astar: "Astar" };
    for (const id of ["bfs", "dfs", "astar"]) {
      const t = state.raceTracks[id];
      const done =
        t.exploredCursor >= t.result.steps.length &&
        (!t.result.found || t.pathCursor >= t.result.path.length);

      const statEl = dom.raceStats[id];
      const footEl = dom.raceFoots[id];
      if (done) {
        statEl.textContent = t.result.found ? "已抵達" : "無解";
        statEl.classList.add("done");
        footEl.textContent = t.result.found
          ? `探索：${t.result.exploredCount} 格 ｜ ${t.result.pathLength} 步 (成本 ${t.result.totalCost})`
          : `探索：${t.result.exploredCount} 格 ｜ 無路可走`;
      } else {
        statEl.textContent = "探索中";
        statEl.classList.remove("done");
        footEl.textContent = `探索：${t.exploredCells.length} 格 ｜ 計算中...`;
      }
    }
  }

  function tickSingleAnimation(now) {
    if (state.animStatus !== "running" || !state.singleTrack) return;

    const dt = Math.min(0.05, Math.max(0.001, (now - state.lastFrameTime) / 1000));
    state.lastFrameTime = now;
    state.stepAccumulator += getStepsPerSecond(state.speed) * dt;

    const stepsToAdvance = Math.floor(state.stepAccumulator);
    if (stepsToAdvance > 0) {
      state.stepAccumulator -= stepsToAdvance;
      const done = advanceTrack(state.singleTrack, stepsToAdvance);
      updateSingleInsight();
      updateAiHud();
      renderCurrentView();

      if (done) {
        finishSingleRun();
        return;
      }
    }

    state.rafId = requestAnimationFrame(tickSingleAnimation);
  }

  function finishSingleRun() {
    const res = state.activeResult;
    state.animStatus = "finished";
    upsertSingleResultIntoLeaderboard(res);
    state.selectedLeaderboardAlgo = res.algo;
    renderLeaderboard();
    updatePlaybackButtons();
    updateAiHud();
    renderCurrentView();

    const meta = ALGO_META[res.algo];
    if (res.found) {
      setStatus(`完成：${meta.name}（探索 ${res.exploredCount} 格，成本 ${res.totalCost}）`, "idle");
      setInsight(`結果分析：${meta.name} 探索了 ${res.exploredCount} 格，找到 ${res.pathLength} 步路線（總成本 ${res.totalCost}）。`);
    } else {
      setStatus(`無法抵達終點：路徑被障礙牆完全封鎖`, "idle");
      setInsight("提示：可用「橡皮擦」或「清空地形」開出通道後重新測試。");
    }
  }

  function tickRaceAnimation(now) {
    if (state.animStatus !== "running" || !state.raceTracks) return;

    const dt = Math.min(0.05, Math.max(0.001, (now - state.lastFrameTime) / 1000));
    state.lastFrameTime = now;
    state.stepAccumulator += getStepsPerSecond(state.speed) * dt;

    const stepsToAdvance = Math.floor(state.stepAccumulator);
    if (stepsToAdvance > 0) {
      state.stepAccumulator -= stepsToAdvance;

      let allDone = true;
      for (const id of ["bfs", "dfs", "astar"]) {
        const track = state.raceTracks[id];
        const done = advanceTrack(track, stepsToAdvance);
        if (done) {
          upsertSingleResultIntoLeaderboard(track.result);
        } else {
          allDone = false;
        }
      }

      updateRaceMiniCards();
      renderLeaderboard();
      updateAiHud();
      renderCurrentView();

      if (allDone) {
        finishRaceRun();
        return;
      }
    }

    state.rafId = requestAnimationFrame(tickRaceAnimation);
  }

  function skipRaceAnimation() {
    if (!state.isRacing || !state.raceTracks) return;
    stopLoop();
    for (const id of ["bfs", "dfs", "astar"]) {
      const res = state.raceTracks[id].result;
      state.raceTracks[id] = createTrack(res, true);
      upsertSingleResultIntoLeaderboard(res);
    }
    finishRaceRun();
  }

  function finishRaceRun() {
    state.isRacing = false;
    state.animStatus = "finished";
    updateRaceMiniCards();
    renderLeaderboard();
    updatePlaybackButtons();
    updateAiHud();
    renderCurrentView();

    const sorted = getSortedRaceResults();
    const winner = sorted[0];
    dom.raceStatusBadge.textContent = "競速完成";
    dom.raceStatusBadge.className = "badge badge-emerald";

    if (winner && winner.found) {
      const bfsRes = state.raceResults.find((r) => r.algo === "bfs");
      const astarRes = state.raceResults.find((r) => r.algo === "astar");
      setStatus(`競速完成！綜合表現最佳：${ALGO_META[winner.algo].name}`, "idle");
      if (bfsRes && astarRes && bfsRes.found && astarRes.found) {
        if (astarRes.totalCost < bfsRes.totalCost) {
          setInsight(`重點觀察：A* 成功避開泥沼（成本 ${astarRes.totalCost} vs BFS ${bfsRes.totalCost}），且探索格數更少！`);
        } else {
          setInsight(`重點觀察：A* 與 BFS 成本同樣為 ${astarRes.totalCost}，但 A* 只探索了 ${astarRes.exploredCount} 格（BFS 需 ${bfsRes.exploredCount} 格）。`);
        }
      }
    } else {
      setStatus("競速結束：起點與終點之間目前沒有連通路徑", "idle");
      setInsight("目前迷宮被完全封閉，請清除部分障礙牆後再試一次。");
    }
  }

  function resumeAnimation() {
    if (state.animStatus !== "paused") return;
    state.animStatus = "running";
    state.lastFrameTime = performance.now();
    updatePlaybackButtons();

    if (state.isRacing) {
      setStatus("三演算法繼續競速中...", "running");
      state.rafId = requestAnimationFrame(tickRaceAnimation);
    } else {
      setStatus(`繼續執行：${ALGO_META[state.activeAlgoId].fullName}`, "running");
      state.rafId = requestAnimationFrame(tickSingleAnimation);
    }
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

  function inspectAlgorithmOnSingleCanvas(algoId) {
    if (state.isRacing || state.animStatus === "running") return;
    const target = state.raceResults.find((r) => r.algo === algoId);
    if (!target) return;

    state.selectedLeaderboardAlgo = algoId;
    state.activeAlgoId = algoId;
    state.activeResult = target;
    state.singleTrack = createTrack(target, true);
    state.animStatus = "finished";

    setArenaView("single");
    renderLeaderboard();
    updatePlaybackButtons();
    updateAiHud();
    renderCurrentView();
    setStatus(`大圖檢視：${ALGO_META[algoId].fullName}`, "idle");
    setInsight(`${ALGO_META[algoId].name}：探索 ${target.exploredCount} 格，路徑 ${target.pathLength} 步，總成本 ${target.totalCost}。`);
  }

  // =========================================================================
  // Leaderboard Management
  // =========================================================================
  function upsertSingleResultIntoLeaderboard(result) {
    const idx = state.raceResults.findIndex((r) => r.algo === result.algo);
    if (idx >= 0) state.raceResults[idx] = result;
    else state.raceResults.push(result);
  }

  function getSortedRaceResults() {
    return [...state.raceResults].sort((a, b) => {
      if (a.found !== b.found) return a.found ? -1 : 1;
      if (a.totalCost !== b.totalCost) return a.totalCost - b.totalCost;
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
          <td colspan="7">點擊「一鍵同時競速」或執行單一演算法後，數據將即時統計於此</td>
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
          ? `<span class="status-found">✓ 已抵達</span>`
          : `<span class="status-missing">✕ 無路</span>`;

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
            <td>${res.found ? `${res.totalCost}` : "--"}</td>
            <td>${formatMs(res.elapsedMs)}</td>
            <td>${foundBadge}</td>
          </tr>
        `;
      })
      .join("");

    dom.leaderboardBody.querySelectorAll(".result-row").forEach((row) => {
      row.addEventListener("click", () => inspectAlgorithmOnSingleCanvas(row.dataset.algo));
    });

    if (state.viewMode === "race") {
      resizeAllCanvases();
    }
  }

  // =========================================================================
  // Canvas Interactive Terrain Editor
  // =========================================================================
  function getCanvasCellFromPointer(evt) {
    const rect = dom.canvas.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    const width = rect.width;
    const padding = Math.max(5, Math.floor(width * 0.025));
    const cellSize = (width - padding * 2) / state.size;
    const c = Math.floor((x - padding) / cellSize);
    const r = Math.floor((y - padding) / cellSize);

    if (r < 0 || r >= state.size || c < 0 || c >= state.size) return null;
    return { r, c };
  }

  function applyBrushAtCell(r, c) {
    const n = state.size;
    if (state.brush === "start") {
      if (r === state.goal.r && c === state.goal.c) return;
      if (r === state.start.r && c === state.start.c) return;
      state.grid[r][c].type = "normal";
      state.start = { r, c };
      resetAiState(false);
      resetManualChallenge();
      setStatus(`已設定新起點 (${r + 1}, ${c + 1})`, "idle");
      renderCurrentView();
      return;
    }

    if (state.brush === "goal") {
      if (r === state.start.r && c === state.start.c) return;
      if (r === state.goal.r && c === state.goal.c) return;
      state.grid[r][c].type = "normal";
      state.goal = { r, c };
      resetAiState(false);
      resetManualChallenge();
      setStatus(`已設定新終點 (${r + 1}, ${c + 1})`, "idle");
      renderCurrentView();
      return;
    }

    if ((r === state.start.r && c === state.start.c) || (r === state.goal.r && c === state.goal.c)) return;
    const cell = state.grid[r][c];
    let changed = false;

    if (state.brush === "wall" && cell.type !== "wall") {
      cell.type = "wall";
      changed = true;
    } else if (state.brush === "swamp" && cell.type !== "swamp") {
      cell.type = "swamp";
      changed = true;
    } else if (state.brush === "clear") {
      if (cell.type !== "normal") {
        cell.type = "normal";
        changed = true;
      }
      // Also carve open walls to walkable neighbors so eraser feels natural
      for (const dir of DIRS) {
        const nr = r + dir.dr;
        const nc = c + dir.dc;
        if (nr >= 0 && nr < n && nc >= 0 && nc < n && cell.walls[dir.key]) {
          cell.walls[dir.key] = false;
          state.grid[nr][nc].walls[dir.opp] = false;
          changed = true;
        }
      }
    }

    if (changed) {
      resetAiState(false);
      renderCurrentView();
    }
  }

  // =========================================================================
  // Manual Challenge Mode & Local Best Records
  // =========================================================================
  function loadBestRecords() {
    try {
      const raw = localStorage.getItem(BEST_RECORD_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveBestRecord(size, cost, steps, sec) {
    try {
      const records = loadBestRecords();
      const key = String(size);
      const prev = records[key];
      if (!prev || cost < prev.cost || (cost === prev.cost && sec < prev.sec)) {
        records[key] = { cost, steps, sec: Number(sec.toFixed(2)) };
        localStorage.setItem(BEST_RECORD_KEY, JSON.stringify(records));
      }
    } catch {
      // Ignore storage restriction in private/file mode
    }
  }

  function renderBestRecordBadge() {
    const key = String(state.size);
    dom.bestRecordSize.textContent = `${state.size}×${state.size}`;
    const records = loadBestRecords();
    const rec = records[key];
    dom.bestRecordText.textContent = rec
      ? `成本 ${rec.cost}（${rec.steps} 步 / ${rec.sec.toFixed(2)} 秒）`
      : "尚無紀錄";
  }

  function resetManualChallenge() {
    stopLoop();
    const m = state.manual;
    m.r = state.start.r;
    m.c = state.start.c;
    m.steps = 0;
    m.cost = 0;
    m.trail = [{ r: state.start.r, c: state.start.c }];
    m.visitedSet = new Set([cellKey(state.start.r, state.start.c)]);
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
    renderBestRecordBadge();
    updateManualHud();

    if (state.mode === "manual") {
      setArenaView("single");
      setStatus("準備好了，請按方向鍵或 WASD 移動", "idle");
      setInsight("試著找出成本最低的路徑，完成後會跟電腦最佳路線比較！");
    }
    renderCurrentView();
  }

  function updateManualHud() {
    const m = state.manual;
    const dist = Math.abs(state.goal.r - m.r) + Math.abs(state.goal.c - m.c);

    dom.manualSteps.textContent = m.cost !== m.steps ? `${m.steps} 步 / 成本 ${m.cost}` : `${m.steps} 步`;
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
      renderCurrentView();
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

    if (!canPass(state.grid, n, m.r, m.c, dir)) {
      m.bumpAlpha = 1;
      renderCurrentView();
      if (state.rafId === null) state.rafId = requestAnimationFrame(tickManualLoop);
      return;
    }

    if (!m.started) {
      m.started = true;
      m.startTime = performance.now();
      setStatus("手動挑戰計時中...", "running");
      if (state.rafId === null) state.rafId = requestAnimationFrame(tickManualLoop);
    }

    m.r += dir.dr;
    m.c += dir.dc;
    m.steps += 1;
    m.cost += getEnterCost(state.grid, m.r, m.c);
    m.trail.push({ r: m.r, c: m.c });
    m.visitedSet.add(cellKey(m.r, m.c));

    updateManualHud();
    renderCurrentView();

    if (m.r === state.goal.r && m.c === state.goal.c) {
      completeManualChallenge();
    }
  }

  function completeManualChallenge() {
    const m = state.manual;
    m.finished = true;
    m.elapsedMs = m.started ? performance.now() - m.startTime : 0;
    stopLoop();

    const optimal = executeAlgorithmTimed("astar");
    m.optimalResult = optimal;

    const optCost = optimal.found ? optimal.totalCost : m.cost;
    const optSteps = optimal.found ? optimal.pathLength : m.steps;
    const diffCost = m.cost - optCost;
    const efficiency = optCost > 0 ? Math.min(100, Math.round((optCost / m.cost) * 100)) : 100;
    const sec = m.elapsedMs / 1000;

    const isDefaultEndpoints =
      state.start.r === 0 &&
      state.start.c === 0 &&
      state.goal.r === state.size - 1 &&
      state.goal.c === state.size - 1;
    if (isDefaultEndpoints) {
      saveBestRecord(state.size, m.cost, m.steps, sec);
    }
    renderBestRecordBadge();

    dom.manualOptimalHint.textContent = `成本 ${optCost}`;
    dom.resPlayerSteps.textContent = `${m.steps} 步 / 成本 ${m.cost}`;
    dom.resOptimalSteps.textContent = `${optSteps} 步 / 成本 ${optCost}`;
    dom.resPlayerTime.textContent = `${sec.toFixed(2)} 秒`;
    dom.resAiTime.textContent = formatMs(optimal.elapsedMs);
    dom.resEfficiency.textContent = `${efficiency}%`;
    dom.resEfficiencyBar.style.width = `${efficiency}%`;

    if (diffCost === 0) {
      dom.manualGradeText.textContent = "完美最佳解！你的總成本與電腦最佳路徑完全一致！";
    } else {
      dom.manualGradeText.textContent = `比電腦最佳路線多花費 ${diffCost} 點成本，可點擊下方按鈕比對差異`;
    }

    dom.manualResultCard.classList.remove("hidden");
    updateManualHud();
    setStatus(`挑戰完成！${m.steps} 步（成本 ${m.cost} vs 電腦 ${optCost}）`, "idle");
    setInsight(`人機對比：你花費 ${sec.toFixed(2)} 秒、成本 ${m.cost}；A* 花費 ${formatMs(optimal.elapsedMs)} 找到成本 ${optCost} 的路線。`);
    renderCurrentView();
  }

  // =========================================================================
  // Mode Switching, Presets & Maze Lifecycle
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
      setArenaView("single");
      resetManualChallenge();
    }
  }

  function updatePresetButtonsUI() {
    dom.presetBtns.forEach((b) => b.classList.toggle("active", b.dataset.preset === state.preset));
    dom.sizeBtns.forEach((b) => b.classList.toggle("active", Number(b.dataset.size) === state.size));
  }

  function buildMazeFromState() {
    if (state.preset === "obstacles") {
      state.size = 20;
      state.grid = generateObstaclesPreset();
      dom.mazeSeedMeta.textContent = "關卡 ISLAND";
      dom.seedInput.value = "ISLAND";
    } else if (state.preset === "swamp") {
      state.size = 20;
      state.grid = generateSwampPreset();
      dom.mazeSeedMeta.textContent = "關卡 SWAMP";
      dom.seedInput.value = "SWAMP";
    } else {
      state.grid = generateRandomMaze(state.size, state.seed);
      const codeStr = formatSeedCode(state.seed);
      dom.mazeSeedMeta.textContent = `關卡 #${codeStr}`;
      dom.seedInput.value = codeStr;
    }

    updatePresetButtonsUI();
    state.start = { r: 0, c: 0 };
    state.goal = { r: state.size - 1, c: state.size - 1 };
    dom.mazeMeta.textContent = `尺寸：${state.size} × ${state.size}`;
    resetAiState(false);
    resetManualChallenge();

    if (state.mode === "ai") {
      if (state.preset === "obstacles") {
        setStatus("已載入「散落障礙」示範關卡", "idle");
        setInsight("示範重點：觀察 A* 如何精準繞開障礙直奔終點，而 BFS 幾乎淹滿整張地圖！");
      } else if (state.preset === "swamp") {
        setStatus("已載入「泥沼捷徑」示範關卡（泥沼每格成本 ×5）", "idle");
        setInsight("示範重點：點「一鍵同時競速」看 BFS 踩進泥沼 vs A* 聰明繞道省成本！");
      } else {
        setStatus(`已生成 ${state.size}×${state.size} 迷宮（代碼 #${formatSeedCode(state.seed)}）`, "idle");
      }
    }
    renderCurrentView();
  }

  function loadInitialFromHash() {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return false;
    const params = new URLSearchParams(hash);
    const s = Number(params.get("size"));
    const seed = params.get("seed");
    const preset = params.get("preset");

    if ([10, 20, 40].includes(s)) state.size = s;
    if (["random", "obstacles", "swamp"].includes(preset)) state.preset = preset;
    if (seed) {
      const parsed = parseSeedNumber(seed);
      if (parsed !== null) state.seed = parsed;
    }
    return true;
  }

  function updateSpeedLabel(sourceVal) {
    const v = Number(sourceVal !== undefined ? sourceVal : dom.speedSlider.value);
    state.speed = v;
    dom.speedSlider.value = String(v);
    dom.raceSpeedSlider.value = String(v);
    let label = "標準";
    if (v < 25) label = "慢速";
    else if (v >= 80) label = "極速";
    else if (v >= 60) label = "快速";
    const text = `${label} (${v})`;
    dom.speedValue.textContent = text;
    dom.raceSpeedBadge.textContent = text;
  }

  // =========================================================================
  // Event Listeners
  // =========================================================================
  function bindEvents() {
    window.addEventListener("resize", resizeAllCanvases);
    if (typeof ResizeObserver !== "undefined") {
      let resizeRaf = null;
      const ro = new ResizeObserver(() => {
        if (resizeRaf !== null) cancelAnimationFrame(resizeRaf);
        resizeRaf = requestAnimationFrame(() => {
          resizeRaf = null;
          resizeAllCanvases();
        });
      });
      ro.observe(dom.canvasWrapper);
      ro.observe(dom.raceGrid);
    }

    dom.modeAiBtn.addEventListener("click", () => switchMode("ai"));
    dom.modeManualBtn.addEventListener("click", () => switchMode("manual"));

    dom.sizeBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        state.size = Number(btn.dataset.size);
        state.preset = "random";
        state.seed = randomSeed();
        buildMazeFromState();
      });
    });

    dom.presetBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        state.preset = btn.dataset.preset;
        if (state.preset === "random") state.seed = randomSeed();
        buildMazeFromState();
      });
    });

    dom.generateMazeBtn.addEventListener("click", () => {
      state.preset = "random";
      state.seed = randomSeed();
      buildMazeFromState();
    });

    dom.seedInput.addEventListener("input", () => {
      const raw = dom.seedInput.value;
      if (/^#?\d+$/.test(raw)) {
        const hasHash = raw.startsWith("#");
        const digits = raw.replace(/\D/g, "").slice(0, 4);
        dom.seedInput.value = hasHash ? `#${digits}` : digits;
      }
    });

    dom.seedInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        dom.loadSeedBtn.click();
      }
    });

    dom.loadSeedBtn.addEventListener("click", () => {
      const val = dom.seedInput.value.trim().toUpperCase();
      if (!val) return;
      if (val === "ISLAND") {
        state.preset = "obstacles";
      } else if (val === "SWAMP") {
        state.preset = "swamp";
      } else {
        const parsed = parseSeedNumber(val);
        if (parsed === null) {
          setStatus("請輸入 0001～9999 的數字代碼", "idle");
          dom.seedInput.value = formatSeedCode(state.seed);
          return;
        }
        state.preset = "random";
        state.seed = parsed;
      }
      buildMazeFromState();
    });

    dom.copyShareBtn.addEventListener("click", () => {
      const hash = `size=${state.size}&preset=${state.preset}&seed=${state.seed}`;
      window.location.hash = hash;
      const url = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(
          () => setStatus("已複製同關卡分享連結！可貼給同學 PK 同一張迷宮", "idle"),
          () => setStatus("網址列已更新為本關卡代碼，可直接複製網址分享", "idle")
        );
      } else {
        setStatus("網址列已更新為本關卡代碼，可直接複製網址分享", "idle");
      }
    });

    // Brush editor events
    dom.brushBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        dom.brushBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.brush = btn.dataset.brush;
        dom.canvasWrapper.classList.toggle("editing", state.brush !== "none");
      });
    });

    dom.clearCustomBtn.addEventListener("click", () => {
      for (let r = 0; r < state.size; r++) {
        for (let c = 0; c < state.size; c++) {
          state.grid[r][c].type = "normal";
        }
      }
      resetAiState(false);
      renderCurrentView();
      setStatus("已清空所有障礙牆與泥沼地形", "idle");
    });

    dom.canvas.addEventListener("pointerdown", (e) => {
      if (state.mode !== "ai" || state.brush === "none" || state.animStatus === "running") return;
      if (e.cancelable) e.preventDefault();
      state.isPainting = true;
      const cell = getCanvasCellFromPointer(e);
      if (cell) applyBrushAtCell(cell.r, cell.c);
    });

    dom.canvas.addEventListener("pointermove", (e) => {
      if (!state.isPainting || state.brush === "none") return;
      if (e.cancelable) e.preventDefault();
      const cell = getCanvasCellFromPointer(e);
      if (cell) applyBrushAtCell(cell.r, cell.c);
    });

    window.addEventListener("pointerup", () => {
      state.isPainting = false;
    });

    // Algorithm selection & playback
    dom.algoBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (state.isRacing) return;
        dom.algoBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.selectedAlgo = btn.dataset.algo;
        state.activeAlgoId = state.selectedAlgo;
        resetAiState(true);
      });
    });

    dom.startBtn.addEventListener("click", startSingleAlgorithm);
    dom.pauseBtn.addEventListener("click", togglePauseAnimation);
    dom.resetBtn.addEventListener("click", () => resetAiState(true));
    dom.speedSlider.addEventListener("input", () => updateSpeedLabel(dom.speedSlider.value));
    dom.raceSpeedSlider.addEventListener("input", () => updateSpeedLabel(dom.raceSpeedSlider.value));
    dom.raceBtn.addEventListener("click", startRace);
    dom.raceReplayBtn.addEventListener("click", startRace);
    dom.racePauseBtn.addEventListener("click", togglePauseAnimation);
    dom.skipRaceBtn.addEventListener("click", skipRaceAnimation);
    dom.raceSkipBarBtn.addEventListener("click", skipRaceAnimation);

    dom.backToSingleBtn.addEventListener("click", () => {
      const targetAlgo = state.selectedLeaderboardAlgo || state.selectedAlgo;
      if (state.raceResults.some((r) => r.algo === targetAlgo)) {
        inspectAlgorithmOnSingleCanvas(targetAlgo);
      } else {
        setArenaView("single");
        renderCurrentView();
      }
    });

    dom.raceCards.forEach((card) => {
      card.addEventListener("click", () => {
        const algoId = card.dataset.raceAlgo;
        if (!state.isRacing && state.raceResults.some((r) => r.algo === algoId)) {
          inspectAlgorithmOnSingleCanvas(algoId);
        }
      });
    });

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
      renderCurrentView();
    });

    window.addEventListener("keydown", (e) => {
      if (state.mode !== "manual") return;
      if (document.activeElement && document.activeElement.tagName === "INPUT") return;
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
    if (!loadInitialFromHash()) {
      state.seed = randomSeed();
    }
    buildMazeFromState();
    resizeAllCanvases();
  }

  init();
})();
