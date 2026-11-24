/**
 * TC-015 — placement SFX is suppressed when the placement ends the match.
 * Case of record: tests/test-cases/TC-015-placement-sfx-suppressed-on-match-end.md
 *
 * specs/05-audio-and-visuals.md: "Placement SFX (piece lock / line clear) is suppressed
 * when the placed piece leaves both players topped out and ends the match; in that case
 * only the Game over SFX plays."
 *
 * A1 is the positive control: a normal piece lock still plays `piece_lock`.
 * A2 drives both stacks into a double top-out (both pads hold A) and checks that the
 * final placement carries no `piece_lock`/`line_clear` just before `game_over`.
 */
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { BTN, installGamepads, releasePads, setPad, startMatch } from './helpers/app';
import { game } from './helpers/hook';
import { clearSfx, installAudioHook, sfx, type Sfx } from './helpers/audio';

const REPORTS = 'tests/reports/TC-015';
/** Minimum gap between two real piece locks (lock delay is 500 ms). */
const END_WINDOW_MS = 150;
const PLACEMENT = new Set(['piece_lock', 'line_clear']);

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

function placement(events: Sfx[]): Sfx[] {
  return events.filter((e) => e.name !== null && PLACEMENT.has(e.name));
}

/** Hold one player's soft drop until their piece counter advances, then release. */
async function lockOne(page: Page, player: 0 | 1) {
  const before = (await game(page)).players![player].pieces;
  if (player === 0) {
    await page.keyboard.down('s');
  } else {
    await page.keyboard.down('ArrowDown');
  }
  const deadline = Date.now() + 10_000;
  let after = before;
  while (Date.now() < deadline) {
    after = (await game(page)).players![player].pieces;
    if (after > before) break;
    await page.waitForTimeout(20);
  }
  if (player === 0) {
    await page.keyboard.up('s');
  } else {
    await page.keyboard.up('ArrowDown');
  }
  if (after <= before) throw new Error(`player ${player + 1} piece did not lock in time`);
  return { before, after };
}

/**
 * Hold A on both mocked pads until the match ends. Both stacks top out — the first
 * top-out is recorded, the second one is the placement under test. Polls the hook
 * every 20 ms so the first top-out state is not missed.
 */
async function topOutBoth(page: Page) {
  const started = Date.now();
  await setPad(page, 0, { buttons: [BTN.A] });
  await setPad(page, 1, { buttons: [BTN.A] });

  let firstTopOutAt: number | null = null;
  let firstTopOutPlayer: 0 | 1 | null = null;
  let firstTopOutPieces: [number, number] | null = null;
  const deadline = started + 40_000;
  let s = await game(page);
  while (Date.now() < deadline) {
    s = await game(page);
    if (firstTopOutAt === null && s.players) {
      const over = s.players.map((p) => p.over);
      if (over[0] || over[1]) {
        firstTopOutAt = Date.now();
        firstTopOutPlayer = over[0] ? 0 : 1;
        firstTopOutPieces = [s.players[0].pieces, s.players[1].pieces];
      }
    }
    if (s.screen === 'gameover') break;
    await page.waitForTimeout(20);
  }
  await releasePads(page);
  if (s.screen !== 'gameover') throw new Error('match did not reach Game Over');
  await page.waitForTimeout(250);
  return {
    ms: Date.now() - started,
    firstTopOutAt,
    firstTopOutPlayer,
    firstTopOutPieces,
    finalPieces: s.players ? [s.players[0].pieces, s.players[1].pieces] : null,
    finalOver: s.players ? [s.players[0].over, s.players[1].over] : null,
  };
}

test('TC-015 — placement SFX suppressed when the match ends', async ({ page }) => {
  test.setTimeout(150_000);
  await installAudioHook(page);
  await installGamepads(page);
  await page.goto('/?e2e=1');
  await page.mouse.click(5, 5);
  await startMatch(page);

  // A1 — positive control: a normal lock in live play plays piece_lock (P1, pan -0.95).
  await clearSfx(page);
  const control = await lockOne(page, 0);
  await page.waitForTimeout(150);
  // P1 pan only: P2 may also lock on gravity during the hold, which is not this check.
  const controlEvents = placement(await sfx(page)).filter((e) => (e.pan ?? 0) < 0);
  const controlLock = controlEvents.find((e) => e.name === 'piece_lock');
  expect(controlEvents.length, 'A1 one P1 placement sound for a normal lock').toBe(1);
  expect(controlLock, 'A1 piece_lock').toBeTruthy();
  expect(controlLock!.pan ?? 0, 'A1 P1 pan').toBeCloseTo(-0.95, 2);
  rows.push({
    id: 'A1',
    expected: 'normal lock -> piece_lock, pan -0.95',
    actual: controlEvents.map((e) => ({ name: e.name, pan: e.pan })),
    pieces: control,
  });

  // A2 — both players top out, the final placement must be silent.
  await clearSfx(page);
  const run = await topOutBoth(page);
  const events = await sfx(page);
  const goIndex = events.map((e) => e.name).lastIndexOf('game_over');
  expect(goIndex, 'A2 game_over played').toBeGreaterThanOrEqual(0);
  const go = events[goIndex];
  expect(events.filter((e) => e.name === 'game_over').length, 'A2 exactly one game_over').toBe(1);

  const tail = events.filter((e) => e.t >= go.t - END_WINDOW_MS && e.t <= go.t + 50);
  const tailPlacements = placement(tail);
  const before = placement(events.slice(0, Math.max(0, goIndex)));
  const lastPlacement = before[before.length - 1] ?? null;

  expect(run.finalOver, 'A2 both players topped out').toEqual([true, true]);
  expect(tailPlacements, 'A2 no placement SFX in the final placement window').toEqual([]);

  rows.push({
    id: 'A2',
    expected: 'match-ending placement -> no piece_lock/line_clear, only game_over',
    actualTail: tail.map((e) => ({ name: e.name, pan: e.pan, dGameOverMs: Math.round(e.t - go.t) })),
    tailPlacements,
    lastPlacementBeforeGameOver: lastPlacement
      ? { name: lastPlacement.name, dGameOverMs: Math.round(lastPlacement.t - go.t) }
      : null,
    gameOver: { pan: go.pan, t: go.t },
    run,
    totalEvents: events.length,
  });

  await page.screenshot({ path: `${REPORTS}/${RUN}-game-over.png` });
  writeFileSync(
    `${REPORTS}/${RUN}-results.json`,
    JSON.stringify(
      {
        case: 'TC-015',
        runId: RUN,
        rows,
        endWindowMs: END_WINDOW_MS,
        at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
});
