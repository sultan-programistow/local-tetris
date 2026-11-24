/**
 * TC-009 — Volume screen: tap, 300 ms hold delay, then 50 ms repeat.
 * Case of record: tests/test-cases/TC-009-volume-gamepad-repeat.md
 *
 * One press changes the volume by one 5% step; a hold shorter than 300 ms still
 * changes it once; after ~300 ms it repeats a step roughly every 50 ms until release.
 * Keyboard auto-repeat events must not add steps. Repeat timing is frame-quantised,
 * so the bands are wide: 250–450 ms for the delay, ≤150 ms between repeats.
 */
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { BTN, installGamepads, setPad, startTrace, tapKey, tapPad, trace } from './helpers/app';
import { game } from './helpers/hook';

const REPORTS = 'tests/reports/TC-009';

function nextRunId(): string {
  if (process.env.TC_RUN_ID) return process.env.TC_RUN_ID;
  mkdirSync(REPORTS, { recursive: true });
  const used = readdirSync(REPORTS)
    .map((f) => /^run(\d+)-/.exec(f)?.[1])
    .filter((n): n is string => Boolean(n))
    .map(Number);
  return `run${used.length ? Math.max(...used) + 1 : 1}`;
}

const RUN = nextRunId();
const rows: Record<string, unknown>[] = [];
const START_VOLUME = 0.5;

const DELAY_MIN = 250;
const DELAY_MAX = 450;
const REPEAT_MAX = 150;

/** Volume changes of one 5% step each, with timestamps. */
function volumeSteps(samples: { t: number; volume: number }[]) {
  const out: { t: number; from: number; to: number }[] = [];
  for (let i = 1; i < samples.length; i++) {
    const a = Math.round(samples[i - 1].volume * 100);
    const b = Math.round(samples[i].volume * 100);
    if (a !== b) out.push({ t: samples[i].t, from: a, to: b });
  }
  return out;
}

/** Return the volume to exactly 50% with short arrow taps before a sub-case. */
async function normalize(page: Page) {
  for (let i = 0; i < 30; i++) {
    const v = Math.round((await game(page)).volume * 100);
    if (v === 50) return;
    await tapKey(page, v > 50 ? 'ArrowLeft' : 'ArrowRight', 50);
    await page.waitForTimeout(60);
  }
  throw new Error('could not normalise the volume to 50%');
}

type Case = {
  id: string;
  path: 'gamepad' | 'keyboard';
  hold: number;
  /** 'tap' (one step), 'short' (one step at 250 ms), 'long' (repeats) */
  kind: 'tap' | 'short' | 'long';
  press: () => Promise<void>;
  release: () => Promise<void>;
  direction: -1 | 1;
};

function padCase(id: string, hold: number, kind: Case['kind'], direction: -1 | 1, stick = false): Case {
  const press = async () => {
    await setPad(page0, 0, stick ? { lx: direction * 0.9 } : { buttons: [direction < 0 ? BTN.LEFT : BTN.RIGHT] });
  };
  return {
    id,
    path: 'gamepad',
    hold,
    kind,
    direction,
    press,
    release: async () => setPad(page0, 0, {}),
  } as Case;
}

// The page is bound per test; the factory above closes over it.
let page0: Page;

function keyCase(id: string, hold: number, kind: Case['kind'], key: string, direction: -1 | 1): Case {
  return {
    id,
    path: 'keyboard',
    hold,
    kind,
    direction,
    press: async () => page0.keyboard.down(key),
    release: async () => page0.keyboard.up(key),
  };
}

async function runCase(page: Page, c: Case) {
  await normalize(page);
  const t0 = await startTrace(page);
  await c.press();
  await page.waitForTimeout(c.hold);
  await c.release();
  await page.waitForTimeout(250); // no writes after release
  const samples = await trace(page);
  const steps = volumeSteps(samples);
  const gaps = steps.map((s, i) => Math.round(s.t - (i === 0 ? t0 : steps[i - 1].t)));

  if (c.kind === 'tap' || c.kind === 'short') {
    expect(steps.length, `${c.id}: exactly one step`).toBe(1);
    expect(steps[0].to - steps[0].from, `${c.id}: one 5% step`).toBe(c.direction * 5);
    expect(steps[0].t - t0, `${c.id}: reacts to the press`).toBeLessThan(150);
  } else {
    expect(steps.length, `${c.id}: several steps while held`).toBeGreaterThanOrEqual(5);
    expect(steps[0].t - t0, `${c.id}: first step at the press`).toBeLessThan(150);
    const delay = steps[1].t - steps[0].t;
    expect(delay, `${c.id}: hold delay ≥ ${DELAY_MIN} ms`).toBeGreaterThanOrEqual(DELAY_MIN);
    expect(delay, `${c.id}: hold delay ≤ ${DELAY_MAX} ms`).toBeLessThanOrEqual(DELAY_MAX);
    for (const g of gaps.slice(2)) {
      expect(g, `${c.id}: repeat gap`).toBeLessThanOrEqual(REPEAT_MAX);
    }
    for (const s of steps) {
      expect(s.to - s.from, `${c.id}: each step is 5%`).toBe(c.direction * 5);
    }
  }

  rows.push({ id: c.id, path: c.path, hold: c.hold, steps: steps.length, gaps, deltas: steps.map((s) => s.to - s.from) });
}

