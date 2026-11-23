import './style.css';
import { MatchState } from './game/state';
import { collides, tryRotate } from './game/collision';
import { Board } from './game/board';
import { COLS, ROWS } from './game/board';
import { availablePieces } from './game/pieces';

const STORAGE_STATS = 'local-tetris:stats';
const STORAGE_VOLUME = 'local-tetris:volume';

interface Session { date: string; winner: string; scores: [number, number]; pieces: [number, number]; }
interface Stats { sessionsPlayed: number; totalPlayTimeMs: number; winsP1: number; winsP2: number; lastSessions: Session[]; }

function loadStats(): Stats { try { return JSON.parse(localStorage.getItem(STORAGE_STATS) || '') } catch { return { sessionsPlayed: 0, totalPlayTimeMs: 0, winsP1: 0, winsP2: 0, lastSessions: [] }; } }
function saveStats(s: Stats) { localStorage.setItem(STORAGE_STATS, JSON.stringify(s)); }
function loadVolume(): number { const v = parseFloat(localStorage.getItem(STORAGE_VOLUME) || '0.7'); return isNaN(v) ? 0.7 : v; }
function saveVolume(v: number) { localStorage.setItem(STORAGE_VOLUME, String(v)); }

const canvas = document.createElement('canvas');
canvas.width = 1920; canvas.height = 1080;
document.getElementById('app')!.appendChild(canvas);
const ctx = canvas.getContext('2d')!;

function scaleCanvas() {
  const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  canvas.style.width = (1920 * s) + 'px';
  canvas.style.height = (1080 * s) + 'px';
}
window.addEventListener('resize', scaleCanvas); scaleCanvas();

// Input
const keys = new Set<string>();
const USED_KEYS = new Set(['a','d','s','z','x','w','W','ArrowLeft','ArrowRight','ArrowDown','ArrowUp','[',']','Escape','Enter',' ']);
window.addEventListener('keydown', e => {
  if (USED_KEYS.has(e.key)) { keys.add(e.key); e.preventDefault(); }
  // rotation edge handling during play
  if (screen === 'play' && match && match.status === 'playing') {
    let idx = -1, dir = 0;
    if (e.key === 'z') { idx = 0; dir = -1; }
    else if (e.key === 'x' || e.key === 'w' || e.key === 'W') { idx = 0; dir = 1; }
    else if (e.key === '[') { idx = 1; dir = -1; }
    else if (e.key === ']' || e.key === 'ArrowUp') { idx = 1; dir = 1; }
    if (idx >= 0) {
      const p = match.players[idx] as any;
      if (p.current && !p.gameOver) {
        tryRotate(p.board, p.current, dir as 1 | -1);
        p.lockTimer = 0;
      }
    }
  }
});
window.addEventListener('keyup', e => { keys.delete(e.key); });

