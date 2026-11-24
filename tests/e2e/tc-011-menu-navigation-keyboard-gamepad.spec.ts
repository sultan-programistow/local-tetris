/**
 * TC-011 — Menu navigation and activation across keyboard, D-pad and left stick.
 * Case of record: tests/test-cases/TC-011-menu-navigation-keyboard-gamepad.md
 *
 * Every direction path moves exactly one item per discrete press and wraps at both
 * ends; Enter/Space/A activate the highlighted item; Esc/B return from a sub-screen
 * and from the game-paused menu. Selection comes from the ?e2e=1 hook (menuIndex),
 * the screen from the same hook, so a highlight that moves without the app agreeing fails.
 */
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { BTN, installGamepads, pauseGame, startMatch, tapPad } from './helpers/app';
import { game } from './helpers/hook';

const REPORTS = 'tests/reports/TC-011';

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

async function snap(page: Page, id: string, note = '') {
  const s = await game(page);
  steps.push({ id, note, screen: s.screen, menuIndex: s.menuIndex, items: s.menuItems });
  return s;
}

async function key(page: Page, k: string) {
  await page.keyboard.press(k);
  await page.waitForTimeout(40);
}

/** Walk a list of key presses and collect menuIndex after each one. */
async function walkKey(page: Page, k: string, times: number): Promise<number[]> {
  const out: number[] = [];
  for (let i = 0; i < times; i++) {
    await key(page, k);
    out.push((await game(page)).menuIndex);
  }
  return out;
}

async function walkPad(page: Page, input: { buttons?: number[]; ly?: number }, times: number): Promise<number[]> {
  const out: number[] = [];
  for (let i = 0; i < times; i++) {
    await tapPad(page, 0, input, 140);
    await page.waitForTimeout(40);
    out.push((await game(page)).menuIndex);
  }
  return out;
}