test('TC-009 — volume tap, hold delay and repeat on keyboard and gamepad', async ({ page }) => {
  test.setTimeout(180_000);
  page0 = page;
  await page.addInitScript((v: number) => {
    try {
      localStorage.setItem('local-tetris:volume', String(v));
    } catch {
      /* app default applies */
    }
  }, START_VOLUME);
  await installGamepads(page);
  await page.goto('/?e2e=1');
  await expect.poll(async () => (await game(page)).frame).toBeGreaterThan(0);
  expect(Math.round((await game(page)).volume * 100)).toBe(50);

  // Main menu -> Volume screen.
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await game(page)).screen).toBe('volume');
  await page.screenshot({ path: `${REPORTS}/${RUN}-volume-screen.png` });

  // Gamepad: taps, 250 ms holds, 650 ms holds, and vertical negatives.
  await runCase(page, padCase('A1', 120, 'tap', -1));
  await runCase(page, padCase('A2', 120, 'tap', 1));
  await runCase(page, padCase('A3', 120, 'tap', -1, true));
  await runCase(page, padCase('A4', 120, 'tap', 1, true));
  await runCase(page, padCase('B1', 250, 'short', -1));
  await runCase(page, padCase('B2', 250, 'short', 1));
  await runCase(page, padCase('C1', 650, 'long', -1));
  await runCase(page, padCase('C2', 650, 'long', 1));
  await runCase(page, padCase('C3', 650, 'long', -1, true));
  await runCase(page, padCase('C4', 650, 'long', 1, true));

  // Vertical gamepad inputs must not change the volume.
  await normalize(page);
  await startTrace(page);
  await tapPad(page, 0, { buttons: [BTN.UP] }, 250);
  await tapPad(page, 0, { ly: 0.9 }, 250);
  await page.waitForTimeout(200);
  const steps = volumeSteps(await trace(page));
  expect(steps.length, 'D1/D2 vertical inputs are silent').toBe(0);
  rows.push({ id: 'D1/D2', path: 'gamepad', hold: 250, steps: 0, gaps: [] });
  expect(Math.round((await game(page)).volume * 100)).toBe(50);

  // Keyboard: taps, 250 ms holds, 650 ms holds.
  await runCase(page, keyCase('E1', 120, 'tap', 'a', -1));
  await runCase(page, keyCase('E2', 120, 'tap', 'd', 1));
  await runCase(page, keyCase('E3', 120, 'tap', 'ArrowLeft', -1));
  await runCase(page, keyCase('E4', 120, 'tap', 'ArrowRight', 1));
  await runCase(page, keyCase('F1', 250, 'short', 'a', -1));
  await runCase(page, keyCase('F2', 250, 'short', 'd', 1));
  await runCase(page, keyCase('G1', 650, 'long', 'a', -1));
  await runCase(page, keyCase('G2', 650, 'long', 'd', 1));
  await runCase(page, keyCase('G3', 650, 'long', 'ArrowLeft', -1));
  await runCase(page, keyCase('G4', 650, 'long', 'ArrowRight', 1));

  // H1 — OS-style auto-repeat (500/33 ms) must not add steps.
  await normalize(page);
  const plainBefore = rows.filter((r) => r.id === 'G1')[0];
  const t0 = await startTrace(page);
  await page.keyboard.down('a');
  const repeatTimer = setInterval(() => {
    void page.evaluate((k) => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: k, repeat: true }));
    }, 'a');
  }, 33);
  await page.waitForTimeout(650);
  clearInterval(repeatTimer);
  await page.keyboard.up('a');
  await page.waitForTimeout(250);
  const h1 = volumeSteps(await trace(page));
  const h1Gaps = h1.map((s, i) => Math.round(s.t - (i === 0 ? t0 : h1[i - 1].t)));
  // Same schedule as a plain hold: delay before the first repeat, then ~50 ms steps.
  expect(h1.length, 'H1: repeats while held').toBeGreaterThanOrEqual(5);
  const h1Delay = h1[1].t - h1[0].t;
  expect(h1Delay, 'H1: hold delay').toBeGreaterThanOrEqual(DELAY_MIN);
  expect(h1Delay, 'H1: hold delay').toBeLessThanOrEqual(DELAY_MAX);
  for (const g of h1Gaps.slice(2)) expect(g, 'H1: repeat gap').toBeLessThanOrEqual(REPEAT_MAX);
  rows.push({
    id: 'H1',
    path: 'keyboard',
    hold: 650,
    steps: h1.length,
    gaps: h1Gaps,
    plainHoldSteps: plainBefore.steps,
    note: 'OS repeat 500/33',
  });

  writeFileSync(
    `${REPORTS}/${RUN}-repeat-timeline.json`,
    JSON.stringify({ case: 'TC-009', runId: RUN, rows, at: new Date().toISOString() }, null, 2),
  );
  await page.screenshot({ path: `${REPORTS}/${RUN}-after-volume.png` });
});