// Mouse support for menus
let mouseX = 0, mouseY = 0;
let hoveredMenu = -1;
let volumeDragging = false;
function toLogical(e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  mouseX = (e.clientX - rect.left) * (1920 / rect.width);
  mouseY = (e.clientY - rect.top) * (1080 / rect.height);
}
canvas.addEventListener('mousemove', e => { toLogical(e); updateHover(); });
canvas.addEventListener('mousedown', e => { toLogical(e); handleMouseClick(); volumeDragging = (screen === 'volume'); });
window.addEventListener('mousemove', e => { if (volumeDragging) { toLogical(e); updateVolumeFromMouse(); } });
window.addEventListener('mouseup', () => { volumeDragging = false; });
function updateHover() {
  if (screen === 'gameover') {
    [0,1].forEach(i => {
      const y = 700 + i * 60;
      if (mouseX >= 860 && mouseX <= 1060 && mouseY >= y - 30 && mouseY <= y + 10) gameOverIndex = i;
    });
    return;
  }
  if (screen === 'menu') {
    hoveredMenu = -1;
    menuItems().forEach((_, i) => {
      const y = 400 + i * 60;
      if (mouseX >= 800 && mouseX <= 1120 && mouseY >= y - 30 && mouseY <= y + 10) { hoveredMenu = i; menuIndex = i; }
    });
  }
}
function handleMouseClick() {
  if (screen === 'menu' && hoveredMenu >= 0) {
    menuIndex = hoveredMenu;
    const opt = menuItems()[menuIndex];
    if (opt === 'Start' || opt === 'Resume') {
      if (opt === 'Resume') { pausedFromGame = false; screen = 'play'; if (match) match.status = 'playing'; }
      else startMatch();
    }
    else if (opt === 'Stats') screen = 'stats';
    else if (opt === 'Volume') screen = 'volume';
    else if (opt === 'Controls') screen = 'controls';
  } else if (screen === 'volume') {
    updateVolumeFromMouse();
  } else if (screen === 'gameover') {
    if (gameOverIndex === 0) startMatch(); else { screen = 'menu'; gameOverIndex = 0; }
  } else if (screen === 'stats' || screen === 'controls') {
    // click anywhere back? keep esc; no
  }
}
function updateVolumeFromMouse() {
  if (screen !== 'volume') return;
  // slider region
  const v = Math.min(1, Math.max(0, (mouseX - 400) / 1120));
  volume = v; saveVolume(volume);
}

let match: MatchState | null = null;
let screen: 'menu' | 'countdown' | 'play' | 'gameover' | 'stats' | 'controls' | 'volume' = 'menu';
let pausedFromGame = false;
let menuIndex = 0;
let gameOverIndex = 0;
function menuItems(): string[] {
  const items = [pausedFromGame ? 'Resume' : 'Start', 'Stats', 'Volume', 'Controls'];
  return items;
}
let volume = loadVolume();
let sessionStart = 0;
let stats = loadStats();

function startMatch() {
  pausedFromGame = false;
  const seed = Math.floor(Math.random() * 1e9);
  match = new MatchState(seed);
  screen = 'countdown';
  sessionStart = Date.now();
  // spawn first pieces after countdown; we'll handle in update
}

function speedForLevel(lvl: number): number {
  const base = 0.8;
  const speed = base * Math.pow(0.9, lvl - 1);
  return Math.max(0.05, speed);
}