test('TC-011 — menu navigation and activation across input paths', async ({ page }) => {
  test.setTimeout(60_000);
  await installGamepads(page);
  await page.goto('/?e2e=1');
  await expect.poll(async () => (await game(page)).frame).toBeGreaterThan(0);
  const f0 = (await snap(page, 'start', 'fresh menu')).menuIndex;
  expect(f0).toBe(0);
  expect((await game(page)).menuItems).toEqual(['Start', 'Stats', 'Volume', 'Controls']);

  // K1/K2 — arrows wrap both ways (Start -> Stats -> Volume -> Controls -> Start).
  expect(await walkKey(page, 'ArrowDown', 4)).toEqual([1, 2, 3, 0]);
  await snap(page, 'K1', 'ArrowDown x4 wraps');
  expect(await walkKey(page, 'ArrowUp', 4)).toEqual([3, 2, 1, 0]);
  await snap(page, 'K2', 'ArrowUp x4 wraps');

  // K3 — s/w navigate the same way.
  expect(await walkKey(page, 's', 4)).toEqual([1, 2, 3, 0]);
  expect(await walkKey(page, 'w', 4)).toEqual([3, 2, 1, 0]);
  await snap(page, 'K3', 's x4 / w x4');

  // K13 — Shift held (capital letters) is case-insensitive per spec.
  expect(await walkKey(page, 'Shift+W', 2)).toEqual([3, 2]);
  expect(await walkKey(page, 'Shift+S', 2)).toEqual([3, 0]);
  await snap(page, 'K13', 'Shift+W x2, Shift+S x2');

  // K6 — left/right/x must not move the selection.
  await walkKey(page, 'ArrowDown', 0);
  for (const k of ['ArrowLeft', 'ArrowRight', 'x']) await key(page, k);
  expect((await game(page)).menuIndex).toBe(0);
  await snap(page, 'K6', 'left/right/x are negative controls');

  // K4 — Space on Volume opens the Volume screen; Esc returns with the selection kept.
  await key(page, 'ArrowDown');
  await key(page, 'ArrowDown');
  expect((await game(page)).menuIndex).toBe(2);
  await key(page, ' ');
  expect((await game(page)).screen).toBe('volume');
  await page.screenshot({ path: `${REPORTS}/${RUN}-space-volume.png` });
  await key(page, 'Escape');
  expect((await game(page)).screen).toBe('menu');
  expect((await game(page)).menuIndex).toBe(2);
  await snap(page, 'K4', 'Space opened Volume, Esc returned');

  // K5 — Enter on Controls opens Controls; Esc returns with the selection kept.
  await key(page, 'ArrowDown');
  await key(page, 'Enter');
  expect((await game(page)).screen).toBe('controls');
  await key(page, 'Escape');
  expect((await game(page)).screen).toBe('menu');
  expect((await game(page)).menuIndex).toBe(3);
  await snap(page, 'K5', 'Enter opened Controls, Esc returned');

  // K7 — D-pad down/up wrap the same way as the arrows.
  await key(page, 'ArrowUp'); // back to Start
  await key(page, 'ArrowUp');
  await key(page, 'ArrowUp');
  expect((await game(page)).menuIndex).toBe(0);
  expect(await walkPad(page, { buttons: [BTN.DOWN] }, 4)).toEqual([1, 2, 3, 0]);
  expect(await walkPad(page, { buttons: [BTN.UP] }, 4)).toEqual([3, 2, 1, 0]);
  await snap(page, 'K7', 'D-pad down x4 / up x4');

  // K8 — D-pad down x3 then A opens Controls; B returns to the menu with it selected.
  await walkPad(page, { buttons: [BTN.DOWN] }, 3);
  expect((await game(page)).menuIndex).toBe(3); // Controls
  await tapPad(page, 0, { buttons: [BTN.A] }, 140);
  await expect.poll(async () => (await game(page)).screen).toBe('controls');
  await tapPad(page, 0, { buttons: [BTN.B] }, 140);
  await expect.poll(async () => (await game(page)).screen).toBe('menu');
  expect((await game(page)).menuIndex).toBe(3);
  await snap(page, 'K8', 'D-pad down x3 + A opened Controls, B returned');

  // K9 — left stick up/down navigate like the D-pad, wrapping the same way.
  await key(page, 'Escape'); // no-op from the menu
  for (let i = 0; i < 4 && (await game(page)).menuIndex !== 0; i++) await key(page, 'ArrowUp');
  expect((await game(page)).menuIndex).toBe(0);
  expect(await walkPad(page, { ly: 0.9 }, 4)).toEqual([1, 2, 3, 0]);
  expect(await walkPad(page, { ly: -0.9 }, 4)).toEqual([3, 2, 1, 0]);
  await snap(page, 'K9', 'stick down x4 / up x4');

  // K10 — stick down x3 then A opens Controls; B returns.
  await walkPad(page, { ly: 0.9 }, 3);
  expect((await game(page)).menuIndex).toBe(3); // Controls
  await tapPad(page, 0, { buttons: [BTN.A] }, 140);
  await expect.poll(async () => (await game(page)).screen).toBe('controls');
  await tapPad(page, 0, { buttons: [BTN.B] }, 140);
  await expect.poll(async () => (await game(page)).screen).toBe('menu');
  expect((await game(page)).menuIndex).toBe(3);
  await snap(page, 'K10', 'stick down x3 + A opened Controls, B returned');

  // K11 — Esc in play opens the pause menu on Resume; Esc again resumes play.
  for (let i = 0; i < 4 && (await game(page)).menuIndex !== 0; i++) await key(page, 'ArrowUp');
  expect((await game(page)).menuIndex).toBe(0);
  await key(page, 'Enter');
  await expect.poll(async () => (await game(page)).screen, { timeout: 15_000 }).toBe('play');
  await pauseGame(page);
  let s = await snap(page, 'K11a', 'Esc in play -> pause menu');
  expect(s.menuItems[0]).toBe('Resume');
  expect(s.menuIndex).toBe(0);
  await key(page, 'Escape');
  await expect.poll(async () => (await game(page)).screen).toBe('play');
  await snap(page, 'K11b', 'Esc again resumed play');

  // K12 — B on the paused menu resumes play.
  await pauseGame(page);
  await tapPad(page, 0, { buttons: [BTN.B] }, 140);
  await expect.poll(async () => (await game(page)).screen).toBe('play');
  await snap(page, 'K12', 'gamepad B resumed play');
  await page.screenshot({ path: `${REPORTS}/${RUN}-resumed.png` });

  writeFileSync(
    `${REPORTS}/${RUN}-timeline.json`,
    JSON.stringify({ case: 'TC-011', runId: RUN, steps, at: new Date().toISOString() }, null, 2),
  );
});
