/**
 * TC-003 — Horizontal steering: tap, hold delay (DAS) and repeat.
 * Case of record: tests/test-cases/TC-003-horizontal-steering.md
 *
 * A short tap moves exactly one column. A hold moves one column at the press edge,
 * nothing for ~350 ms, then repeats every ~75 ms — keyboard and gamepad, both
 * directions, both players. Timing comes from per-frame samples of the current
 * piece's column through the ?e2e=1 hook.
 */
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { BTN, installGamepads, setPad, startMatch, startTrace, tapKey, trace } from './helpers/app';
import { game } from './helpers/hook';

const REPORTS = 'tests/reports/TC-003';

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

/** DAS: ≥250 ms before the first repeat (350 ms in the spec, frame-quantised). */
const DELAY_MIN = 250;
const DELAY_MAX = 500;
/** ARR: repeats are ~75 ms; a slow CI frame can stretch one gap. */
const REPEAT_MAX = 200;

type Move = { t: number; from: number; to: number };

function movesOf(samples: { t: number; p: any }[], player: 0 | 1): Move[] {
  const out: Move[] = [];
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1].p?.[player];
    const b = samples[i].p?.[player];
    if (!a || !b || a.x === null || b.x === null) continue;
    // A new piece spawns at x=3; that jump is a lock, not a steering move.
    if (a.pieces !== b.pieces) continue;
    if (Math.abs(b.x - a.x) === 1) out.push({ t: samples[i].t, from: a.x, to: b.x });
  }
  return out;
}

/** Move the piece to a known column with tapped keys, so a hold starts with room. */
async function recenter(page: Page, player: 0 | 1, target = 3) {
  for (let i = 0; i < 8; i++) {
    const x = (await game(page)).players![player].x;
    if (x === null || x === target) return;
    const left = x > target;
    await tapKey(page, player === 0 ? (left ? 'a' : 'd') : left ? 'ArrowLeft' : 'ArrowRight', 60);
    await page.waitForTimeout(30);
  }
}

type Input = { name: string; player: 0 | 1; kind: 'key' | 'pad'; dir: -1 | 1; padIndex?: 0 | 1; stick?: boolean };

const INPUTS: Input[] = [
  { name: 'P1 a', player: 0, kind: 'key', dir: -1 },
  { name: 'P1 d', player: 0, kind: 'key', dir: 1 },
  { name: 'P2 ArrowLeft', player: 1, kind: 'key', dir: -1 },
  { name: 'P2 ArrowRight', player: 1, kind: 'key', dir: 1 },
  { name: 'pad0 D-pad left', player: 0, kind: 'pad', dir: -1, padIndex: 0 },
  { name: 'pad1 D-pad left', player: 1, kind: 'pad', dir: -1, padIndex: 1 },
  { name: 'pad0 D-pad right', player: 0, kind: 'pad', dir: 1, padIndex: 0 },
  { name: 'pad1 D-pad right', player: 1, kind: 'pad', dir: 1, padIndex: 1 },
  { name: 'pad0 stick left', player: 0, kind: 'pad', dir: -1, padIndex: 0, stick: true },
  { name: 'pad0 stick right', player: 0, kind: 'pad', dir: 1, padIndex: 0, stick: true },
];

/** Run one input for `ms` and return the column changes of the driven player. */
async function drive(page: Page, input: Input, ms: number) {
  await recenter(page, input.player);
  const t0 = await startTrace(page);

  if (input.kind === 'key') {
    const key = input.player === 0 ? (input.dir < 0 ? 'a' : 'd') : input.dir < 0 ? 'ArrowLeft' : 'ArrowRight';
    await page.keyboard.down(key);
    await page.waitForTimeout(ms);
    await page.keyboard.up(key);
  } else {
    const pad = input.padIndex ?? 0;
    const press = input.stick
      ? { lx: input.dir * 0.9 }
      : { buttons: [input.dir < 0 ? BTN.LEFT : BTN.RIGHT] };
    await setPad(page, pad, press);
    await page.waitForTimeout(ms);
    await setPad(page, pad, {});
  }
  await page.waitForTimeout(400); // catch a delayed repeat after release

  const samples = await trace(page);
  return { t0, moves: movesOf(samples, input.player), samples };
}

test('TC-003 — tap moves one column, hold waits ~350 ms then repeats ~75 ms', async ({ page }) => {
  test.setTimeout(240_000);
  await installGamepads(page);
  await page.goto('/?e2e=1');
  await startMatch(page);

  for (const input of INPUTS) {
    // Tap: exactly one column, no second move from a leaked hold.
    const tap = await drive(page, input, 130);
    expect(tap.moves.length, `${input.name} tap: one move only`).toBe(1);
    expect(tap.moves[0].t - tap.t0, `${input.name} tap: reacts to the press`).toBeLessThan(200);

    // Hold: press-edge move, DAS delay, then ARR repeats.
    const hold = await drive(page, input, 900);
    const moves = hold.moves;
    expect(moves.length, `${input.name} hold: at least press + 2 repeats`).toBeGreaterThanOrEqual(3);

    const gaps: number[] = moves.map((m, i) => m.t - (i === 0 ? hold.t0 : moves[i - 1].t));
    expect(gaps[0], `${input.name} press-edge move`).toBeLessThan(200);
    expect(gaps[1], `${input.name} DAS delay ≥ ${DELAY_MIN} ms`).toBeGreaterThanOrEqual(DELAY_MIN);
    expect(gaps[1], `${input.name} DAS delay ≤ ${DELAY_MAX} ms`).toBeLessThanOrEqual(DELAY_MAX);
    for (const g of gaps.slice(2)) {
      expect(g, `${input.name} ARR repeat gap`).toBeLessThanOrEqual(REPEAT_MAX);
    }

    rows.push({
      input: input.name,
      tapMoves: tap.moves.length,
      moves: moves.length,
      gaps: gaps.map((g) => Math.round(g)),
      columns: moves.map((m) => `${m.from}->${m.to}`),
    });
  }

  writeFileSync(
    `${REPORTS}/${RUN}-das-timeline.json`,
    JSON.stringify({ case: 'TC-003', runId: RUN, rows, at: new Date().toISOString() }, null, 2),
  );
  await page.screenshot({ path: `${REPORTS}/${RUN}-after-das.png` });
});