function update(dt: number) {
  if (!match) return;
  if (screen === 'countdown') {
    match.countdownMs -= dt * 1000;
    if (match.countdownMs <= 0) {
      screen = 'play';
      // spawn initial pieces for both
      match.spawnFor(match.players[0]);
      match.spawnFor(match.players[1]);
      match.status = 'playing';
    }
    return;
  }
  if (screen !== 'play') return;
  if (match.status === 'paused') return;

  // Gamepad polling
  const gps = (navigator as any).getGamepads ? (navigator as any).getGamepads() : [];
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
    if (p._gp === undefined) p._gp = { left:false, right:false, down:false, a:false, x:false, b:false };
    const g = p._gp;
    // left
    if (left && !g.left) { if (!collides(p.board, p.current, -1, 0)) { p.current.x -= 1; p.lockTimer = 0; } g._dasL = 0; }
    if (right && !g.right) { if (!collides(p.board, p.current, 1, 0)) { p.current.x += 1; p.lockTimer = 0; } g._dasR = 0; }
    g.left = left; g.right = right; g.down = softDropBtn;
    // D-pad up rotates CW (edge)
    if (upBtn && !g.up && p.current) { tryRotate(p.board, p.current, 1); p.lockTimer = 0; }
    g.up = upBtn;
    // rotation buttons: X(2) CCW, B(1) CW, triggers
    const ccw = gp.buttons[2]?.pressed || gp.buttons[4]?.pressed;
    const cw = gp.buttons[1]?.pressed || gp.buttons[5]?.pressed;
    if (ccw && !g.ccw) { tryRotate(p.board, p.current, -1); p.lockTimer = 0; }
    if (cw && !g.cw) { tryRotate(p.board, p.current, 1); p.lockTimer = 0; }
    g.ccw = ccw; g.cw = cw;
  }

  for (let i = 0; i < 2; i++) {
    const p = match.players[i] as any;
    if (p.gameOver) continue;
    const isP1 = i === 0;
    const leftKey = isP1 ? 'a' : 'ArrowLeft';
    const rightKey = isP1 ? 'd' : 'ArrowRight';
    const downKey = isP1 ? 's' : 'ArrowDown';

    // horizontal DAS
    if (p._leftHeld === undefined) { p._leftHeld = false; p._rightHeld = false; p._dasL = 0; p._dasR = 0; p._movedL = false; p._movedR = false; }
    const leftHeld = keys.has(leftKey);
    const rightHeld = keys.has(rightKey);
    if (leftHeld && !p._leftHeld) { // just pressed
      if (p.current && !collides(p.board, p.current, -1, 0)) { p.current.x -= 1; p.lockTimer = 0; }
      p._dasL = 0; p._movedL = true;
    }
    if (rightHeld && !p._rightHeld) {
      if (p.current && !collides(p.board, p.current, 1, 0)) { p.current.x += 1; p.lockTimer = 0; }
      p._dasR = 0; p._movedR = true;
    }
    p._leftHeld = leftHeld; p._rightHeld = rightHeld;
    // DAS repeat
    if (leftHeld && p.current) {
      p._dasL += dt * 1000;
      if (p._dasL >= 350) {
        // repeat every 33ms
        const repeats = Math.floor((p._dasL - 350) / 50);
        // move one step per threshold crossing
        if (repeats > (p._dasLprev || 0)) {
          if (!collides(p.board, p.current, -1, 0)) { p.current.x -= 1; p.lockTimer = 0; }
        }
        p._dasLprev = repeats;
      }
    } else { p._dasL = 0; p._dasLprev = 0; }
    if (rightHeld && p.current) {
      p._dasR += dt * 1000;
      if (p._dasR >= 350) {
        const repeats = Math.floor((p._dasR - 350) / 50);
        if (repeats > (p._dasRprev || 0)) {
          if (!collides(p.board, p.current, 1, 0)) { p.current.x += 1; p.lockTimer = 0; }
        }
        p._dasRprev = repeats;
      }
    } else { p._dasR = 0; p._dasRprev = 0; }

    // soft drop with 350ms initial delay then 10ms repeat
    const gpSoft = (p._gp && p._gp.down) ? true : false;
    const softHeld = keys.has(downKey) || gpSoft;
    if (p._sdTimer === undefined) p._sdTimer = 0;
    if (p._sdHeldPrev === undefined) p._sdHeldPrev = false;
    if (softHeld && p.current) {
      if (!p._sdHeldPrev) {
        // tap: immediate single cell
        if (!collides(p.board, p.current, 0, 1)) { p.current.y += 1; p.lockTimer = 0; }
        p._sdTimer = 0;
      } else {
        p._sdTimer += dt * 1000;
        if (p._sdTimer >= 350) {
          if (!collides(p.board, p.current, 0, 1)) { p.current.y += 1; p.lockTimer = 0; }
          p._sdTimer = 340;
        }
      }
    } else {
      p._sdTimer = 0;
    }
    p._sdHeldPrev = softHeld;

    // gravity
    if (p.dropAcc === undefined) p.dropAcc = 0;
    p.dropAcc += dt;
    const speed = speedForLevel(p.level);
    if (p.dropAcc >= speed) {
      p.dropAcc = 0;
      if (p.current) {
        if (!collides(p.board, p.current, 0, 1)) { p.current.y += 1; p.lockTimer = 0; }
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
  const left = isP1 ? 'a' : 'ArrowLeft';
  const right = isP1 ? 'd' : 'ArrowRight';
  const down = isP1 ? 's' : 'ArrowDown';
  const rotCCW = isP1 ? 'z' : '[';
  const rotCW = isP1 ? 'x' : ']';

  // movement with DAS
  if (keys.has(left)) {
    p.dasLeft += dt * 1000;
    if (p.dasLeft >= 350) {
      // move
      if (p.dasLeft - dt*1000 < 133) {
        // initial
        if (!collides(p.board, p.current, -1, 0)) { p.current.x -= 1; p.lockTimer = 0; }
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
  for (let r = 0; r < piece.matrix.length; r++) for (let c = 0; c < piece.matrix[r].length; c++) {
    if (piece.matrix[r][c]) {
      const x = piece.x + c, y = piece.y + r;
      if (y < 0) { p.toppedOut = true; p.gameOver = true; return; }
      p.board.set(x, y, piece.def.color);
    }
  }
  p.score += 1;
  p.piecesPlaced += 1;
  // level
  p.level = Math.floor(p.piecesPlaced / 10) + 1;
  // line clear
  const full = p.board.fullRows();
  if (full.length > 0) p.board.removeRows(full);
  // spawn next
  match!.spawnFor(p);
  // check immediate collision => top out
  if (p.current && collides(p.board, p.current)) {
    p.toppedOut = true; p.gameOver = true; p.current = null;
  }
}

function decideWinner() {
  const p0 = match!.players[0], p1 = match!.players[1];
  let w: 'p1'|'p2'|'draw';
  if (p0.score > p1.score) w = 'p1';
  else if (p1.score > p0.score) w = 'p2';
  else w = 'draw';
  match!.winner = w;
  match!.status = 'gameover';
  screen = 'gameover';
  // stats
  const sess: Session = { date: new Date().toISOString(), winner: w, scores: [p0.score, p1.score], pieces: [p0.piecesPlaced, p1.piecesPlaced] };
  stats.sessionsPlayed++;
  stats.totalPlayTimeMs += Date.now() - sessionStart;
  if (w === 'p1') stats.winsP1++;
  if (w === 'p2') stats.winsP2++;
  stats.lastSessions.unshift(sess);
  if (stats.lastSessions.length > 5) stats.lastSessions.pop();
  saveStats(stats);
}

// Rendering
function draw() {
  ctx.fillStyle = '#0f1115';
  ctx.fillRect(0, 0, 1920, 1080);
  if (screen === 'menu') drawMenu();
  else if (screen === 'countdown') drawPlay(true);
  else if (screen === 'play') drawPlay(false);
  else if (screen === 'gameover') drawGameOver();
  else if (screen === 'stats') drawStats();
  else if (screen === 'controls') drawControls();
  else if (screen === 'volume') drawVolume();
  requestAnimationFrame(draw);
}

function drawBoard(p: any, ox: number, oy: number, cell: number) {
  const over = p.gameOver || p.toppedOut;
  // grid lines (brighter)
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;
  for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(ox, oy + r*cell); ctx.lineTo(ox + COLS*cell, oy + r*cell); ctx.stroke(); }
  for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(ox + c*cell, oy); ctx.lineTo(ox + c*cell, oy + ROWS*cell); ctx.stroke(); }
  // board border
  ctx.strokeStyle = '#ccc'; ctx.lineWidth = 2;
  ctx.strokeRect(ox, oy, COLS*cell, ROWS*cell);
  // cells
  ctx.save();
  if (over) ctx.globalAlpha = 0.35;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const v = p.board.grid[r][c];
    if (v) { ctx.fillStyle = v; ctx.fillRect(ox + c*cell + 1, oy + r*cell + 1, cell-2, cell-2); }
  }
  ctx.restore();
  // current piece (only while playing)
  if (p.current && !over) {
    ctx.fillStyle = p.current.def.color;
    for (let r = 0; r < p.current.matrix.length; r++) for (let c = 0; c < p.current.matrix[r].length; c++) {
      if (p.current.matrix[r][c]) {
        ctx.fillRect(ox + (p.current.x+c)*cell + 1, oy + (p.current.y+r)*cell + 1, cell-2, cell-2);
      }
    }
  }
  if (over) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(ox, oy, COLS*cell, ROWS*cell);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 48px sans-serif'; ctx.textAlign = 'center';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 8;
    ctx.fillText('GAME OVER', ox + COLS*cell/2, oy + ROWS*cell/2);
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
  }
}
 
const CELL = 50;
function drawPlay(countdown: boolean) {
  const p0 = match!.players[0], p1 = match!.players[1];
  drawBoard(p0, 200, 40, CELL);
  drawBoard(p1, 1920 - 200 - COLS*CELL, 40, CELL);
  // HUD
  ctx.fillStyle = '#fff'; ctx.font = '24px monospace';
  ctx.fillText(`P1 Score: ${p0.score}  Lvl ${p0.level}`, 200, 30);
  ctx.fillText(`P2 Score: ${p1.score}  Lvl ${p1.level}`, 1920 - 200 - COLS*CELL, 30);
  // next piece preview
  function drawNext(p: any, ox: number, oy: number) {
    const cs = 20;
    ctx.strokeStyle = '#666'; ctx.lineWidth = 1;
    ctx.strokeRect(ox, oy, 4*cs, 4*cs);
    if (p.nextDef) {
      const m = p.nextDef.shape;
      const cols = m[0].length, rows = m.length;
      const offX = Math.floor((4 - cols)/2);
      const offY = Math.floor((4 - rows)/2);
      ctx.fillStyle = p.nextDef.color;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        if (m[r][c]) ctx.fillRect(ox + (offX+c)*cs + 1, oy + (offY+r)*cs + 1, cs-2, cs-2);
      }
    }
    ctx.fillStyle = '#aaa'; ctx.font = '14px monospace';
    ctx.fillText('NEXT', ox, oy - 6);
  }
  drawNext(p0, 200 + COLS*CELL + 20, 40);
  drawNext(p1, 1920 - 200 - COLS*CELL - 4*20 - 20, 40);
  if (countdown) {
    ctx.fillStyle = '#fff'; ctx.font = 'bold 96px sans-serif'; ctx.textAlign = 'center';
    const n = Math.ceil(match!.countdownMs / 1000);
    ctx.fillText(String(n > 0 ? n : 'GO'), 960, 540);
    ctx.textAlign = 'left';
  }
  // no separate pause screen
}

