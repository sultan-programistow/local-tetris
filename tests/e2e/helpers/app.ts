import type { Page } from '@playwright/test';
import { game } from './hook';

/**
 * A standard-mapping gamepad mock exposed through navigator.getGamepads().
 * Pad 0 drives P1, pad 1 drives P2 (see the polling loop in src/main.ts).
 * No physical pad is needed; the app polls these objects every animation frame.
 */

export async function installGamepads(page: Page) {
  await page.addInitScript(() => {
    const make = () => ({
      id: 'mock-standard-pad',
      index: 0,
      connected: true,
      mapping: 'standard',
      timestamp: 0,
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })),
    });
    const pads = [make(), make()];
    (window as unknown as { __pads: typeof pads }).__pads = pads;
    Object.defineProperty(navigator, 'getGamepads', {
      configurable: true,
      value: () => pads,
    });
  });
}

/** Button indices used by the app: A=0, B=1, X=2, LB=4, RB=5, Select=8, Start=9, D-pad up/down/left/right=12..15. */
export const BTN = { A: 0, B: 1, X: 2, LB: 4, RB: 5, SELECT: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };

type PadInput = { buttons?: number[]; lx?: number; ly?: number };

/** Set one pad's state. Axes always reset, so a released stick does not linger. */
export async function setPad(page: Page, index: 0 | 1, input: PadInput = {}) {
  await page.evaluate(
    ({ index, input }) => {
      const pads = (window as unknown as { __pads: any[] }).__pads;
      const pad = pads[index];
      for (const b of pad.buttons) {
        b.pressed = false;
        b.value = 0;
      }
      for (const i of input.buttons ?? []) {
        pad.buttons[i].pressed = true;
        pad.buttons[i].value = 1;
      }
      pad.axes[0] = input.lx ?? 0;
      pad.axes[1] = input.ly ?? 0;
      pad.timestamp = performance.now();
    },
    { index, input },
  );
}

/** Press buttons/stick for `ms`, then release. Long enough for at least one polled frame. */
export async function tapPad(page: Page, index: 0 | 1, input: PadInput, ms = 150) {
  await setPad(page, index, input);
  await page.waitForTimeout(ms);
  await setPad(page, index, {});
  // Let a frame run with the input released, so the next press is a fresh edge.
  await page.waitForTimeout(40);
}

export async function releasePads(page: Page) {
  await setPad(page, 0, {});
  await setPad(page, 1, {});
}

/** Wait until a game match is in play (countdown finished, pieces falling). */
export async function waitPlay(page: Page, timeout = 15_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const s = await game(page);
    if (s.screen === 'play' && s.players?.every((p) => p.type)) return s;
    await page.waitForTimeout(50);
  }
  throw new Error('match did not reach the play screen');
}

/** Start a match from the main menu with Enter and wait for it to be playable. */
export async function startMatch(page: Page) {
  await page.keyboard.press('Enter');
  return waitPlay(page);
}

/** Open the pause menu from play with Esc and wait for it. */
export async function pauseGame(page: Page) {
  // If a pause menu is already open (e.g. after coming back from a submenu), resume first.
  const before = await game(page);
  if (before.screen === 'menu' && before.status === 'paused') {
    await page.keyboard.press('Escape');
    const deadline = Date.now() + 3_000;
    while (Date.now() < deadline && (await game(page)).screen !== 'play') {
      await page.waitForTimeout(30);
    }
  }
  await page.keyboard.press('Escape');
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    const s = await game(page);
    if (s.screen === 'menu' && s.status === 'paused') return s;
    await page.waitForTimeout(25);
  }
  throw new Error('Esc did not open the pause menu');
}

/**
 * Both mocked pads hold A (soft drop), so both stacks top out and the match ends.
 * Takes roughly 7–9 s of real play; returns how long it took.
 */
export async function reachGameOver(page: Page, timeout = 40_000) {
  await setPad(page, 0, { buttons: [BTN.A] });
  await setPad(page, 1, { buttons: [BTN.A] });
  const started = Date.now();
  const deadline = started + timeout;
  let s = await game(page);
  while (Date.now() < deadline) {
    s = await game(page);
    if (s.screen === 'gameover') break;
    await page.waitForTimeout(100);
  }
  await releasePads(page);
  if (s.screen !== 'gameover') throw new Error('match did not reach Game Over');
  await page.waitForTimeout(250);
  return { ms: Date.now() - started, state: s };
}

/**
 * Sample the hook once per animation frame; returns the baseline timestamp.
 * The baseline sample is taken synchronously, so an input that lands before the first
 * frame still shows up as a transition instead of being missed.
 */
export type Sample = { t: number; frame: number; screen: string; volume: number; p: [any, any] | null };

export async function startTrace(page: Page): Promise<number> {
  return page.evaluate(() => {
    const w = window as unknown as {
      __trace: unknown[];
      __traceLoop?: boolean;
      __tetris?: Record<string, any>;
    };
    const sample = () => {
      const h = w.__tetris;
      if (h && w.__trace.length < 40_000) {
        w.__trace.push({
          t: performance.now(),
          frame: h.frame,
          screen: h.screen,
          volume: h.volume,
          p: h.players,
        });
      }
    };
    w.__trace = [];
    sample();
    if (!w.__traceLoop) {
      w.__traceLoop = true;
      const tick = () => {
        sample();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    return performance.now();
  });
}

export async function trace(page: Page): Promise<Sample[]> {
  return page.evaluate(() => (window as unknown as { __trace: Sample[] }).__trace);
}

/**
 * Press and release a key with a hold long enough for the game loop to sample it.
 * A page.keyboard.press() can be delivered inside a single frame and be missed by the
 * per-frame input polling in src/main.ts.
 */
export async function tapKey(page: Page, key: string, ms = 70) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

/** Press a key, hold for `ms` inside the page, release. Returns the press timestamp. */
export async function holdKey(page: Page, key: string, ms: number): Promise<number> {
  return page.evaluate(
    ({ key, ms }) =>
      new Promise<number>((resolve) => {
        const t = performance.now();
        window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
        setTimeout(() => {
          window.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
          resolve(t);
        }, ms);
      }),
    { key, ms },
  );
}
