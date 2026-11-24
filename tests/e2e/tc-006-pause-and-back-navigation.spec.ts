/**
 * TC-006 — Pause and back navigation (Esc / Start / B / Select).
 * Case of record: tests/test-cases/TC-006-pause-and-back-navigation.md
 *
 * Opening the menu over a live match pauses it (pieces frozen), the first item reads
 * "Resume", and every back path resumes: keyboard Esc/Enter on Resume, gamepad B,
 * Select, Start and A. Game Over returns to the Main Menu on Esc, B and Select.
 */
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { BTN, installGamepads, pauseGame, reachGameOver, startMatch, tapPad } from './helpers/app';
import { game } from './helpers/hook';

const REPORTS = 'tests/reports/TC-006';

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
const steps: Record<string, unknown>[] = [];

async function snap(page: Page, id: string, observed: string) {
  const s = await game(page);
  steps.push({ id, observed, screen: s.screen, status: s.status, menuIndex: s.menuIndex, items: s.menuItems });
  return s;
}

async function writeReport(extra: Record<string, unknown>) {
  writeFileSync(
    `${REPORTS}/${RUN}-results.json`,
    JSON.stringify(
      { case: 'TC-006', runId: RUN, steps, ...extra, at: new Date().toISOString() },
      null,
      2,
    ),
  );
}

test('TC-006 — Esc pauses the match and every keyboard path resumes it', async ({ page }) => {
  test.setTimeout(60_000);
  await installGamepads(page);
  await page.goto('/?e2e=1');
  await startMatch(page);

  const before = await game(page);
  expect(before.status).toBe('playing');

  // 1/4/7 — Esc opens the Main Menu, paused, first item "Resume", selection on it.
  let s = await snap(page, '1', 'Esc in play opens the pause menu');
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await game(page)).screen).toBe('menu');
  s = await snap(page, '1', 'Esc in play opens the pause menu');
  expect(s.status).toBe('paused');
  expect(s.menuItems).toEqual(['Resume', 'Restart', 'Stats', 'Volume', 'Controls']);
  expect(s.menuIndex).toBe(0);

  // 1 — the game is frozen while the menu is open, but the page keeps drawing.
  const f1 = (await game(page)).frame;
  const frozenA = (await game(page)).players;
  await page.waitForTimeout(900);
  const after = await game(page);
  expect(after.players).toEqual(frozenA);
  expect(after.frame).toBeGreaterThan(f1);
  await page.screenshot({ path: `${REPORTS}/${RUN}-pause-menu.png` });

  // 3 — Esc on the paused Main Menu resumes play.
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await game(page)).screen).toBe('play');
  expect((await game(page)).status).toBe('playing');
  await snap(page, '3', 'Esc on the paused menu resumes play');

  // 6 — Enter on "Resume" resumes play.
  await pauseGame(page);
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await game(page)).screen).toBe('play');
  await snap(page, '6a', 'Enter on Resume resumes play');

  // 6 — gamepad A on "Resume" resumes play.
  await pauseGame(page);
  await tapPad(page, 0, { buttons: [BTN.A] }, 140);
  await expect.poll(async () => (await game(page)).screen).toBe('play');
  await snap(page, '6b', 'gamepad A on Resume resumes play');
  await page.screenshot({ path: `${REPORTS}/${RUN}-resumed.png` });

  await writeReport({});
});

test('TC-006 — gamepad Start pauses, B and Select resume', async ({ page }) => {
  test.setTimeout(60_000);
  await installGamepads(page);
  await page.goto('/?e2e=1');
  await startMatch(page);

  // 2 — Start in play opens the same paused menu as Esc.
  await tapPad(page, 0, { buttons: [BTN.START] }, 150);
  await expect.poll(async () => (await game(page)).screen).toBe('menu');
  let s = await snap(page, '2', 'gamepad Start in play opens the pause menu');
  expect(s.status).toBe('paused');
  expect(s.menuItems[0]).toBe('Resume');
  await page.waitForTimeout(400); // Start released: the menu stays open
  expect((await game(page)).screen).toBe('menu');

  // 4 — B resumes.
  await tapPad(page, 0, { buttons: [BTN.B] }, 150);
  await expect.poll(async () => (await game(page)).screen).toBe('play');
  await snap(page, '4', 'gamepad B on the paused menu resumes play');

  // 5 — Select resumes.
  await tapPad(page, 0, { buttons: [BTN.START] }, 150);
  await expect.poll(async () => (await game(page)).screen).toBe('menu');
  await tapPad(page, 0, { buttons: [BTN.SELECT] }, 150);
  await expect.poll(async () => (await game(page)).screen).toBe('play');
  await snap(page, '5', 'gamepad Select on the paused menu resumes play');

  // 2 again — Start on "Resume" (after it opened the menu and was released) resumes.
  await tapPad(page, 0, { buttons: [BTN.START] }, 150);
  await expect.poll(async () => (await game(page)).screen).toBe('menu');
  await tapPad(page, 0, { buttons: [BTN.START] }, 150);
  await expect.poll(async () => (await game(page)).screen).toBe('play');
  await snap(page, '7', 'gamepad Start on Resume resumes play');

  await writeReport({});
});

test('TC-006 — Game Over returns to the Main Menu on Esc, B and Select', async ({ page }) => {
  test.setTimeout(120_000);
  await installGamepads(page);

  const timings: number[] = [];

  // 8 — Esc on Game Over -> Main Menu.
  await page.goto('/?e2e=1');
  await startMatch(page);
  const g1 = await reachGameOver(page);
  timings.push(g1.ms);
  await snap(page, '8a', 'match ended, Game Over shown');
  await page.screenshot({ path: `${REPORTS}/${RUN}-gameover.png` });
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await game(page)).screen).toBe('menu');
  await snap(page, '8', 'Esc on Game Over opens the Main Menu');

  // 9 — B on Game Over -> Main Menu.
  await page.keyboard.press('Enter'); // fresh match from the Main Menu
  await expect.poll(async () => (await game(page)).screen, { timeout: 15_000 }).toBe('play');
  const g2 = await reachGameOver(page);
  timings.push(g2.ms);
  const selectedAtStart = (await game(page)).gameOverIndex;
  await tapPad(page, 0, { buttons: [BTN.B] }, 150);
  await expect.poll(async () => (await game(page)).screen).toBe('menu');
  await snap(page, '9', 'gamepad B on Game Over opens the Main Menu');

  // 9 — Select on Game Over -> Main Menu.
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await game(page)).screen, { timeout: 15_000 }).toBe('play');
  const g3 = await reachGameOver(page);
  timings.push(g3.ms);
  await tapPad(page, 0, { buttons: [BTN.SELECT] }, 150);
  await expect.poll(async () => (await game(page)).screen).toBe('menu');
  await snap(page, '9b', 'gamepad Select on Game Over opens the Main Menu');
  await page.screenshot({ path: `${REPORTS}/${RUN}-back-at-menu.png` });

  await writeReport({ gameOverMs: timings, gameOverSelectionAtEntry: selectedAtStart });
});