function drawMenu() {
  ctx.fillStyle = '#fff'; ctx.font = 'bold 72px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('TETRIS DUEL', 960, 200);
  ctx.font = '36px sans-serif';
  menuItems().forEach((m, i) => {
    ctx.fillStyle = i === menuIndex ? '#0f0' : '#aaa';
    ctx.fillText(m, 960, 400 + i * 60);
  });
  ctx.textAlign = 'left';
}

function drawGameOver() {
  ctx.fillStyle = '#fff'; ctx.font = 'bold 64px sans-serif'; ctx.textAlign = 'center';
  const w = match!.winner === 'p1' ? 'Player 1 Wins!' : match!.winner === 'p2' ? 'Player 2 Wins!' : 'Draw!';
  ctx.fillText(w, 960, 200);
  ctx.font = '32px monospace';
  ctx.fillText(`P1: ${match!.players[0].score}  P2: ${match!.players[1].score}`, 960, 300);
  const opts = ['Restart', 'Main Menu'];
  opts.forEach((o, i) => {
    ctx.fillStyle = i === gameOverIndex ? '#0f0' : '#aaa';
    ctx.fillText(o, 960, 700 + i * 60);
  });
  ctx.textAlign = 'left';
}

function drawStats() {
  ctx.fillStyle = '#fff'; ctx.font = 'bold 48px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('STATS', 960, 120);
  ctx.font = '24px monospace'; ctx.textAlign = 'left';
  ctx.fillText(`Sessions: ${stats.sessionsPlayed}  Play time: ${Math.round(stats.totalPlayTimeMs/60000)}m`, 200, 220);
  ctx.fillText(`P1 wins: ${stats.winsP1}  P2 wins: ${stats.winsP2}`, 200, 260);
  let y = 320;
  for (const s of stats.lastSessions) {
    ctx.fillText(`${s.date.slice(0,10)}  ${s.winner}  P1:${s.scores[0]} P2:${s.scores[1]}`, 200, y); y += 32;
  }
  ctx.textAlign = 'center'; ctx.fillText('Press Esc to back', 960, 1000); ctx.textAlign = 'left';
}

