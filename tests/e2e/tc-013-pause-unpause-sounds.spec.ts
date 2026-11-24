/**
 * TC-013 — Pause and unpause sounds on every input path.
 * Case of record: tests/test-cases/TC-013-pause-unpause-sounds.md
 *
 * Opening the menu over a live match (or the countdown) plays `pause` exactly once,
 * and every resume path the app offers plays `unpause` exactly once:
 * keyboard Esc / Enter / Space, gamepad Start / A / B, and a mouse click on Resume.
 * Gamepad Select does nothing (spec 2026-11-24): it must stay silent and not resume.
 */
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { BTN, installGamepads, pauseGame, startMatch, tapPad } from './helpers/app';
import { game } from './helpers/hook';
import { installAudioHook, names, step } from './helpers/audio';
import { toCss } from './helpers/canvas';

const REPORTS = 'tests/reports/TC-013';

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

function record(id: string, expected: string[], actual: string[], screen: string, extra = {}) {
  rows.push({ id, expected, actual, screen, ...extra });
}

async function state(page: Page) {
  const s = await game(page);
  return { screen: s.screen, status: s.status, menuIndex: s.menuIndex };
}

test('TC-013 — pause and unpause sounds on every input path', async ({ page }) => {
  test.setTimeout(150_000);
  await installAudioHook(page);
  await installGamepads(page);
  await page.goto('/?e2e=1');
  await page.mouse.click(5, 5);
  await startMatch(page);

  // A1 — Esc in play.
  let ev = await step(page, () => page.keyboard.press('Escape'), 350);
  let s = await state(page);
  expect(names(ev), 'A1 Esc in play').toEqual(['pause']);
  expect(s).toMatchObject({ screen: 'menu', status: 'paused', menuIndex: 0 });
  record('A1', ['pause'], names(ev), s.screen);

  // B1 — Esc on the paused menu resumes.
  ev = await step(page, () => page.keyboard.press('Escape'), 350);
  s = await state(page);
  expect(names(ev), 'B1 Esc resume').toEqual(['unpause']);
  expect(s.screen).toBe('play');
  record('B1', ['unpause'], names(ev), s.screen);

  // B2 — Enter on Resume.
  await pauseGame(page);
  ev = await step(page, () => page.keyboard.press('Enter'), 350);
  s = await state(page);
  expect(names(ev), 'B2 Enter on Resume').toEqual(['unpause']);
  expect(s.screen).toBe('play');
  record('B2', ['unpause'], names(ev), s.screen);

  // B3 — Space on Resume.
  await pauseGame(page);
  ev = await step(page, () => page.keyboard.press(' '), 350);
  s = await state(page);
  expect(names(ev), 'B3 Space on Resume').toEqual(['unpause']);
  expect(s.screen).toBe('play');
  record('B3', ['unpause'], names(ev), s.screen);

  // A2 — Esc during the countdown (Restart from the pause menu).
  await pauseGame(page);
  await page.keyboard.press('ArrowDown'); // Restart
  expect((await game(page)).menuIndex).toBe(1);
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await game(page)).screen).toBe('countdown');
  ev = await step(page, () => page.keyboard.press('Escape'), 350);
  s = await state(page);
  expect(names(ev), 'A2 Esc in countdown').toEqual(['pause']);
  expect(s).toMatchObject({ screen: 'menu', status: 'paused' });
  record('A2', ['pause'], names(ev), s.screen);
  await page.screenshot({ path: `${REPORTS}/${RUN}-countdown-pause.png` });

  // Resume the countdown, then wait for play.
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await game(page)).screen, { timeout: 10_000 }).toBe('play');

  // A3 — gamepad Start in play (pad 0).
  ev = await step(page, () => tapPad(page, 0, { buttons: [BTN.START] }, 150), 350);
  s = await state(page);
  expect(names(ev), 'A3 pad0 Start').toEqual(['pause']);
  expect(s).toMatchObject({ screen: 'menu', status: 'paused' });
  record('A3', ['pause'], names(ev), s.screen);

  // B4 — gamepad A on Resume; the same press soft-drops once play resumes.
  ev = await step(page, () => tapPad(page, 0, { buttons: [BTN.A] }, 150), 400);
  s = await state(page);
  expect(names(ev)[0], 'B4 pad A resume').toBe('unpause');
  expect(names(ev).filter((n) => n === 'unpause')).toHaveLength(1);
  expect(s.screen).toBe('play');
  record('B4', ['unpause', '(soft_drop)'], names(ev), s.screen);

  // B5 — gamepad B on the paused menu.
  await tapPad(page, 0, { buttons: [BTN.START] }, 150);
  await expect.poll(async () => (await game(page)).screen).toBe('menu');
  ev = await step(page, () => tapPad(page, 0, { buttons: [BTN.B] }, 150), 350);
  s = await state(page);
  expect(names(ev), 'B5 pad B resume').toEqual(['unpause']);
  expect(s.screen).toBe('play');
  record('B5', ['unpause'], names(ev), s.screen);

  // B6 — gamepad Select on the paused menu: no longer a back path, so no unpause.
  await tapPad(page, 0, { buttons: [BTN.START] }, 150);
  await expect.poll(async () => (await game(page)).screen).toBe('menu');
  ev = await step(page, () => tapPad(page, 0, { buttons: [BTN.SELECT] }, 150), 350);
  s = await state(page);
  expect(names(ev), 'B6 pad Select is inert').toEqual([]);
  expect(s).toMatchObject({ screen: 'menu', status: 'paused' });
  record('B6', [], names(ev), s.screen);
  // Resume so the next group starts from play.
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await game(page)).screen).toBe('play');

  // A4 — gamepad 1 Start in play.
  ev = await step(page, () => tapPad(page, 1, { buttons: [BTN.START] }, 150), 350);
  s = await state(page);
  expect(names(ev), 'A4 pad1 Start').toEqual(['pause']);
  expect(s).toMatchObject({ screen: 'menu', status: 'paused' });
  record('A4', ['pause'], names(ev), s.screen);
  await page.screenshot({ path: `${REPORTS}/${RUN}-pause-menu.png` });

  // B7 — pad 0 Start opens the menu, then Start again on Resume resumes.
  await page.keyboard.press('Escape'); // resume for a clean play state
  await expect.poll(async () => (await game(page)).screen).toBe('play');
  await tapPad(page, 0, { buttons: [BTN.START] }, 150);
  await expect.poll(async () => (await game(page)).screen).toBe('menu');
  ev = await step(page, () => tapPad(page, 0, { buttons: [BTN.START] }, 150), 350);
  s = await state(page);
  expect(names(ev), 'B7 pad Start on Resume').toEqual(['unpause']);
  expect(s.screen).toBe('play');
  record('B7', ['unpause'], names(ev), s.screen);

  // B8 — mouse click on Resume (first row, y = 388).
  await pauseGame(page);
  const p = await toCss(page, 960, 388);
  await page.mouse.move(p.x, p.y); // hover: Resume is already selected, so silent
  await page.waitForTimeout(60);
  ev = await step(page, () => page.mouse.click(p.x, p.y), 350);
  s = await state(page);
  expect(names(ev), 'B8 mouse Resume').toEqual(['unpause']);
  expect(s.screen).toBe('play');
  record('B8', ['unpause'], names(ev), s.screen);
  await page.screenshot({ path: `${REPORTS}/${RUN}-resumed.png` });

  writeFileSync(
    `${REPORTS}/${RUN}-results.json`,
    JSON.stringify({ case: 'TC-013', runId: RUN, rows, at: new Date().toISOString() }, null, 2),
  );

  // All twelve paths of the case are covered.
  expect(rows.map((r) => r.id)).toEqual([
    'A1', 'B1', 'B2', 'B3', 'A2', 'A3', 'B4', 'B5', 'B6', 'A4', 'B7', 'B8',
  ]);
});
