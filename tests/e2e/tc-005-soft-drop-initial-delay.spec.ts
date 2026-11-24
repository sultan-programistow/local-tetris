/**
 * TC-005 — Soft drop: one cell per tap, hold delay before the rapid drop.
 * Case of record: tests/test-cases/TC-005-soft-drop-initial-delay.md
 *
 * A short tap (or button press) moves exactly one cell down. A hold moves one cell at
 * the press edge, nothing for ~350 ms, then drops rapidly to the floor. W must rotate,
 * not drop. Steps are read per frame from the ?e2e=1 hook; a step where both players
 * move in the same sample is gravity and is not counted.
 */
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { BTN, installGamepads, setPad, startMatch, startTrace, tapKey, trace } from './helpers/app';
import { game } from './helpers/hook';

const REPORTS = 'tests/reports/TC-005';

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

const DELAY_MIN = 250;
const DELAY_MAX = 500;
const REPEAT_MAX = 200;

type Step = { t: number; from: number; to: number };

/**
 * Downward steps of the driven player, with simultaneous gravity removed.
 *
 * Both players fall on the same gravity tick at level 1, so in one sample the driven
 * player may move 2 rows: one gravity row (the other player moved 1) plus one input
 * row. Counting "moved rows minus the other player's row" keeps that press-edge cell
 * instead of discarding the whole sample as gravity.
 */
function downStepsOf(samples: { t: number; p: any }[], player: 0 | 1): Step[] {
  const out: Step[] = [];
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1].p;
    const b = samples[i].p;
    if (!a || !b) continue;
    const me = a[player];
    const me2 = b[player];
    const other = a[1 - player];
    const other2 = b[1 - player];
    if (!me || !me2 || !other || !other2) continue;
    if (me.pieces !== me2.pieces) continue; // new piece
    const moved = me2.y - me.y;
    const otherMoved = other2.y - other.y;
    if (moved <= 0) continue;
    const inputCells = moved - Math.min(otherMoved, 1);
    if (inputCells <= 0) continue; // pure gravity, both players fell together
    for (let k = 0; k < inputCells; k++) out.push({ t: samples[i].t, from: me2.y - k - 1, to: me2.y - k });
  }
  return out;
}

/** Let the current piece lock if it is close to the floor, so the next test starts at the top. */
async function ensureRoom(page: Page, player: 0 | 1) {
  const s = await game(page);
  const p = s.players![player];
  if (p.y === null || p.y < 6) return;
  const before = p.pieces;
  await page.keyboard.down(player === 0 ? 's' : 'ArrowDown');
  const deadline = Date.now() + 4_000;
  while (Date.now() < deadline) {
    if ((await game(page)).players![player].pieces > before) break;
    await page.waitForTimeout(40);
  }
  await page.keyboard.up(player === 0 ? 's' : 'ArrowDown');
  await page.waitForTimeout(120);
}

type Input = { name: string; player: 0 | 1; kind: 'key' | 'pad'; button?: number };

const INPUTS: Input[] = [
  { name: 'P1 S', player: 0, kind: 'key' },
  { name: 'P2 ArrowDown', player: 1, kind: 'key' },
  { name: 'pad0 D-pad down', player: 0, kind: 'pad', button: BTN.DOWN },
  { name: 'pad0 A', player: 0, kind: 'pad', button: BTN.A },
];

async function driveSoft(page: Page, input: Input, ms: number) {
  await ensureRoom(page, input.player);
  const t0 = await startTrace(page);
  if (input.kind === 'key') {
    const key = input.player === 0 ? 's' : 'ArrowDown';
    await page.keyboard.down(key);
    await page.waitForTimeout(ms);
    await page.keyboard.up(key);
  } else {
    await setPad(page, 0, { buttons: [input.button!] });
    await page.waitForTimeout(ms);
    await setPad(page, 0, {});
  }
  await page.waitForTimeout(input.kind === 'pad' ? 300 : 300);
  const samples = await trace(page);
  return { t0, steps: downStepsOf(samples, input.player), samples };
}

test('TC-005 — tap drops one cell, hold waits ~350 ms then drops fast', async ({ page }) => {
  test.setTimeout(240_000);
  await installGamepads(page);
  await page.goto('/?e2e=1');
  await startMatch(page);

  // W rotates (P1), it must not soft-drop.
  const beforeW = (await game(page)).players![0];
  await tapKey(page, 'w', 70);
  await page.waitForTimeout(150);
  const afterW = (await game(page)).players![0];
  expect(afterW.rotation, 'W rotates the P1 piece').not.toBe(beforeW.rotation);
  rows.push({ input: 'P1 W', rotation: `${beforeW.rotation} -> ${afterW.rotation}` });

  for (const input of INPUTS) {
    const tap = await driveSoft(page, input, 120);
    expect(tap.steps.length, `${input.name} tap: exactly one cell`).toBe(1);
    expect(tap.steps[0].t - tap.t0, `${input.name} tap: reacts immediately`).toBeLessThan(250);

    const hold = await driveSoft(page, input, 900);
    const steps = hold.steps;
    expect(steps.length, `${input.name} hold: press edge + rapid drop`).toBeGreaterThanOrEqual(4);

    const gaps = steps.map((s, i) => s.t - (i === 0 ? hold.t0 : steps[i - 1].t));
    expect(gaps[0], `${input.name} press-edge cell`).toBeLessThan(250);
    // Delay measured from the press: the press-edge cell is seen on a later frame.
    const holdDelay = steps[1].t - hold.t0;
    expect(holdDelay, `${input.name} hold delay ≥ ${DELAY_MIN} ms`).toBeGreaterThanOrEqual(DELAY_MIN);
    expect(holdDelay, `${input.name} hold delay ≤ ${DELAY_MAX} ms`).toBeLessThanOrEqual(DELAY_MAX);
    for (const g of gaps.slice(2)) {
      expect(g, `${input.name} rapid-drop gap`).toBeLessThanOrEqual(REPEAT_MAX);
    }

    rows.push({
      input: input.name,
      tapSteps: tap.steps.length,
      steps: steps.length,
      gaps: gaps.map((g) => Math.round(g)),
      holdDelayMs: Math.round(steps[1].t - hold.t0),
    });
  }

  writeFileSync(
    `${REPORTS}/${RUN}-tap-hold-timeline.json`,
    JSON.stringify({ case: 'TC-005', runId: RUN, rows, at: new Date().toISOString() }, null, 2),
  );
  await page.screenshot({ path: `${REPORTS}/${RUN}-after-softdrop.png` });
});
