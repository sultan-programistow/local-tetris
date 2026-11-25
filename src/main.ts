import "./style.css";
import * as audio from "./audio";
import { MatchState } from "./game/state";
import { collides, tryRotate } from "./game/collision";
import { Board } from "./game/board";
import { COLS, ROWS } from "./game/board";
import { availablePieces } from "./game/pieces";
import {
  preload as preloadAudio,
  setVolume as setAudioVolume,
  play as playSfx,
  stop as stopSfx,
} from "./audio";

const STORAGE_STATS = "local-tetris:stats";
const STORAGE_VOLUME = "local-tetris:volume";

interface Session {
  date: string;
  winner: string;
  scores: [number, number];
  pieces: [number, number];
  durationMs: number;
}
interface Stats {
  sessionsPlayed: number;
  sessionsToday: number;
  totalPlayTimeMs: number;
  todayPlayTimeMs: number;
  todayDate: string;
  winsP1: number;
  winsP2: number;
  winsP1Today: number;
  winsP2Today: number;
  sessions: Session[];
}

function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function localIsoStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const sec = String(d.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}:${sec}`;
}
function loadStats(): Stats {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_STATS) || "");
    if (s.todayPlayTimeMs === undefined) s.todayPlayTimeMs = 0;
    if (!s.todayDate) s.todayDate = localDateStr();
    if (s.sessionsToday === undefined) s.sessionsToday = 0;
    if (s.winsP1Today === undefined) s.winsP1Today = 0;
    if (s.winsP2Today === undefined) s.winsP2Today = 0;
    if (!Array.isArray(s.sessions)) s.sessions = s.lastSessions || [];
    for (const sess of s.sessions) if (sess.durationMs === undefined) sess.durationMs = 0;
    return s;
  } catch {
    return {
      sessionsPlayed: 0,
      sessionsToday: 0,
      totalPlayTimeMs: 0,
      todayPlayTimeMs: 0,
      todayDate: localDateStr(),
      winsP1: 0,
      winsP2: 0,
      winsP1Today: 0,
      winsP2Today: 0,
      sessions: [],
    };
  }
}
function saveStats(s: Stats) {
  localStorage.setItem(STORAGE_STATS, JSON.stringify(s));
}
function loadVolume(): number {
  const v = parseFloat(localStorage.getItem(STORAGE_VOLUME) || "0.7");
  return isNaN(v) ? 0.7 : v;
}
function saveVolume(v: number) {
  localStorage.setItem(STORAGE_VOLUME, String(v));
}

const canvas = document.createElement("canvas");
canvas.width = 1920;
canvas.height = 1080;
document.getElementById("app")!.appendChild(canvas);
const ctx = canvas.getContext("2d")!;

function scaleCanvas() {
  const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  canvas.style.width = 1920 * s + "px";
  canvas.style.height = 1080 * s + "px";
}
window.addEventListener("resize", scaleCanvas);
scaleCanvas();

// Input
const keys = new Set<string>();
const keyEdges = new Set<string>();
let prevKeys = new Set<string>();
const USED_KEYS = new Set([
  "a",
  "d",
  "s",
  "z",
  "x",
  "w",
  "W",
  "ArrowLeft",
  "ArrowRight",
  "ArrowDown",
  "ArrowUp",
  "[",
  "]",
  "Escape",
  "Enter",
  " ",
]);
window.addEventListener("keydown", (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (USED_KEYS.has(k) || USED_KEYS.has(e.key)) {
    keys.add(k);
    keyEdges.add(k);
    e.preventDefault();
  }
  // rotation edge handling during play
  if (screen === "play" && match && match.status === "playing") {
    let idx = -1,
      dir = 0;
    if (k === "z") {
      idx = 0;
      dir = -1;
    } else if (k === "x" || k === "w") {
      idx = 0;
      dir = 1;
    } else if (k === "[" || k === "{") {
      idx = 1;
      dir = -1;
    } else if (k === "]" || k === "}" || k === "arrowup") {
      idx = 1;
      dir = 1;
    }
    if (idx >= 0) {
      const p = match.players[idx] as any;
      if (p.current && !p.gameOver) {
        tryRotate(p.board, p.current, dir as 1 | -1);
        playSfx("rotate", idx === 0 ?  -0.95 : 0.95);
        p.lockTimer = 0;
      }
    }
  }
});
window.addEventListener("keyup", (e) => {
  keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
});

// Mouse support for menus
let mouseX = 0,
  mouseY = 0;
let hoveredMenu = -1;
let volumeDragging = false;
function toLogical(e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  mouseX = (e.clientX - rect.left) * (1920 / rect.width);
  mouseY = (e.clientY - rect.top) * (1080 / rect.height);
}
canvas.addEventListener("mousemove", (e) => {
  toLogical(e);
  updateHover();
});
canvas.addEventListener("mousedown", (e) => {
  toLogical(e);
  handleMouseClick();
  volumeDragging = screen === "volume";
});
window.addEventListener("mousemove", (e) => {
  if (volumeDragging) {
    toLogical(e);
    updateVolumeFromMouse();
  }
});
window.addEventListener("mouseup", () => {
  volumeDragging = false;
});
function updateHover() {
  if (screen === "gameover") {
    [0, 1, 2].forEach((i) => {
      const y = 500 + i * 60;
      if (
        mouseX >= 860 &&
        mouseX <= 1060 &&
        mouseY >= y - 30 &&
        mouseY <= y + 10
      )
      {
        if (gameOverIndex !== i) playSfx("menu_select");
        gameOverIndex = i;
      }
    });
    return;
  }
  if (screen === "menu") {
    hoveredMenu = -1;
    menuItems().forEach((_, i) => {
      const y = 400 + i * 60;
      if (
        mouseX >= 800 &&
        mouseX <= 1120 &&
        mouseY >= y - 30 &&
        mouseY <= y + 10
      ) {
        if (menuIndex !== i) playSfx("menu_select");
        hoveredMenu = i;
        menuIndex = i;
      }
    });
  }
}
function handleMouseClick() {
  if (screen === "menu" && hoveredMenu >= 0) {
    menuIndex = hoveredMenu;
    const opt = menuItems()[menuIndex];
    if (opt === "Start" || opt === "Resume" || opt === "Restart") {
      if (opt === "Resume") {
        pausedFromGame = false;
        screen = pausedReturn;
        if (match) match.status = "playing";
        playSfx("unpause");
      } else {
        pausedFromGame = false;
        startMatch();
      }
    } else if (opt === "Stats") { screen = "stats"; playSfx("menu_enter"); }
    else if (opt === "Volume") { screen = "volume"; playSfx("menu_enter"); }
    else if (opt === "Controls") { screen = "controls"; playSfx("menu_enter"); }
  } else if (screen === "volume") {
    updateVolumeFromMouse();
  } else if (screen === "gameover") {
    if (gameOverIndex === 0) startMatch();
    else if (gameOverIndex === 1) screen = "stats";
    else {
      screen = "menu";
      gameOverIndex = 0;
    }
  } else if (screen === "stats" || screen === "controls") {
    // click anywhere back? keep esc; no
  }
}
function updateVolumeFromMouse() {
  if (screen !== "volume") return;
  // slider region
  const v = Math.min(1, Math.max(0, (mouseX - 400) / 1120));
  volume = v;
  saveVolume(volume);
  setAudioVolume(volume);
  playSfx("menu_select");
}

let match: MatchState | null = null;
let screen:
  "menu" | "countdown" | "play" | "gameover" | "stats" | "controls" | "volume" =
  "menu";
let pausedFromGame = false;
let pausedReturn: "play" | "countdown" = "play";
let menuIndex = 0;
let gameOverIndex = 0;
let statsScroll = 0;
/** Monotonic count of completed draw() calls; exposed only through the ?e2e=1 hook. */
let frameCounter = 0;
function menuItems(): string[] {
  const items = pausedFromGame
    ? ["Resume", "Restart", "Stats", "Volume", "Controls"]
    : ["Start", "Stats", "Volume", "Controls"];
  return items;
}
let volume = loadVolume();
setAudioVolume(volume);
preloadAudio();
let sessionStart = 0;
let stats = loadStats();

function startMatch() {
  pausedFromGame = false;
  pausedReturn = "play";
  const seed = Math.floor(Math.random() * 1e9);
  match = new MatchState(seed);
  screen = "countdown";
  playSfx("countdown");
  sessionStart = Date.now();
  // spawn first pieces after countdown; we'll handle in update
}

function speedForLevel(lvl: number): number {
  const base = 0.8;
  const speed = base * Math.pow(0.9, lvl - 1);
  return Math.max(0.05, speed);
}

function update(dt: number) {
  prevKeys = new Set(keys);
  if (!match) return;
  if (screen === "countdown") {
    if (match.status === "paused") return;
    const beforeMs = match.countdownMs;
    match.countdownMs -= dt * 1000;
    const beforeN = Math.max(0, Math.ceil(beforeMs / 1000));
    const afterN = Math.max(0, Math.ceil(match.countdownMs / 1000));
    // play a beep for each number we cross into
    for (let n = beforeN - 1; n >= afterN; n--) {
      if (n === 2 || n === 1) playSfx("countdown", 0);
      if (n === 0) playSfx("countdown_go", 0);
    }
    if (match.countdownMs <= 0) {
      screen = "play";
      // spawn initial pieces for both
      match.spawnFor(match.players[0]);
      match.spawnFor(match.players[1]);
      match.status = "playing";
    }
    return;
  }
  if (screen !== "play") return;
  if (match.status === "paused") return;

  // Gamepad polling
  const gps = (navigator as any).getGamepads
    ? (navigator as any).getGamepads()
    : [];
  for (let gi = 0; gi < 2; gi++) {
    const gp = gps[gi];
    if (!gp) continue;
    const p = match.players[gi] as any;
    if (p.gameOver || !p.current) continue;
    // D-pad / left stick
    const left = gp.buttons[14]?.pressed || gp.axes[0] < -0.5;
    const right = gp.buttons[15]?.pressed || gp.axes[0] > 0.5;
    const softDropBtn = gp.buttons[0]?.pressed || gp.buttons[13]?.pressed;
    const upBtn = gp.buttons[12]?.pressed;
    // edge detection for left/right handled by keys set? We'll inject into keys via a virtual set? Instead handle movement directly.
    // For simplicity, set virtual key flags by toggling a gamepad state on player
    if (p._gp === undefined)
      p._gp = {
        left: false,
        right: false,
        down: false,
        a: false,
        x: false,
        b: false,
      };
    const g = p._gp;
    g.left = left;
    g.right = right;
    g.down = softDropBtn;
    if (g._thL === undefined) {
      g._thL = 350;
      g._thR = 350;
      g._tL = 0;
      g._tR = 0;
      g._heldL = false;
      g._heldR = false;
    }
    if (g._curRef !== p.current) {
      g._thL = 350;
      g._thR = 350;
      g._tL = 0;
      g._tR = 0;
      g._heldL = false;
      g._heldR = false;
      g._curRef = p.current;
    }
    // left DAS
    if (left) {
      if (!g._heldL) {
        if (p.current && !collides(p.board, p.current, -1, 0)) {
          p.current.x -= 1;
          p.lockTimer = 0;
          playSfx("move", gi === 0 ?  -0.95 : 0.95);
        }
        g._tL = 0;
        g._thL = 350;
        g._heldL = true;
      } else {
        g._tL += dt * 1000;
        if (g._tL >= g._thL) {
          if (p.current && !collides(p.board, p.current, -1, 0)) {
            p.current.x -= 1;
            p.lockTimer = 0;
          }
          g._tL = 0;
          g._thL = 75;
        }
      }
    } else {
      g._tL = 0;
      g._thL = 350;
      g._heldL = false;
    }
    // right DAS
    if (right) {
      if (!g._heldR) {
        if (p.current && !collides(p.board, p.current, 1, 0)) {
          p.current.x += 1;
          p.lockTimer = 0;
          playSfx("move", gi === 0 ?  -0.95 : 0.95);
        }
        g._tR = 0;
        g._thR = 350;
        g._heldR = true;
      } else {
        g._tR += dt * 1000;
        if (g._tR >= g._thR) {
          if (p.current && !collides(p.board, p.current, 1, 0)) {
            p.current.x += 1;
            p.lockTimer = 0;
          }
          g._tR = 0;
          g._thR = 75;
        }
      }
    } else {
      g._tR = 0;
      g._thR = 350;
      g._heldR = false;
    }
    // D-pad up rotates CW (edge)
    if (upBtn && !g.up && p.current) {
      tryRotate(p.board, p.current, 1);
      p.lockTimer = 0;
    }
    g.up = upBtn;
    // rotation buttons: X(2) CCW, B(1) CW, triggers
    const ccw = gp.buttons[2]?.pressed || gp.buttons[4]?.pressed;
    const cw = gp.buttons[1]?.pressed || gp.buttons[5]?.pressed;
    if (ccw && !g.ccw) {
      tryRotate(p.board, p.current, -1);
      p.lockTimer = 0;
    }
    if (cw && !g.cw) {
      tryRotate(p.board, p.current, 1);
      p.lockTimer = 0;
    }
    g.ccw = ccw;
    g.cw = cw;
  }

  for (let i = 0; i < 2; i++) {
    const p = match.players[i] as any;
    if (p.gameOver) continue;
    const isP1 = i === 0;
    const leftKey = isP1 ? "a" : "ArrowLeft";
    const rightKey = isP1 ? "d" : "ArrowRight";
    const downKey = isP1 ? "s" : "ArrowDown";

    // horizontal DAS
    if (p._leftHeld === undefined) {
      p._leftHeld = false;
      p._rightHeld = false;
      p._dasL = 0;
      p._dasR = 0;
      p._movedL = false;
      p._movedR = false;
    }
    const leftHeld = keys.has(leftKey);
    const rightHeld = keys.has(rightKey);
    if (p._dasThresholdL === undefined) {
      p._dasThresholdL = 350;
      p._dasThresholdR = 350;
    }
    if (p._currentRef !== p.current) {
      p._dasL = 0;
      p._dasThresholdL = 350;
      p._dasR = 0;
      p._dasThresholdR = 350;
      p._currentRef = p.current;
    }
    const leftEdge =
      (keys.has(leftKey) && !prevKeys.has(leftKey)) ||
      (leftHeld && !p._leftHeld);
    if (leftEdge) {
      // just pressed
      if (p.current && !collides(p.board, p.current, -1, 0)) {
        p.current.x -= 1;
        p.lockTimer = 0;
        playSfx("move", i === 0 ?  -0.95 : 0.95);
      }
      p._dasL = 0;
      p._dasThresholdL = 350;
    }
    const rightEdge =
      (keys.has(rightKey) && !prevKeys.has(rightKey)) ||
      (rightHeld && !p._rightHeld);
    if (rightEdge) {
      if (p.current && !collides(p.board, p.current, 1, 0)) {
        p.current.x += 1;
        p.lockTimer = 0;
        playSfx("move", i === 0 ?  -0.95 : 0.95);
      }
      p._dasR = 0;
      p._dasThresholdR = 350;
    }
    p._leftHeld = leftHeld;
    p._rightHeld = rightHeld;
    // DAS repeat
    if (leftHeld && p.current) {
      p._dasL += dt * 1000;
      if (p._dasL >= p._dasThresholdL) {
        if (!collides(p.board, p.current, -1, 0)) {
          p.current.x -= 1;
          p.lockTimer = 0;
          playSfx("move", i === 0 ?  -0.95 : 0.95);
        }
        p._dasL = 0;
        p._dasThresholdL = 75;
      }
    } else {
      p._dasL = 0;
      p._dasThresholdL = 350;
    }
    if (rightHeld && p.current) {
      p._dasR += dt * 1000;
      if (p._dasR >= p._dasThresholdR) {
        if (!collides(p.board, p.current, 1, 0)) {
          p.current.x += 1;
          p.lockTimer = 0;
          playSfx("move", i === 0 ?  -0.95 : 0.95);
        }
        p._dasR = 0;
        p._dasThresholdR = 75;
      }
    } else {
      p._dasR = 0;
      p._dasThresholdR = 350;
    }

    // soft drop with 350ms initial delay then 10ms repeat
    const gpSoft = p._gp && p._gp.down ? true : false;
    const softHeld = keys.has(downKey) || gpSoft;
    if (p._sdTimer === undefined) p._sdTimer = 0;
    if (p._sdHeldPrev === undefined) p._sdHeldPrev = false;
    if (p._sdFastPlayed === undefined) p._sdFastPlayed = false;
    if (softHeld && p.current) {
      if (!p._sdHeldPrev) {
        // tap: immediate single cell
        if (!collides(p.board, p.current, 0, 1)) {
          p.current.y += 1;
          p.lockTimer = 0;
          playSfx("soft_drop", i === 0 ?  -0.95 : 0.95);
        }
        p._sdTimer = 0;
        p._sdFastPlayed = false;
      } else {
        p._sdTimer += dt * 1000;
        if (p._sdTimer >= 350) {
          if (!p._sdFastPlayed) {
            playSfx("soft_drop_fast", i === 0 ?  -0.95 : 0.95);
            p._sdFastPlayed = true;
          }
          if (!collides(p.board, p.current, 0, 1)) {
            p.current.y += 1;
            p.lockTimer = 0;
          }
          p._sdTimer = 340;
        }
      }
    } else {
      p._sdTimer = 0;
      if (p._sdFastPlayed) stopSfx("soft_drop_fast");
      p._sdFastPlayed = false;
    }
    p._sdHeldPrev = softHeld;

    // gravity
    if (p.dropAcc === undefined) p.dropAcc = 0;
    p.dropAcc += dt;
    const speed = speedForLevel(p.level);
    if (p.dropAcc >= speed) {
      p.dropAcc = 0;
      if (p.current) {
        if (!collides(p.board, p.current, 0, 1)) {
          p.current.y += 1;
          p.lockTimer = 0;
        }
      }
    }
    // lock delay
    if (p.current && collides(p.board, p.current, 0, 1)) {
      if (p.lockTimer <= 0) p.lockTimer = 0.5;
      p.lockTimer -= dt;
      if (p.lockTimer <= 0) lockPiece(p, i);
    } else {
      p.lockTimer = 0;
    }
  }

  // check top-out transitions
  if (match.firstTopOut === null) {
    for (let i = 0; i < 2; i++) {
      if (match.players[i].toppedOut) {
        match.firstTopOut = i;
        match.frozenScore = match.players[i].score;
        break;
      }
    }
  } else {
    // other player continues; if they top out, decide winner
    const other = 1 - match.firstTopOut;
    if (match.players[other].toppedOut) {
      decideWinner();
    }
  }
}

function handleInput(p: any, idx: number, dt: number) {
  if (!p.current) return;
  // key maps
  const isP1 = idx === 0;
  const left = isP1 ? "a" : "ArrowLeft";
  const right = isP1 ? "d" : "ArrowRight";
  const down = isP1 ? "s" : "ArrowDown";
  const rotCCW = isP1 ? "z" : "[";
  const rotCW = isP1 ? "x" : "]";

  // movement with DAS
  if (keys.has(left)) {
    p.dasLeft += dt * 1000;
    if (p.dasLeft >= 350) {
      // move
      if (p.dasLeft - dt * 1000 < 133) {
        // initial
        if (!collides(p.board, p.current, -1, 0)) {
          p.current.x -= 1;
          p.lockTimer = 0;
          playSfx("move", idx === 0 ?  -0.95 : 0.95);
        }
      } else {
        // repeat every 33ms handled by accumulator threshold
      }
    }
  } else p.dasLeft = 0;
  // simplified: just move on keydown edges is hard with set; do polling with timers
  // We'll do simple: if key held, move with DAS using a timer field
}

function lockPiece(p: any, idx: number) {
  const piece = p.current;
  if (!piece) return;
  for (let r = 0; r < piece.matrix.length; r++)
    for (let c = 0; c < piece.matrix[r].length; c++) {
      if (piece.matrix[r][c]) {
        const x = piece.x + c,
          y = piece.y + r;
        if (y < 0) {
          p.toppedOut = true;
          p.gameOver = true;
          return;
        }
        p.board.set(x, y, piece.def.color);
      }
    }
  p.score += 1;
  p.piecesPlaced += 1;
  // level
  p.level = Math.floor(p.piecesPlaced / 10) + 1;
  // line clear
  const full = p.board.fullRows();
  const cleared = full.length > 0;
  if (cleared) p.board.removeRows(full);
  // spawn next
  match!.spawnFor(p);
  // check immediate collision => top out
  if (p.current && collides(p.board, p.current)) {
    p.toppedOut = true;
    p.gameOver = true;
    p.current = null;
  }
  // suppress placement SFX if this leaves both players topped out (match ends -> only game_over)
  const other = idx === 0 ? 1 : 0;
  const matchEnds = p.toppedOut && !!(match!.players[other] && match!.players[other].toppedOut);
  if (!matchEnds) {
    if (cleared) playSfx("line_clear", idx === 0 ?  -0.95 : 0.95);
    else playSfx("piece_lock", idx === 0 ?  -0.95 : 0.95);
  }
}

function decideWinner() {
  const p0 = match!.players[0],
    p1 = match!.players[1];
  let w: "p1" | "p2" | "draw";
  if (p0.score > p1.score) w = "p1";
  else if (p1.score > p0.score) w = "p2";
  else w = "draw";
  match!.winner = w;
  match!.status = "gameover";
  screen = "gameover";
  playSfx("game_over");
  // stats
  const sess: Session = {
    date: new Date().toISOString(),
    winner: w,
    scores: [p0.score, p1.score],
    pieces: [p0.piecesPlaced, p1.piecesPlaced],
    durationMs: Date.now() - sessionStart,
  };
  stats.sessionsPlayed++;
  const today = localDateStr();
  if (stats.todayDate !== today) {
    stats.todayDate = today;
    stats.todayPlayTimeMs = 0;
    stats.sessionsToday = 0;
    stats.winsP1Today = 0;
    stats.winsP2Today = 0;
  }
  stats.sessionsToday++;
  const playMs = Date.now() - sessionStart;
  stats.totalPlayTimeMs += playMs;
  stats.todayPlayTimeMs += playMs;
  if (w === "p1") {
    stats.winsP1++;
    stats.winsP1Today++;
  }
  if (w === "p2") {
    stats.winsP2++;
    stats.winsP2Today++;
  }
  stats.sessions.unshift(sess);
  saveStats(stats);
}

// Rendering
declare const __GIT_HASH__: string;
function draw() {
  frameCounter++;
  ctx.fillStyle = "#0f1115";
  ctx.fillRect(0, 0, 1920, 1080);
  if (screen === "menu") drawMenu();
  else if (screen === "countdown") drawPlay(true);
  else if (screen === "play") drawPlay(false);
  else if (screen === "gameover") drawGameOver();
  else if (screen === "stats") drawStats();
  else if (screen === "controls") drawControls();
  else if (screen === "volume") drawVolume();
  // build hash
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "12px monospace";
  ctx.textAlign = "right";
  ctx.fillText(__GIT_HASH__, 1910, 1070);
  ctx.textAlign = "left";
  requestAnimationFrame(draw);
}

function drawBoard(p: any, ox: number, oy: number, cell: number) {
  const over = p.gameOver || p.toppedOut;
  // grid lines (brighter)
  ctx.strokeStyle = "#444";
  ctx.lineWidth = 1;
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(ox, oy + r * cell);
    ctx.lineTo(ox + COLS * cell, oy + r * cell);
    ctx.stroke();
  }
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(ox + c * cell, oy);
    ctx.lineTo(ox + c * cell, oy + ROWS * cell);
    ctx.stroke();
  }
  // board border
  ctx.strokeStyle = "#ccc";
  ctx.lineWidth = 2;
  ctx.strokeRect(ox, oy, COLS * cell, ROWS * cell);
  // cells
  ctx.save();
  if (over) ctx.globalAlpha = 0.35;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const v = p.board.grid[r][c];
      if (v) {
        ctx.fillStyle = v;
        ctx.fillRect(ox + c * cell + 1, oy + r * cell + 1, cell - 2, cell - 2);
      }
    }
  ctx.restore();
  // current piece (only while playing)
  if (p.current && !over) {
    ctx.fillStyle = p.current.def.color;
    for (let r = 0; r < p.current.matrix.length; r++)
      for (let c = 0; c < p.current.matrix[r].length; c++) {
        if (p.current.matrix[r][c]) {
          ctx.fillRect(
            ox + (p.current.x + c) * cell + 1,
            oy + (p.current.y + r) * cell + 1,
            cell - 2,
            cell - 2,
          );
        }
      }
  }
  if (over) {
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(ox, oy, COLS * cell, ROWS * cell);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 48px sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 8;
    ctx.fillText("GAME OVER", ox + (COLS * cell) / 2, oy + (ROWS * cell) / 2);
    ctx.shadowBlur = 0;
    ctx.textAlign = "left";
  }
}

const CELL = 50;
function drawPlay(countdown: boolean) {
  const p0 = match!.players[0],
    p1 = match!.players[1];
  drawBoard(p0, 200, 40, CELL);
  drawBoard(p1, 1920 - 200 - COLS * CELL, 40, CELL);
  // HUD
  ctx.fillStyle = "#fff";
  ctx.font = "24px monospace";
  ctx.fillText(`P1 Score: ${p0.score}`, 200, 30);
  ctx.fillText(`P2 Score: ${p1.score}`, 1920 - 200 - COLS * CELL, 30);
  // next piece preview
  function drawNext(p: any, ox: number, oy: number) {
    const cs = 20;
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 1;
    ctx.strokeRect(ox, oy, 4 * cs, 4 * cs);
    if (p.nextDef) {
      const m = p.nextDef.shape;
      const cols = m[0].length,
        rows = m.length;
      const offX = Math.floor((4 - cols) / 2);
      const offY = Math.floor((4 - rows) / 2);
      ctx.fillStyle = p.nextDef.color;
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          if (m[r][c])
            ctx.fillRect(
              ox + (offX + c) * cs + 1,
              oy + (offY + r) * cs + 1,
              cs - 2,
              cs - 2,
            );
        }
    }
    ctx.fillStyle = "#aaa";
    ctx.font = "14px monospace";
    ctx.fillText("NEXT", ox, oy - 6);
  }
  drawNext(p0, 200 + COLS * CELL + 20, 40);
  drawNext(p1, 1920 - 200 - COLS * CELL - 4 * 20 - 20, 40);
  if (countdown) {
    ctx.fillStyle = "#fff";
    ctx.font = "bold 96px sans-serif";
    ctx.textAlign = "center";
    const n = Math.ceil(match!.countdownMs / 1000);
    ctx.fillText(String(n > 0 ? n : "GO"), 960, 540);
    ctx.textAlign = "left";
  }
  // no separate pause screen
}

function drawMenu() {
  ctx.fillStyle = "#fff";
  ctx.font = "bold 72px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("LOCAL TETRIS", 960, 200);
  ctx.font = "36px sans-serif";
  menuItems().forEach((m, i) => {
    ctx.fillStyle = i === menuIndex ? "#0f0" : "#aaa";
    ctx.fillText(m, 960, 400 + i * 60);
  });
  ctx.textAlign = "left";
}

function drawGameOver() {
  ctx.fillStyle = "#fff";
  ctx.font = "bold 64px sans-serif";
  ctx.textAlign = "center";
  const w =
    match!.winner === "p1"
      ? "PLAYER 1 WINS!"
      : match!.winner === "p2"
        ? "PLAYER 2 WINS!"
        : "DRAW!";
  ctx.fillText(w, 960, 200);
  ctx.font = "bold 32px sans-serif";
  ctx.fillText("Scores", 960, 270);
  ctx.font = "32px monospace";
  ctx.fillText(
    `P1: ${match!.players[0].score}  P2: ${match!.players[1].score}`,
    960,
    310,
  );
  const opts = ["Restart", "Stats", "Main Menu"];
  ctx.font = "36px sans-serif";
  opts.forEach((o, i) => {
    ctx.fillStyle = i === gameOverIndex ? "#0f0" : "#aaa";
    ctx.fillText(o, 960, 500 + i * 60);
  });
  ctx.textAlign = "left";
}

function drawStats() {
  ctx.fillStyle = "#fff";
  ctx.font = "bold 48px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("STATS", 960, 120);
  ctx.font = "28px monospace";
  ctx.textAlign = "left";
  ctx.fillStyle = "#aaa";
  ctx.fillText("Today", 900, 180);
  ctx.fillText("Total", 1050, 180);
  ctx.fillStyle = "#fff";
  const rows = [
    ["Games", stats.sessionsToday, stats.sessionsPlayed],
    [
      "Time (m)",
      Math.round(stats.todayPlayTimeMs / 60000),
      Math.round(stats.totalPlayTimeMs / 60000),
    ],
    [
      "P1 wins",
      `${stats.winsP1Today} (${stats.sessionsToday ? Math.round((stats.winsP1Today / stats.sessionsToday) * 100) : 0}%)`,
      `${stats.winsP1} (${stats.sessionsPlayed ? Math.round((stats.winsP1 / stats.sessionsPlayed) * 100) : 0}%)`,
    ],
    [
      "P2 wins",
      `${stats.winsP2Today} (${stats.sessionsToday ? Math.round((stats.winsP2Today / stats.sessionsToday) * 100) : 0}%)`,
      `${stats.winsP2} (${stats.sessionsPlayed ? Math.round((stats.winsP2 / stats.sessionsPlayed) * 100) : 0}%)`,
    ],
  ];
  rows.forEach((r, i) => {
    ctx.fillText(String(r[0]), 700, 220 + i * 36);
    ctx.fillText(String(r[1]), 900, 220 + i * 36);
    ctx.fillText(String(r[2]), 1050, 220 + i * 36);
  });
  ctx.fillStyle = "#fff";
  ctx.font = "bold 48px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SESSIONS", 960, 420);
  ctx.font = "28px monospace";
  ctx.textAlign = "left";
  ctx.fillStyle = "#aaa";
  ctx.fillText("Date".padEnd(18) + "Duration".padEnd(10) + "Winner".padEnd(10) + "Score", 610, 470);
  ctx.fillStyle = "#fff";
  const visible = 12;
  const start = statsScroll;
  let y = 500;
  for (
    let i = start;
    i < Math.min(stats.sessions.length, start + visible);
    i++
  ) {
    const s = stats.sessions[i];
    let winLabel: string, scoreStr: string;
    if (s.winner === 'draw') { winLabel = 'DRAW'; scoreStr = `${s.scores[0]}:${s.scores[1]}`; }
    else { winLabel = s.winner === 'p1' ? 'P1' : 'P2'; scoreStr = `${s.winner === 'p1' ? s.scores[0] : s.scores[1]}:${s.winner === 'p1' ? s.scores[1] : s.scores[0]}`; }
    const dur = `${Math.floor(s.durationMs / 60000)}:${String(Math.floor((s.durationMs % 60000) / 1000)).padStart(2, "0")}`;
    ctx.fillStyle = "#fff";
    const d = new Date(s.date);
    const disp = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
    ctx.fillText(
      `${disp.padEnd(18)}${dur.padEnd(10)}${winLabel.padEnd(10)}${scoreStr}`,
      610,
      y,
    );
    y += 34;
  }
  ctx.textAlign = "center";
  ctx.font = "22px monospace";
ctx.fillText("W/S or D-pad to scroll, Esc to back", 960, 1000);
  ctx.textAlign = "left";
}

function drawControls() {
  ctx.fillStyle = "#fff";
  ctx.font = "bold 48px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("CONTROLS", 960, 120);
  ctx.font = "22px monospace";
  ctx.textAlign = "center";
  const lines = [
    "P1: WSAD, ZX",
    "P2: Arrows, []",
    "Global: Esc pause/menu, Enter or Space confirm",
  ];
  lines.forEach((l, i) => ctx.fillText(l, 960, 220 + i * 40));

  // Gamepad silhouette (viewBox 1050 x 660)
  const gx = 960 - 260;
  const gy = 540;
  const gw = 520;
  const gh = 330;
  if (xboxImg.complete) {
    ctx.drawImage(xboxImg, gx, gy, gw, gh);
  }
  const pt = (sx: number, sy: number) => ({
    x: gx + (sx / 1050) * gw,
    y: gy + (sy / 660) * gh,
  });

  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
  ctx.fillStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.font = "20px monospace";

  const drawBtnIcon = (kind: string, cx: number, cy: number) => {
    ctx.save();
    if (kind === "A" || kind === "B" || kind === "X" || kind === "Y") {
      const colors: Record<string, string> = {
        A: "#34c759",
        B: "#ff3b30",
        X: "#007aff",
        Y: "#f5c400",
      };
      ctx.beginPath();
      ctx.arc(cx, cy, 16, 0, Math.PI * 2);
      ctx.fillStyle = "#222";
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = colors[kind];
      ctx.stroke();
      ctx.fillStyle = colors[kind];
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(kind, cx, cy + 1);
    } else if (kind === "LB" || kind === "RB") {
      ctx.beginPath();
      ctx.roundRect(cx - 22, cy - 13, 44, 26, 7);
      ctx.fillStyle = "#222";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#fff";
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 15px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(kind, cx, cy + 1);
    } else if (kind === "L") {
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fillStyle = "#222";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#fff";
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("L", cx, cy + 1);
      // left and right directional triangles
      ctx.beginPath();
      ctx.moveTo(cx - 24, cy);
      ctx.lineTo(cx - 18, cy - 5);
      ctx.lineTo(cx - 18, cy + 5);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + 24, cy);
      ctx.lineTo(cx + 18, cy - 5);
      ctx.lineTo(cx + 18, cy + 5);
      ctx.closePath();
      ctx.fill();
    } else if (kind === "VIEW") {
      ctx.beginPath();
      ctx.arc(cx, cy, 16, 0, Math.PI * 2);
      ctx.fillStyle = "#222";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#fff";
      ctx.stroke();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.8;
      // back window (top-left)
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy + 1);
      ctx.lineTo(cx - 8, cy - 7);
      ctx.lineTo(cx + 2, cy - 7);
      ctx.lineTo(cx + 2, cy - 3);
      ctx.stroke();
      // front window (bottom-right)
      ctx.strokeRect(cx - 3, cy - 2, 11, 9);
    } else if (kind === "MENU") {
      ctx.beginPath();
      ctx.arc(cx, cy, 16, 0, Math.PI * 2);
      ctx.fillStyle = "#222";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#fff";
      ctx.stroke();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      for (const dy of [-5, 0, 5]) {
        ctx.beginPath();
        ctx.moveTo(cx - 7, cy + dy);
        ctx.lineTo(cx + 7, cy + dy);
        ctx.stroke();
      }
    } else if (kind.startsWith("DPAD")) {
      const arm = 6;
      const len = 17;
      ctx.fillStyle = "#222";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - arm, cy - len);
      ctx.lineTo(cx + arm, cy - len);
      ctx.lineTo(cx + arm, cy - arm);
      ctx.lineTo(cx + len, cy - arm);
      ctx.lineTo(cx + len, cy + arm);
      ctx.lineTo(cx + arm, cy + arm);
      ctx.lineTo(cx + arm, cy + len);
      ctx.lineTo(cx - arm, cy + len);
      ctx.lineTo(cx - arm, cy + arm);
      ctx.lineTo(cx - len, cy + arm);
      ctx.lineTo(cx - len, cy - arm);
      ctx.lineTo(cx - arm, cy - arm);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // highlight active directional arms as distinct inner white squares
      ctx.fillStyle = "#fff";
      if (kind === "DPAD_LR" || kind === "DPAD_L") {
        ctx.fillRect(cx - len + 3, cy - arm + 3, len - arm - 3, arm * 2 - 6);
      }
      if (kind === "DPAD_LR" || kind === "DPAD_R") {
        ctx.fillRect(cx + arm, cy - arm + 3, len - arm - 3, arm * 2 - 6);
      }
      if (kind === "DPAD_U") {
        ctx.fillRect(cx - arm + 3, cy - len + 3, arm * 2 - 6, len - arm - 3);
      }
      if (kind === "DPAD_D") {
        ctx.fillRect(cx - arm + 3, cy + arm, arm * 2 - 6, len - arm - 3);
      }
    }
    ctx.restore();
  };

  const drawCallout = (
    points: Array<{ x: number; y: number }>,
    icon: string,
    label: string,
    side: "left" | "right",
  ) => {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, 4, 0, Math.PI * 2);
    ctx.fill();

    const end = points[points.length - 1];
    const iconOffset = icon === "LB" || icon === "RB" || icon === "L" ? 32 : 26;
    const iconX = side === "left" ? end.x - iconOffset : end.x + iconOffset;
    drawBtnIcon(icon, iconX, end.y);

    ctx.fillStyle = "#fff";
    ctx.font = "20px monospace";
    ctx.textBaseline = "middle";
    if (side === "left") {
      ctx.textAlign = "right";
      ctx.fillText(label, iconX - iconOffset - 6, end.y + 1);
    } else {
      ctx.textAlign = "left";
      ctx.fillText(label, iconX + iconOffset + 6, end.y + 1);
    }
  };

  // LB (Left bumper)
  const pLB = pt(260, 62);
  drawCallout(
    [pLB, { x: pLB.x, y: 470 }, { x: 620, y: 470 }],
    "LB",
    "Rotate CCW",
    "left",
  );

  // Left Stick
  const pLS = pt(245, 302);
  drawCallout(
    [pLS, { x: 620, y: pLS.y }],
    "L",
    "Move",
    "left",
  );

  // D-pad (split by direction like reference)
  const pDpad = pt(385, 451);
  ctx.beginPath();
  ctx.moveTo(pDpad.x, pDpad.y);
  ctx.lineTo(pDpad.x, 810);
  ctx.lineTo(620, 810);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(pDpad.x, pDpad.y, 4, 0, Math.PI * 2);
  ctx.fill();

  const dpadItems = [
    { icon: "DPAD_LR", label: "Move", y: 760 },
    { icon: "DPAD_D", label: "Soft drop", y: 810 },
    { icon: "DPAD_U", label: "Rotate CW", y: 860 },
  ];
  for (const item of dpadItems) {
    const iconX = 620 - 26;
    drawBtnIcon(item.icon, iconX, item.y);
    ctx.fillStyle = "#fff";
    ctx.font = "20px monospace";
    ctx.textBaseline = "middle";
    ctx.textAlign = "right";
    ctx.fillText(item.label, iconX - 26 - 6, item.y + 1);
  }

  // Menu / Start
  const pMenu = pt(602, 288);
  drawCallout(
    [{ x: pMenu.x, y: pMenu.y - 12 }, { x: pMenu.x, y: 415 }, { x: 1300, y: 415 }],
    "MENU",
    "Pause / Resume",
    "right",
  );

  // RB (Right bumper)
  const pRB = pt(790, 62);
  drawCallout(
    [pRB, { x: pRB.x, y: 470 }, { x: 1300, y: 470 }],
    "RB",
    "Rotate CW",
    "right",
  );

  // X button
  const pX = pt(728, 287);
  const pB = pt(874, 279);
  const pA = pt(800, 352);
  const faceGap = 54;
  drawCallout(
    [{ x: pX.x, y: pX.y - 18 }, { x: pX.x, y: pB.y - faceGap }, { x: 1300, y: pB.y - faceGap }],
    "X",
    "Rotate CCW",
    "right",
  );

  // B button
  drawCallout(
    [{ x: pB.x + 18, y: pB.y }, { x: 1300, y: pB.y }],
    "B",
    "Rotate CW / Back",
    "right",
  );

  // A button
  drawCallout(
    [{ x: pA.x, y: pA.y + 18 }, { x: pA.x, y: pB.y + faceGap }, { x: 1300, y: pB.y + faceGap }],
    "A",
    "Soft drop / Confirm",
    "right",
  );

  ctx.restore();
  ctx.textAlign = "center";
  ctx.fillText("Press Esc to back", 960, 1000);
  ctx.textAlign = "left";
}

function drawVolume() {
  ctx.fillStyle = "#fff";
  ctx.font = "bold 48px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("VOLUME", 960, 120);
  ctx.font = "32px monospace";
  // slider
  ctx.fillStyle = "#444";
  ctx.fillRect(400, 540, 1120, 20);
  ctx.fillStyle = "#0f0";
  ctx.fillRect(400, 540, 1120 * volume, 20);
  ctx.fillStyle = "#fff";
  ctx.fillText(`Volume: ${Math.round(volume * 100)}%`, 960, 500);
  ctx.font = "22px monospace";
  ctx.fillText("Use Left/Right or drag slider, Esc to back", 960, 1000);
  ctx.textAlign = "left";
}

// Menu input handling
const xboxImg = new Image();
xboxImg.src = "xbox-gamepad.svg";
let lastKey = "";
window.addEventListener("keydown", (e) => {
  if (screen === "volume") {
    const isLeft = e.key === "ArrowLeft" || e.key === "a" || e.key === "A";
    const isRight = e.key === "ArrowRight" || e.key === "d" || e.key === "D";
    if (isLeft && !e.repeat) {
      if (!kbVol.heldL) {
        volume = Math.max(0, volume - 0.05);
        saveVolume(volume);
        setAudioVolume(volume);
        playSfx("menu_select");
        kbVol.heldL = true;
        kbVol.l = 0;
        kbVol.thL = 300;
      }
    }
    if (isRight && !e.repeat) {
      if (!kbVol.heldR) {
        volume = Math.min(1, volume + 0.05);
        saveVolume(volume);
        setAudioVolume(volume);
        playSfx("menu_select");
        kbVol.heldR = true;
        kbVol.r = 0;
        kbVol.thR = 300;
      }
    }
    if (e.key === "Escape") { screen = "menu"; playSfx("menu_back"); }
    return;
  }
  if (e.key !== lastKey) {
    lastKey = e.key;
    // menu navigation
    if (screen === "menu") {
      const items = menuItems();
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        menuIndex = (menuIndex + 1) % items.length;
        playSfx("menu_select");
      }
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        menuIndex = (menuIndex - 1 + items.length) % items.length;
        playSfx("menu_select");
      }
      if (e.key === "Escape") {
        if (pausedFromGame) {
          pausedFromGame = false;
          screen = pausedReturn;
          if (match) match.status = "playing";
          playSfx("unpause");
        }
      }
      if (e.key === "Enter" || e.key === " ") {
        const opt = items[menuIndex];
        if (opt === "Start" || opt === "Resume" || opt === "Restart") {
          if (opt === "Resume") {
            pausedFromGame = false;
            screen = pausedReturn;
            if (match) match.status = "playing";
            playSfx("unpause");
          } else {
            pausedFromGame = false;
            startMatch();
          }
        } else if (opt === "Stats") { screen = "stats"; playSfx("menu_enter"); }
        else if (opt === "Volume") { screen = "volume"; playSfx("menu_enter"); }
        else if (opt === "Controls") { screen = "controls"; playSfx("menu_enter"); }
      }
    } else if (screen === "stats") {
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp")
        statsScroll = Math.max(0, statsScroll - 1);
      if (e.key === "s" || e.key === "S" || e.key === "ArrowDown")
        statsScroll = Math.min(
          Math.max(0, stats.sessions.length - 12),
          statsScroll + 1,
        );
      if (e.key === "Escape") { screen = "menu"; playSfx("menu_back"); }
    } else if (screen === "controls") {
      if (e.key === "Escape") { screen = "menu"; playSfx("menu_back"); }
    } else if (screen === "gameover") {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        const prev = gameOverIndex;
        gameOverIndex = Math.max(0, gameOverIndex - 1);
        if (gameOverIndex !== prev) playSfx("menu_select");
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        const prev = gameOverIndex;
        gameOverIndex = Math.min(2, gameOverIndex + 1);
        if (gameOverIndex !== prev) playSfx("menu_select");
      }
      else if (e.key === "Enter" || e.key === " ") {
        if (gameOverIndex === 0) startMatch();
        else if (gameOverIndex === 1) screen = "stats";
        else {
          screen = "menu";
          gameOverIndex = 0;
        }
      } else if (e.key === "Escape") {
        screen = "menu";
        gameOverIndex = 0;
        playSfx("menu_back");
      }
    } else if (screen === "play") {
      if (e.key === "Escape") {
        pausedFromGame = true;
        pausedReturn = "play";
        if (match) match.status = "paused";
        screen = "menu";
        menuIndex = 0;
        playSfx("pause");
        stopSfx("soft_drop_fast");
      }
    } else if (screen === "countdown") {
      if (e.key === "Escape") {
        pausedFromGame = true;
        pausedReturn = "countdown";
        if (match) match.status = "paused";
        screen = "menu";
        menuIndex = 0;
        playSfx("pause");
      }
    }
  }
});
window.addEventListener("keyup", (e) => {
  lastKey = "";
  if (screen === "volume") {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") kbVol.heldL = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") kbVol.heldR = false;
  }
});

// Simplified game loop with real input polling for movement
let last = performance.now();
let gpPrev: any[] = [
  {
    up: false,
    down: false,
    left: false,
    right: false,
    a: false,
    b: false,
    start: false,
  },
  {
    up: false,
    down: false,
    left: false,
    right: false,
    a: false,
    b: false,
    start: false,
  },
];
let volState: any[] = [{l:0,r:0,thL:300,thR:300,heldL:false,heldR:false},{l:0,r:0,thL:300,thR:300,heldL:false,heldR:false}];
let kbVol = {heldL:false,heldR:false,l:0,r:0,thL:300,thR:300};
let startOpenedMenu = false;
function handleGamepadMenus(dt: number) {
  // keyboard volume repeat (app-side DAS)
  if (screen === "volume") {
    if (kbVol.heldL) {
      kbVol.l += dt * 1000;
      if (kbVol.l >= kbVol.thL) {
        volume = Math.max(0, volume - 0.05);
        saveVolume(volume);
        setAudioVolume(volume);
        playSfx("menu_select");
        kbVol.l = 0;
        kbVol.thL = 50;
      }
    } else {
      kbVol.l = 0;
      kbVol.thL = 300;
    }
    if (kbVol.heldR) {
      kbVol.r += dt * 1000;
      if (kbVol.r >= kbVol.thR) {
        volume = Math.min(1, volume + 0.05);
        saveVolume(volume);
        setAudioVolume(volume);
        playSfx("menu_select");
        kbVol.r = 0;
        kbVol.thR = 50;
      }
    } else {
      kbVol.r = 0;
      kbVol.thR = 300;
    }
  }
  const gps = (navigator as any).getGamepads
    ? (navigator as any).getGamepads()
    : [];
  // Process both players' gamepads (0 and 1) for menu navigation.
  for (let gi = 0; gi < 2; gi++) {
    const gp = gps[gi];
    if (!gp) continue;
    const prev = gpPrev[gi];
    const up = gp.buttons[12]?.pressed || gp.axes[1] < -0.5;
    const down = gp.buttons[13]?.pressed || gp.axes[1] > 0.5;
    const left = gp.buttons[14]?.pressed || gp.axes[0] < -0.5;
    const right = gp.buttons[15]?.pressed || gp.axes[0] > 0.5;
    const a = gp.buttons[0]?.pressed;
    const b = gp.buttons[1]?.pressed;
    if (screen === "play") {
      if (gp.buttons[9]?.pressed && !prev.start) {
        pausedFromGame = true;
        pausedReturn = "play";
        if (match) match.status = "paused";
        screen = "menu";
        menuIndex = 0;
        startOpenedMenu = true;
        playSfx("pause");
      }
    }
    if (screen === "countdown") {
      if (gp.buttons[9]?.pressed && !prev.start) {
        pausedFromGame = true;
        pausedReturn = "countdown";
        if (match) match.status = "paused";
        screen = "menu";
        menuIndex = 0;
        startOpenedMenu = true;
        playSfx("pause");
      }
    }
    if (screen === "menu") {
      const items = menuItems();
      if (up && !prev.up) {
        menuIndex = (menuIndex - 1 + items.length) % items.length;
        playSfx("menu_select");
      }
      if (down && !prev.down) {
        menuIndex = (menuIndex + 1) % items.length;
        playSfx("menu_select");
      }
      // B or Start/Menu resumes when a game is in progress, regardless of highlighted item
      const startPressed = gp.buttons[9]?.pressed;
      const resumePressed =
        (b && !prev.b) || (startPressed && !prev.start && !startOpenedMenu);
      if (resumePressed && pausedFromGame) {
        pausedFromGame = false;
        screen = pausedReturn;
        if (match) match.status = "playing";
        playSfx("unpause");
      }
      if (a && !prev.a) {
        const opt = items[menuIndex];
        if (opt === "Start") startMatch();
        else if (opt === "Resume") {
          pausedFromGame = false;
          screen = pausedReturn;
          if (match) match.status = "playing";
          playSfx("unpause");
        } else if (opt === "Restart") {
          pausedFromGame = false;
          startMatch();
        } else if (opt === "Stats") { screen = "stats"; playSfx("menu_enter"); }
        else if (opt === "Volume") { screen = "volume"; playSfx("menu_enter"); }
        else if (opt === "Controls") { screen = "controls"; playSfx("menu_enter"); }
      }
    } else if (screen === "gameover") {
      if (up && !prev.up) {
        const prevGi = gameOverIndex;
        gameOverIndex = Math.max(0, gameOverIndex - 1);
        if (gameOverIndex !== prevGi) playSfx("menu_select");
      }
      if (down && !prev.down) {
        const prevGi = gameOverIndex;
        gameOverIndex = Math.min(2, gameOverIndex + 1);
        if (gameOverIndex !== prevGi) playSfx("menu_select");
      }
      if (a && !prev.a) {
        if (gameOverIndex === 0) startMatch();
        else if (gameOverIndex === 1) screen = "stats";
        else {
          screen = "menu";
          gameOverIndex = 0;
        }
      }
      // B/Select returns to Main Menu
      if (b && !prev.b) {
        screen = "menu";
        gameOverIndex = 0;
        playSfx("menu_back");
      }
    } else if (screen === "volume") {
      const v = volState[gi];
      if (left) {
        if (!v.heldL) {
          volume = Math.max(0, volume - 0.05);
          saveVolume(volume);
          setAudioVolume(volume);
          playSfx("menu_select");
          v.l = 0;
          v.thL = 300;
          v.heldL = true;
        } else {
          v.l += dt * 1000;
          if (v.l >= v.thL) {
            volume = Math.max(0, volume - 0.05);
            saveVolume(volume);
            setAudioVolume(volume);
            playSfx("menu_select");
            v.l = 0;
            v.thL = 50;
          }
        }
      } else {
        v.l = 0;
        v.thL = 300;
        v.heldL = false;
      }
      if (right) {
        if (!v.heldR) {
          volume = Math.min(1, volume + 0.05);
          saveVolume(volume);
          setAudioVolume(volume);
          playSfx("menu_select");
          v.r = 0;
          v.thR = 300;
          v.heldR = true;
        } else {
          v.r += dt * 1000;
          if (v.r >= v.thR) {
            volume = Math.min(1, volume + 0.05);
            saveVolume(volume);
            setAudioVolume(volume);
            playSfx("menu_select");
            v.r = 0;
            v.thR = 50;
          }
        }
      } else {
        v.r = 0;
        v.thR = 300;
        v.heldR = false;
      }
      if (b && !prev.b) { screen = "menu"; playSfx("menu_back"); }
    } else if (screen === "stats") {
      if (up && !prev.up) statsScroll = Math.max(0, statsScroll - 1);
      if (down && !prev.down)
        statsScroll = Math.min(
          Math.max(0, stats.sessions.length - 12),
          statsScroll + 1,
        );
      if (b && !prev.b) { screen = "menu"; playSfx("menu_back"); }
    } else if (screen === "controls") {
      if (b && !prev.b) { screen = "menu"; playSfx("menu_back"); }
    }
    if (!gp.buttons[9]?.pressed) startOpenedMenu = false;
    gpPrev[gi] = { up, down, left, right, a, b, start: gp.buttons[9]?.pressed };
  }
}
function loop(now: number) {
  const dt = (now - last) / 1000;
  last = now;
  handleGamepadMenus(dt);
  update(dt);
  keyEdges.clear();
  requestAnimationFrame(loop);
}
requestAnimationFrame(draw);
requestAnimationFrame(loop);

// Test-only, read-only state hook for CI (see tests/e2e/). Absent unless ?e2e=1.
// Getters return primitives or plain copies, so a test cannot reach into live game objects.
if (new URLSearchParams(location.search).has("e2e")) {
  const playerView = (p: any) => ({
    x: p.current ? p.current.x : null,
    y: p.current ? p.current.y : null,
    type: p.current ? p.current.def.id : null,
    rotation: p.current ? p.current.rotation : null,
    next: p.nextDef ? p.nextDef.id : null,
    score: p.score,
    pieces: p.piecesPlaced,
    over: p.gameOver || p.toppedOut,
  });
  (window as any).__tetris = Object.freeze({
    get screen() {
      return screen;
    },
    get menuIndex() {
      return menuIndex;
    },
    get frame() {
      return frameCounter;
    },
    get menuItems() {
      return menuItems().slice();
    },
    get gameOverIndex() {
      return gameOverIndex;
    },
    get volume() {
      return volume;
    },
    get status() {
      return match ? match.status : null;
    },
    get countdownMs() {
      return match ? match.countdownMs : null;
    },
    get players() {
      return match
        ? [playerView(match.players[0]), playerView(match.players[1])]
        : null;
    },
  });
}