function drawControls() {
  ctx.fillStyle = '#fff'; ctx.font = 'bold 48px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('CONTROLS', 960, 120);
  ctx.font = '22px monospace'; ctx.textAlign = 'left';
  const lines = [
    'P1: A/D move, S soft drop, Z rotate CCW, X rotate CW',
    'P2: Arrow Left/Right move, Arrow Down soft drop, [ rotate CCW, ] rotate CW',
    'Global: Esc pause/menu, Enter confirm',
  ];
  lines.forEach((l, i) => ctx.fillText(l, 200, 260 + i*40));
  ctx.textAlign = 'center'; ctx.fillText('Press Esc to back', 960, 1000); ctx.textAlign = 'left';
}

function drawVolume() {
  ctx.fillStyle = '#fff'; ctx.font = 'bold 48px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('VOLUME', 960, 120);
  ctx.font = '32px monospace';
  // slider
  ctx.fillStyle = '#444'; ctx.fillRect(400, 420, 1120, 20);
  ctx.fillStyle = '#0f0'; ctx.fillRect(400, 420, 1120 * volume, 20);
  ctx.fillStyle = '#fff'; ctx.fillText(`Volume: ${Math.round(volume*100)}%`, 960, 380);
  ctx.fillText('Use Left/Right or drag slider, Esc to back', 960, 500);
  ctx.textAlign = 'left';
}

