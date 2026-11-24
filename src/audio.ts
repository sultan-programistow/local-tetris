const SOUND_FILES: Record<string, string> = {
  move: 'sounds/move.ogg',
  rotate: 'sounds/rotate.ogg',
  soft_drop: 'sounds/soft_drop.ogg',
  piece_lock: 'sounds/piece_lock.ogg',
  line_clear: 'sounds/line_clear.ogg',
  game_over: 'sounds/game_over.ogg',
  pause: 'sounds/pause.ogg',
  unpause: 'sounds/unpause.ogg',
  menu_select: 'sounds/menu_select.ogg',
  menu_enter: 'sounds/menu_enter.ogg',
  menu_back: 'sounds/menu_back.ogg',
};

let volume = 0.7;
const buffers: Record<string, AudioBuffer> = {};
let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new (window as any).AudioContext();
  return ctx as AudioContext;
}

export function setVolume(v: number) { volume = Math.max(0, Math.min(1, v)); }

export async function preload() {
  const c = getCtx();
  for (const k in SOUND_FILES) {
    try {
      const res = await fetch(SOUND_FILES[k]);
      const arr = await res.arrayBuffer();
      buffers[k] = await c.decodeAudioData(arr);
    } catch (e) { console.warn('audio preload failed', k, e); }
  }
}

export function play(name: string, pan: number = 0) {
  if (volume <= 0) return;
  const buf = buffers[name];
  if (!buf) return;
  const c = getCtx();
  const src = c.createBufferSource();
  src.buffer = buf;
  const panner = c.createStereoPanner();
  panner.pan.value = Math.max(-1, Math.min(1, pan));
  const gain = c.createGain();
  gain.gain.value = volume;
  src.connect(panner).connect(gain).connect(c.destination);
  src.start(0);
}
