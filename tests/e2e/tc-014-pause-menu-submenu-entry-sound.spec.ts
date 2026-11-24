/**
 * TC-014 — Submenu entry sound from the pause menu.
 * Case of record: tests/test-cases/TC-014-pause-menu-submenu-entry-sound.md
 *
 * Opening Stats, Volume or Controls from the pause menu plays exactly one entry sound
 * on keyboard, gamepad and mouse; going back plays menu_back and no entry sound.
 * The pause menu has five rows (Resume, Restart, Stats, Volume, Controls).
 */
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { BTN, installGamepads, pauseGame, startMatch, tapPad } from './helpers/app';
import { game } from './helpers/hook';
import { clearSfx, installAudioHook, names, step } from './helpers/audio';
import { toCss } from './helpers/canvas';

const REPORTS = 'tests/reports/TC-014';

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

/** Pause-menu rows: label baseline 400 + 60·i, hit area y-30..y+10. */
const ROW_Y = { Resume: 388, Restart: 448, Stats: 508, Volume: 568, Controls: 628 };
const INDEX = { Resume: 0, Restart: 1, Stats: 2, Volume: 3, Controls: 4 } as const;
type Item = keyof typeof INDEX;

function record(id: string, method: string, item: Item, actual: string[], screen: string) {
  rows.push({ id, method, item, actual, screen });
}

/** Highlight `item` in the pause menu with arrow keys. */
async function selectItem(page: Page, item: Item) {
  for (let i = 0; i < 6 && (await game(page)).menuIndex !== INDEX[item]; i++) {
    await page.keyboard.press('ArrowDown');
  }
  expect((await game(page)).menuIndex, `selection on ${item}`).toBe(INDEX[item]);
}

test('TC-014 — submenu entry sound from the pause menu', async ({ page }) => {
  test.setTimeout(120_000);
  await installAudioHook(page);
  await installGamepads(page);
  await page.goto('/?e2e=1');
  await page.mouse.click(5, 5);
  await startMatch(page);

  // Keyboard: Enter on each submenu item from the pause menu.
  const items: [Item, string, 'K1' | 'K2' | 'K3'][] = [
    ['Stats', 'stats', 'K1'],
    ['Volume', 'volume', 'K2'],
    ['Controls', 'controls', 'K3'],
  ];

  await pauseGame(page);
  for (const [item, screen, id] of items) {
    await selectItem(page, item);
    const ev = await step(page, () => page.keyboard.press('Enter'), 350);
    expect(names(ev), `${id} Enter on ${item}`).toHaveLength(1);
    expect((await game(page)).screen, `${id} ${item} screen`).toBe(screen);
    record(id, 'keyboard', item, names(ev), screen);
    await step(page, () => page.keyboard.press('Escape'), 300); // back for the next entry
  }

  // K4 — back from Controls plays menu_back and no entry sound.
  await selectItem(page, 'Controls');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await game(page)).screen).toBe('controls');
  const back = await step(page, () => page.keyboard.press('Escape'), 350);
  expect(names(back), 'K4 Esc back from Controls').toEqual(['menu_back']);
  expect((await game(page)).screen).toBe('menu');
  record('K4', 'keyboard', 'Controls', names(back), 'menu');

  // Gamepad A on each submenu item.
  const padIds = ['G1', 'G2', 'G3'] as const;
  for (let i = 0; i < items.length; i++) {
    const [item, screen] = items[i];
    await selectItem(page, item);
    const ev = await step(page, () => tapPad(page, 0, { buttons: [BTN.A] }, 150), 350);
    expect(names(ev), `${padIds[i]} A on ${item}`).toHaveLength(1);
    expect((await game(page)).screen, `${padIds[i]} ${item} screen`).toBe(screen);
    record(padIds[i], 'gamepad', item, names(ev), screen);
    await step(page, () => tapPad(page, 0, { buttons: [BTN.B] }, 150), 300);
  }

  // Mouse: hover the row (navigation, scored separately), then click it.
  const mouseIds = ['M1', 'M2', 'M3'] as const;
  for (let i = 0; i < items.length; i++) {
    const [item, screen] = items[i];
    const p = await toCss(page, 960, ROW_Y[item]);
    await page.mouse.move(p.x, p.y);
    await page.waitForTimeout(120); // hover may play menu_select; not part of the scored step
    await clearSfx(page);
    const ev = await step(page, () => page.mouse.click(p.x, p.y), 350);
    expect(names(ev), `${mouseIds[i]} click ${item}`).toHaveLength(1);
    expect((await game(page)).screen, `${mouseIds[i]} ${item} screen`).toBe(screen);
    record(mouseIds[i], 'mouse', item, names(ev), screen);
    await page.screenshot({ path: `${REPORTS}/${RUN}-mouse-${screen}.png` });
    await step(page, () => page.keyboard.press('Escape'), 300);
  }

  writeFileSync(
    `${REPORTS}/${RUN}-results.json`,
    JSON.stringify({ case: 'TC-014', runId: RUN, rows, at: new Date().toISOString() }, null, 2),
  );

  expect(rows.map((r) => r.id)).toEqual(['K1', 'K2', 'K3', 'K4', 'G1', 'G2', 'G3', 'M1', 'M2', 'M3']);
});
