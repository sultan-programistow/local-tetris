const SOUND_FILES: Record<string, string> = {
  move: '/sounds/move.ogg',
  rotate: '/sounds/rotate.ogg',
  soft_drop: '/sounds/soft_drop.ogg',
  piece_lock: '/sounds/piece_lock.ogg',
  line_clear: '/sounds/line_clear.ogg',
  game_over: '/sounds/game_over.ogg',
  pause: '/sounds/pause.ogg',
  unpause: '/sounds/unpause.ogg',
  menu_select: '/sounds/menu_select.ogg',
  menu_back: '/sounds/menu_back.ogg',
};

let volume = 0.7;
const cache: Record<string, HTMLAudioElement> = {};

export function setVolume(v: number) { volume = Math.max(0, Math.min(1, v)); }

export function preload() {
  for (const k in SOUND_FILES) {
    const a = new Audio(SOUND_FILES[k]);
    a.preload = 'auto';
    cache[k] = a;
  }
}

export function play(name: string) {
  if (volume <= 0) return;
  const base = cache[name];
  if (!base) return;
  const a = base.cloneNode() as HTMLAudioElement;
  a.volume = volume;
  a.play().catch(() => {});
}