// Menu input handling
let lastKey = '';
window.addEventListener('keydown', e => {
  if (e.key !== lastKey) {
    lastKey = e.key;
    // menu navigation
    if (screen === 'menu') {
      const items = menuItems();
      if (e.key === 'ArrowDown' || e.key === 's') menuIndex = (menuIndex + 1) % items.length;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') menuIndex = (menuIndex - 1 + items.length) % items.length;
      if (e.key === 'Enter' || e.key === ' ') {
        const opt = items[menuIndex];
        if (opt === 'Start' || opt === 'Resume') {
          if (opt === 'Resume') { pausedFromGame = false; screen = 'play'; if (match) match.status = 'playing'; }
          else startMatch();
        }
        else if (opt === 'Stats') screen = 'stats';
        else if (opt === 'Volume') screen = 'volume';
        else if (opt === 'Controls') screen = 'controls';
      }
    } else if (screen === 'stats' || screen === 'controls') {
      if (e.key === 'Escape') screen = 'menu';
    } else if (screen === 'volume') {
      if (e.key === 'ArrowLeft') { volume = Math.max(0, volume - 0.05); saveVolume(volume); }
      if (e.key === 'ArrowRight') { volume = Math.min(1, volume + 0.05); saveVolume(volume); }
      if (e.key === 'Escape') screen = 'menu';
    } else if (screen === 'gameover') {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') gameOverIndex = 0;
      else if (e.key === 'ArrowDown' || e.key === 's') gameOverIndex = 1;
      else if (e.key === 'Enter' || e.key === ' ') {
        if (gameOverIndex === 0) startMatch(); else { screen = 'menu'; gameOverIndex = 0; }
      } else if (e.key === 'Escape') { screen = 'menu'; gameOverIndex = 0; }
    } else if (screen === 'play') {
      if (e.key === 'Escape') { pausedFromGame = true; if (match) match.status = 'paused'; screen = 'menu'; menuIndex = 0; }
    }
  }
});
window.addEventListener('keyup', () => { lastKey = ''; });

