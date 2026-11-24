/**
 * TC-012 — Sound panning: P1 left, P2 right, UI centred.
 * Case of record: tests/test-cases/TC-012-sound-panning.md
 *
 * Every player sound must be routed through a StereoPanner with pan −0.95 (P1) or
 * +0.95 (P2) on both keyboard and gamepad paths; every menu/UI sound pan 0.
 * The hook records the pan value the app sets, which is the spec's stated value.
 */
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { BTN, installGamepads, startMatch, tapKey, tapPad } from './helpers/app';
import { game } from './helpers/hook';
import { installAudioHook, names, step, type Sfx } from './helpers/audio';

const REPORTS = 'tests/reports/TC-012';

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
const P1_PAN = -0.95;
const P2_PAN = 0.95;
const rows: Record<string, unknown>[] = [];

/** Run one action and assert it played exactly `expected` with the given pan. */
async function check(
  page: Page,
  id: string,
  expected: string,
  pan: number | null,
  action: () => Promise<void>,
  waitMs = 250,
) {
  const events = await step(page, action, waitMs);
  expect(names(events), `${id}: sound`).toEqual([expected]);
  const actualPan = events[0]?.pan ?? null;
  if (pan === null) expect(actualPan, `${id}: pan`).toBeNull();
  else expect(actualPan ?? 0, `${id}: pan`).toBeCloseTo(pan, 2);
  rows.push({ id, expected, actual: names(events), pan: actualPan });
  return events;
}

/** Move the menu selection to `index` with ArrowUp presses (the menu wraps). */
async function gotoMenu(page: Page, index: number) {
  for (let i = 0; i < 5 && (await game(page)).menuIndex !== index; i++) {
    await page.keyboard.press('ArrowUp');
  }
  expect((await game(page)).menuIndex).toBe(index);
}

/** Hold soft drop until the given player locks a piece; returns what it played. */
async function lockPiece(page: Page, player: 0 | 1): Promise<Sfx[]> {
  const before = (await game(page)).players![player].pieces;
  return step(
    page,
    async () => {
      await page.keyboard.down(player === 0 ? 's' : 'ArrowDown');
      const deadline = Date.now() + 8_000;
      while (Date.now() < deadline) {
        const s = await game(page);
        if (s.players![player].pieces > before) break;
        await page.waitForTimeout(30);
      }
      await page.keyboard.up(player === 0 ? 's' : 'ArrowDown');
    },
    150,
  );
}

test('TC-012 — panning on keyboard, gamepad and UI sounds', async ({ page }) => {
  test.setTimeout(120_000);
  await installAudioHook(page);
  await installGamepads(page);
  await page.goto('/?e2e=1');
  await expect.poll(async () => (await game(page)).frame).toBeGreaterThan(0);
  await page.mouse.click(5, 5);
  await page.waitForTimeout(250);

  // ---- D: UI sounds, all centred -----------------------------------------
  await check(page, 'D1', 'menu_select', 0, () => page.keyboard.press('ArrowDown'));
  await check(page, 'D2', 'menu_select', 0, () => tapPad(page, 0, { buttons: [BTN.DOWN] }, 120));

  // Volume screen: one step (menu_select) and back (menu_back), both centred.
  await gotoMenu(page, 2); // Volume
  await page.keyboard.press('Enter');
  expect((await game(page)).screen).toBe('volume');
  await check(page, 'D5', 'menu_select', 0, () => tapKey(page, 'ArrowRight', 60));
  await check(page, 'D6', 'menu_back', 0, () => page.keyboard.press('Escape'));

  // Stats and Controls back keys.
  await gotoMenu(page, 1); // Stats
  await page.keyboard.press('Enter');
  expect((await game(page)).screen).toBe('stats');
  await check(page, 'D7', 'menu_back', 0, () => page.keyboard.press('Escape'));

  await gotoMenu(page, 3); // Controls
  await page.keyboard.press('Enter');
  expect((await game(page)).screen).toBe('controls');
  await check(page, 'D8', 'menu_back', 0, () => page.keyboard.press('Escape'));

  // Pause / unpause from play.
  await gotoMenu(page, 0); // Start
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await game(page)).screen, { timeout: 15_000 }).toBe('play');
  await check(page, 'D3', 'pause', 0, () => page.keyboard.press('Escape'));
  expect((await game(page)).status).toBe('paused');
  await check(page, 'D4', 'unpause', 0, () => page.keyboard.press('Enter'));
  await expect.poll(async () => (await game(page)).screen).toBe('play');

  // ---- A: P1 keyboard, pan -0.95 -----------------------------------------
  await check(page, 'A1', 'move', P1_PAN, () => tapKey(page, 'a', 70));
  await check(page, 'A2', 'move', P1_PAN, () => tapKey(page, 'd', 70));
  await check(page, 'A3', 'soft_drop', P1_PAN, () => tapKey(page, 's', 70));
  await check(page, 'A4', 'rotate', P1_PAN, () => page.keyboard.press('x'));

  let lock = await lockPiece(page, 0);
  let lockEvents = lock.filter((e) => e.name === 'piece_lock' || e.name === 'line_clear');
  expect(lockEvents.length, 'A5: one P1 lock sound').toBeGreaterThanOrEqual(1);
  expect(lockEvents[0].pan ?? 0, 'A5: P1 lock pan').toBeCloseTo(P1_PAN, 2);
  rows.push({ id: 'A5', expected: 'piece_lock/line_clear', actual: names(lock), pan: lockEvents[0].pan });

  // ---- B: P2 keyboard, pan +0.95 -----------------------------------------
  await check(page, 'B1', 'move', P2_PAN, () => tapKey(page, 'ArrowLeft', 70));
  await check(page, 'B2', 'move', P2_PAN, () => tapKey(page, 'ArrowRight', 70));
  await check(page, 'B3', 'soft_drop', P2_PAN, () => tapKey(page, 'ArrowDown', 70));
  await check(page, 'B4', 'rotate', P2_PAN, () => page.keyboard.press(']'));

  lock = await lockPiece(page, 1);
  lockEvents = lock.filter((e) => e.name === 'piece_lock' || e.name === 'line_clear');
  expect(lockEvents.length, 'B5: one P2 lock sound').toBeGreaterThanOrEqual(1);
  expect(lockEvents[0].pan ?? 0, 'B5: P2 lock pan').toBeCloseTo(P2_PAN, 2);
  rows.push({ id: 'B5', expected: 'piece_lock/line_clear', actual: names(lock), pan: lockEvents[0].pan });

  // ---- C: gamepad paths ---------------------------------------------------
  // Pad 0 = P1, pad 1 = P2. A shared move/soft-drop per pad.
  await check(page, 'C1', 'move', P1_PAN, () => tapPad(page, 0, { buttons: [BTN.LEFT] }, 100));
  await check(page, 'C2', 'soft_drop', P1_PAN, () => tapPad(page, 0, { buttons: [BTN.DOWN] }, 100));
  await check(page, 'C3', 'move', P2_PAN, () => tapPad(page, 1, { buttons: [BTN.LEFT] }, 100));
  await check(page, 'C4', 'soft_drop', P2_PAN, () => tapPad(page, 1, { buttons: [BTN.A] }, 100));

  await page.screenshot({ path: `${REPORTS}/${RUN}-play.png` });
  writeFileSync(
    `${REPORTS}/${RUN}-panning.json`,
    JSON.stringify({ case: 'TC-012', runId: RUN, rows, at: new Date().toISOString() }, null, 2),
  );
});
