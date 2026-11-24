/**
 * TC-002 — Mouse hover updates the menu selection (single highlight).
 * Case of record: tests/test-cases/TC-002-mouse-hover-vs-keyboard-menu-selection.md
 *
 * Option B: exactly one item is selected at a time; hover moves the selection;
 * leaving the menu keeps the last selection; Enter and click activate it.
 */
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { menuRowGreen, state, toCss } from './helpers/canvas';
import { BTN, installGamepads, tapPad } from './helpers/app';

const REPORTS = 'tests/reports/TC-002';

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

/** Menu rows: label baseline 400 + 60·i, hit area x 800-1120, y-30..y+10. */
const MENU = {
  Start: { x: 960, y: 388 },
  Stats: { x: 960, y: 448 },
  Volume: { x: 960, y: 508 },
  Controls: { x: 960, y: 568 },
  away: { x: 960, y: 820 },
};
const ROW = { Start: 0, Stats: 1, Volume: 2, Controls: 3 };

/** Exactly the row at `index` is green, every other row is clear. */
function onlyGreen(rows: number[], index: number) {
  const others = rows.reduce((a, b) => a + b, 0) - rows[index];
  return rows[index] > 150 && others < 20;
}

/** Selection state and drawn highlight agree on `index`. */
async function selectionIs(page: Page, index: number) {
  const s = await state(page);
  const rows = await menuRowGreen(page);
  return s?.menuIndex === index && onlyGreen(rows, index);
}

async function hover(page: Page, point: { x: number; y: number }) {
  const p = await toCss(page, point.x, point.y);
  await page.mouse.move(p.x, p.y);
}

test('TC-002 — hover moves the single menu highlight', async ({ page }) => {
  const log: unknown[] = [];
  const snap = async (step: string) => {
    log.push({ step, state: await state(page), rows: await menuRowGreen(page) });
  };

  await installGamepads(page);
  await page.goto('/?e2e=1');
  await expect.poll(() => selectionIs(page, ROW.Start), { timeout: 10_000 }).toBe(true);
  await snap('1 initial');
  await page.screenshot({ path: `${REPORTS}/${RUN}-start-selected.png` });

  // 2. ArrowDown -> Stats, only Stats green
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => selectionIs(page, ROW.Stats), { timeout: 2_000 }).toBe(true);
  await snap('2 ArrowDown');
  await page.screenshot({ path: `${REPORTS}/${RUN}-keyboard-stats.png` });

  // 3. Hover Start -> Start selected, Stats no longer green
  await hover(page, MENU.Start);
  await expect.poll(() => selectionIs(page, ROW.Start), { timeout: 2_000 }).toBe(true);
  await snap('3 hover Start');
  await page.screenshot({ path: `${REPORTS}/${RUN}-hover-start.png` });

  // 4. Hover Volume -> Volume selected, only Volume green
  await hover(page, MENU.Volume);
  await expect.poll(() => selectionIs(page, ROW.Volume), { timeout: 2_000 }).toBe(true);
  await snap('4 hover Volume');
  await page.screenshot({ path: `${REPORTS}/${RUN}-hover-volume.png` });

  // 5. Pointer away -> selection stays on Volume
  await hover(page, MENU.away);
  await page.waitForTimeout(400);
  expect(await selectionIs(page, ROW.Volume), 'selection must persist after the pointer leaves').toBe(
    true,
  );
  await snap('5 pointer away');
  await page.screenshot({ path: `${REPORTS}/${RUN}-hover-away.png` });

  // 6. Hover Stats, Enter -> Stats screen
  await hover(page, MENU.Stats);
  await expect.poll(() => selectionIs(page, ROW.Stats)).toBe(true);
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await state(page))?.screen, { timeout: 2_000 }).toBe('stats');
  await snap('6 Enter on Stats');
  await page.screenshot({ path: `${REPORTS}/${RUN}-enter-stats.png` });

  // 7. Back to the menu, hover Controls and click -> Controls screen
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await state(page))?.screen, { timeout: 2_000 }).toBe('menu');
  await hover(page, MENU.Controls);
  await expect.poll(() => selectionIs(page, ROW.Controls)).toBe(true);
  const p = await toCss(page, MENU.Controls.x, MENU.Controls.y);
  await page.mouse.click(p.x, p.y);
  await expect.poll(async () => (await state(page))?.screen, { timeout: 2_000 }).toBe('controls');
  await snap('7 click Controls');
  await page.screenshot({ path: `${REPORTS}/${RUN}-click-controls.png` });

  // 8. Back to the menu, hover Stats, gamepad A -> Stats screen
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await state(page))?.screen, { timeout: 2_000 }).toBe('menu');
  await hover(page, MENU.Stats);
  await expect.poll(() => selectionIs(page, ROW.Stats)).toBe(true);
  await tapPad(page, 0, { buttons: [BTN.A] }, 150);
  await expect.poll(async () => (await state(page))?.screen, { timeout: 2_000 }).toBe('stats');
  await snap('8 gamepad A on Stats');
  await page.screenshot({ path: `${REPORTS}/${RUN}-gamepad-stats.png` });

  const result = {
    case: 'TC-002',
    runId: RUN,
    viewport: page.viewportSize(),
    steps: log,
    screenshots: [
      'start-selected',
      'keyboard-stats',
      'hover-start',
      'hover-volume',
      'hover-away',
      'enter-stats',
      'click-controls',
      'gamepad-stats',
    ].map((n) => `${REPORTS}/${RUN}-${n}.png`),
    at: new Date().toISOString(),
  };
  writeFileSync(`${REPORTS}/${RUN}-results.json`, JSON.stringify(result, null, 2));
});