// Simplified game loop with real input polling for movement
let last = performance.now();
let gpPrev: any = { up:false, down:false, a:false, b:false, start:false };
function handleGamepadMenus() {
  const gps = (navigator as any).getGamepads ? (navigator as any).getGamepads() : [];
  const gp = gps[0];
  if (!gp) return;
  const up = gp.buttons[12]?.pressed || gp.axes[1] < -0.5;
  const down = gp.buttons[13]?.pressed || gp.axes[1] > 0.5;
  const a = gp.buttons[0]?.pressed;
  const b = gp.buttons[1]?.pressed || gp.buttons[8]?.pressed;
  if (screen === 'play') {
    if (gp.buttons[9]?.pressed && !gpPrev.start) { pausedFromGame = true; if (match) match.status = 'paused'; screen = 'menu'; menuIndex = 0; }
  }
  if (screen === 'menu') {
    const items = menuItems();
    if (up && !gpPrev.up) menuIndex = (menuIndex - 1 + items.length) % items.length;
    if (down && !gpPrev.down) menuIndex = (menuIndex + 1) % items.length;
    const startPressed = gp.buttons[9]?.pressed;
    if ((a && !gpPrev.a) || (startPressed && !gpPrev.start)) {
      const opt = items[menuIndex];
      if (opt === 'Start') startMatch();
      else if (opt === 'Resume') { pausedFromGame = false; screen = 'play'; if (match) match.status = 'playing'; }
      else if (opt === 'Stats') screen = 'stats';
      else if (opt === 'Volume') screen = 'volume';
      else if (opt === 'Controls') screen = 'controls';
    }
  } else if (screen === 'gameover') {
    if (up && !gpPrev.up) gameOverIndex = 0;
    if (down && !gpPrev.down) gameOverIndex = 1;
    if (a && !gpPrev.a) {
      if (gameOverIndex === 0) startMatch(); else { screen = 'menu'; gameOverIndex = 0; }
    }
  } else if (screen === 'stats' || screen === 'controls' || screen === 'volume') {
    if (b && !gpPrev.b) screen = 'menu';
  }
  gpPrev = { up, down, a, b, start: gp.buttons[9]?.pressed };
}
function loop(now: number) {
  handleGamepadMenus();
  const dt = (now - last) / 1000; last = now;
  // handle movement input during play
  if (screen === 'play' && match && match.status === 'playing') {
    for (let i = 0; i < 2; i++) {
      const p = match.players[i] as any;
      if (p.gameOver || !p.current) continue;
      const isP1 = i === 0;
      const leftKey = isP1 ? 'a' : 'ArrowLeft';
      const rightKey = isP1 ? 'd' : 'ArrowRight';
      const downKey = isP1 ? 's' : 'ArrowDown';
      const ccwKey = isP1 ? 'z' : '[';
      const cwKey = isP1 ? 'x' : ']';
      // rotation edge detection via a pressed set tracking
      // movement DAS
      // left
      if (keys.has(leftKey)) {
        p._dasL = (p._dasL || 0) + dt * 1000;
        if (p._dasL >= 350 && (p._dasL - dt*1000 < 350 || (p._dasL % 50) < ( (p._dasL - dt*1000) % 33))) {
          // attempt move; on first, immediate
        }
      } else p._dasL = 0;
      // We'll do simpler: on keydown event move once + DAS repeat via timers (skip complexity)
    }
  }
  update(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(draw);
requestAnimationFrame(loop);
