/**
 * TC-010 — Menu navigation and movement sounds.
 * Case of record: tests/test-cases/TC-010-menu-navigation-sound.md
 *
 * Every listed action must play exactly one expected sound file and nothing else, on
 * the expected input path. Sounds are observed through the Web Audio hook (see
 * helpers/audio.ts): one record per BufferSource.start(), with its file name and pan.
 *
 * Groups: A menu selection (keyboard, gamepad, hover, submenu entry),
 *         B back keys, C gameplay move/soft drop, D asset load,
 *         E the Game Over menu (arrows, W/S, D-pad, hover, back keys).
 */
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { BTN, installGamepads, reachGameOver, startMatch, tapKey, tapPad } from './helpers/app';
import { game } from './helpers/hook';
import {
  clearSfx,
  fetchedSounds,
  installAudioHook,
  names,
  pans,
  sfx,
  SOUND_FILES,
  step,
  type Sfx,
} from './helpers/audio';
import { toCss } from './helpers/canvas';

const REPORTS = 'tests/reports/TC-010';

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

const MENU = { Start: 388, Stats: 448, Volume: 508, Controls: 568, empty: 820 };
const GAMEOVER = { Restart: 490, Stats: 550, 'Main Menu': 610 };

const rows: Record<string, unknown>[] = [];

function record(id: string, expected: string[], events: Sfx[], extra: Record<string, unknown> = {}) {
  rows.push({
    id,
    expected,
    actual: names(events),
    pans: pans(events),
    ...extra,
  });
}

/** Clear the log, run an action, and return what it played (250 ms is ample). */
async function soundOf(page: Page, action: () => Promise<void>, waitMs = 250) {
  return step(page, action, waitMs);
}

async function hover(page: Page, y: number, dx = 0) {
  const p = await toCss(page, 960 + dx, y);
  await page.mouse.move(p.x, p.y);
}

async function press(page: Page, key: string) {
  await page.keyboard.press(key);
}

/** Move the menu selection to `index` with ArrowUp presses (menu wraps). */
async function selectMenu(page: Page, index: number) {
  for (let i = 0; i < 5 && (await game(page)).menuIndex !== index; i++) await press(page, 'ArrowUp');
  expect((await game(page)).menuIndex).toBe(index);
}

test('TC-010 — menu navigation, back keys and movement sounds (A–D)', async ({ page }) => {
  test.setTimeout(120_000);
  await installAudioHook(page);
  const warnings: string[] = [];
  page.on('console', (m) => {
    if (m.text().includes('audio preload failed')) warnings.push(m.text());
  });
  await installGamepads(page);
  await page.goto('/?e2e=1');
  await expect.poll(async () => (await game(page)).frame).toBeGreaterThan(0);
  await page.mouse.click(5, 5); // trusted gesture for the audio context
  await page.waitForTimeout(300);

  // ---- Group A: menu selection -------------------------------------------
  await hover(page, MENU.Start);
  let ev = await soundOf(page, () => hover(page, MENU.Stats));
  expect(names(ev), 'A1 hover Start -> Stats').toEqual(['menu_select']);
  record('A1', ['menu_select'], ev);

  ev = await soundOf(page, () => hover(page, MENU.Stats, 1));
  expect(names(ev), 'A2 hover the same item again').toEqual([]);
  record('A2', [], ev);

  ev = await soundOf(page, () => hover(page, MENU.empty));
  expect(names(ev), 'A3 hover the empty row').toEqual([]);
  record('A3', [], ev);

  ev = await soundOf(page, () => hover(page, MENU.Start));
  expect(names(ev), 'A4 empty -> Start').toEqual(['menu_select']);
  record('A4', ['menu_select'], ev);

  ev = await soundOf(page, async () => {
    for (let i = 0; i < 4; i++) await press(page, 'ArrowDown');
  }, 350);
  expect(names(ev), 'A5 ArrowDown x4 wraps').toEqual(Array(4).fill('menu_select'));
  record('A5', Array(4).fill('menu_select'), ev, { menuIndex: (await game(page)).menuIndex });
  expect((await game(page)).menuIndex).toBe(0);

  ev = await soundOf(page, async () => {
    for (let i = 0; i < 4; i++) await press(page, 'ArrowUp');
  }, 350);
  expect(names(ev), 'A6 ArrowUp x4').toEqual(Array(4).fill('menu_select'));
  record('A6', Array(4).fill('menu_select'), ev);
  expect((await game(page)).menuIndex).toBe(0);

  ev = await soundOf(page, async () => {
    for (let i = 0; i < 3; i++) await tapPad(page, 0, { buttons: [BTN.DOWN] }, 120);
    for (let i = 0; i < 2; i++) await tapPad(page, 0, { buttons: [BTN.UP] }, 120);
  }, 350);
  expect(names(ev), 'A7 D-pad down x3, up x2').toEqual(Array(5).fill('menu_select'));
  record('A7', Array(5).fill('menu_select'), ev);

  ev = await soundOf(page, async () => {
    for (const k of ['s', 'Shift+S', 'w', 'Shift+W']) await press(page, k);
  }, 350);
  expect(names(ev), 'A8 s/Shift+S/w/Shift+W').toEqual(Array(4).fill('menu_select'));
  record('A8', Array(4).fill('menu_select'), ev);

  // A10 — Enter on each submenu item plays exactly one entry sound.
  for (const [item, index, screen] of [
    ['Stats', 1, 'stats'],
    ['Volume', 2, 'volume'],
    ['Controls', 3, 'controls'],
  ] as const) {
    await selectMenu(page, 0);
    for (let i = 0; i < index; i++) await press(page, 'ArrowDown');
    ev = await soundOf(page, () => press(page, 'Enter'));
    expect(names(ev), `A10 Enter on ${item}`).toHaveLength(1);
    record(`A10-${item}`, ['one entry sound'], ev, { sound: names(ev)[0] });
    expect((await game(page)).screen).toBe(screen);
    await soundOf(page, () => press(page, 'Escape')); // back to the menu, logged in group B
  }

  // A11 — gamepad A on Stats.
  await selectMenu(page, 0);
  await press(page, 'ArrowDown');
  ev = await soundOf(page, () => tapPad(page, 0, { buttons: [BTN.A] }, 120));
  expect(names(ev), 'A11 gamepad A on Stats').toHaveLength(1);
  record('A11', ['one entry sound'], ev, { sound: names(ev)[0] });
  expect((await game(page)).screen).toBe('stats');

  // ---- Group B: back keys ------------------------------------------------
  // From Stats (above): Esc back.
  ev = await soundOf(page, () => press(page, 'Escape'));
  expect(names(ev), 'B2 Esc from Stats').toEqual(['menu_back']);
  record('B2', ['menu_back'], ev);

  await selectMenu(page, 2);
  await press(page, 'Enter');
  ev = await soundOf(page, () => press(page, 'Escape'));
  expect(names(ev), 'B1 Esc from Volume').toEqual(['menu_back']);
  record('B1', ['menu_back'], ev);

  await selectMenu(page, 3);
  await press(page, 'Enter');
  ev = await soundOf(page, () => press(page, 'Escape'));
  expect(names(ev), 'B3 Esc from Controls').toEqual(['menu_back']);
  record('B3', ['menu_back'], ev);

  await selectMenu(page, 2);
  await press(page, 'Enter');
  ev = await soundOf(page, () => tapPad(page, 0, { buttons: [BTN.B] }, 120));
  expect(names(ev), 'B4 gamepad B from Volume').toEqual(['menu_back']);
  record('B4', ['menu_back'], ev);

  // ---- Group C: gameplay move / soft drop --------------------------------
  await selectMenu(page, 0);
  await press(page, 'Enter');
  await expect.poll(async () => (await game(page)).screen, { timeout: 15_000 }).toBe('play');

  const playSteps: [string, string, string][] = [
    ['C1', 'a', 'move'],
    ['C2', 'd', 'move'],
    ['C3', 's', 'soft_drop'],
    ['C4', 'ArrowDown', 'soft_drop'],
    ['C5', 'ArrowLeft', 'move'],
    ['C6', 'ArrowRight', 'move'],
    ['C7', 'ArrowDown', 'soft_drop'],
  ];
  for (const [id, key, expected] of playSteps) {
    ev = await soundOf(page, () => tapKey(page, key, 70), 240);
    expect(names(ev), `${id} ${key}`).toEqual([expected]);
    record(id, [expected], ev);
  }
  await page.screenshot({ path: `${REPORTS}/${RUN}-after-moves.png` });

  // ---- Group D: assets ---------------------------------------------------
  const fetched = await fetchedSounds(page);
  const statuses = await page.evaluate(async (files: string[]) => {
    const out: Record<string, number> = {};
    for (const f of files) {
      const r = await fetch(`sounds/${f}.ogg`);
      out[f] = r.status;
    }
    return out;
  }, SOUND_FILES);
  expect(Object.values(statuses).every((s) => s === 200), 'all sound files reachable').toBe(true);
  expect(new Set(fetched)).toEqual(new Set(SOUND_FILES));
  expect(warnings).toEqual([]);
  record('D1', ['11 assets fetched and decoded'], [], { fetched: [...new Set(fetched)].sort(), warnings });

  writeFileSync(
    `${REPORTS}/${RUN}-audio-results.json`,
    JSON.stringify({ case: 'TC-010', runId: RUN, rows, at: new Date().toISOString() }, null, 2),
  );

  // Group A must be complete: A1-A8 plus three keyboard and one gamepad submenu entry.
  expect(rows.filter((r) => String(r.id).startsWith('A')).length).toBe(12);
});

test('TC-010 — Game Over menu sounds (group E)', async ({ page }) => {
  test.setTimeout(150_000);
  await installAudioHook(page);
  await installGamepads(page);
  await page.goto('/?e2e=1');
  await page.mouse.click(5, 5);
  await startMatch(page);
  await reachGameOver(page);
  const baseline = await game(page);
  expect(baseline.screen).toBe('gameover');
  await clearSfx(page);
  await page.waitForTimeout(260); // game_over fanfare from entering the screen
  await clearSfx(page);
  const eRows: Record<string, unknown>[] = [];
  const eRecord = (id: string, expected: string[], observed: Sfx[], extra: Record<string, unknown> = {}) => {
    eRows.push({ id, expected, actual: names(observed), pans: pans(observed), ...extra });
  };

  // E1 ↓ -> Stats
  let ev = await soundOf(page, () => press(page, 'ArrowDown'));
  expect(names(ev), 'E1').toEqual(['menu_select']);
  eRecord('E1', ['menu_select'], ev, { index: (await game(page)).gameOverIndex });
  expect((await game(page)).gameOverIndex).toBe(1);

  // E2 ↓ -> Main Menu
  ev = await soundOf(page, () => press(page, 'ArrowDown'));
  expect(names(ev), 'E2').toEqual(['menu_select']);
  eRecord('E2', ['menu_select'], ev, { index: (await game(page)).gameOverIndex });
  expect((await game(page)).gameOverIndex).toBe(2);

  // E3 ↓ clamped at Main Menu
  ev = await soundOf(page, () => press(page, 'ArrowDown'));
  expect(names(ev), 'E3 clamped').toEqual([]);
  eRecord('E3', [], ev, { index: (await game(page)).gameOverIndex });

  // E4 ↑ -> Stats
  ev = await soundOf(page, () => press(page, 'ArrowUp'));
  expect(names(ev), 'E4').toEqual(['menu_select']);
  eRecord('E4', ['menu_select'], ev, { index: (await game(page)).gameOverIndex });

  // E5 ↑ -> Restart
  ev = await soundOf(page, () => press(page, 'ArrowUp'));
  expect(names(ev), 'E5').toEqual(['menu_select']);
  eRecord('E5', ['menu_select'], ev, { index: (await game(page)).gameOverIndex });
  expect((await game(page)).gameOverIndex).toBe(0);

  // E6 ↑ clamped at Restart
  ev = await soundOf(page, () => press(page, 'ArrowUp'));
  expect(names(ev), 'E6 clamped').toEqual([]);
  eRecord('E6', [], ev);

  // E7 s then w
  ev = await soundOf(page, async () => {
    await press(page, 's');
    await press(page, 'w');
  }, 320);
  expect(names(ev), 'E7 s/w').toEqual(['menu_select', 'menu_select']);
  eRecord('E7', ['menu_select', 'menu_select'], ev, { index: (await game(page)).gameOverIndex });

  // E8 D-pad ↓ x2, ↑ x1
  ev = await soundOf(page, async () => {
    await tapPad(page, 0, { buttons: [BTN.DOWN] }, 120);
    await tapPad(page, 0, { buttons: [BTN.DOWN] }, 120);
    await tapPad(page, 0, { buttons: [BTN.UP] }, 120);
  }, 350);
  expect(names(ev), 'E8 D-pad').toEqual(Array(3).fill('menu_select'));
  eRecord('E8', Array(3).fill('menu_select'), ev, { index: (await game(page)).gameOverIndex });

  // E9 ↑ to Restart, then hover Stats
  await press(page, 'ArrowUp');
  expect((await game(page)).gameOverIndex).toBe(0);
  ev = await soundOf(page, () => hover(page, GAMEOVER.Stats));
  expect(names(ev), 'E9 hover Stats').toEqual(['menu_select']);
  eRecord('E9', ['menu_select'], ev, { index: (await game(page)).gameOverIndex });
  expect((await game(page)).gameOverIndex).toBe(1);

  // E10 hover the same item again
  ev = await soundOf(page, () => hover(page, GAMEOVER.Stats, 1));
  expect(names(ev), 'E10 hover same').toEqual([]);
  eRecord('E10', [], ev);

  // E11 hover the empty area below the items
  ev = await soundOf(page, () => hover(page, 830));
  expect(names(ev), 'E11 hover empty').toEqual([]);
  eRecord('E11', [], ev);

  // E12 Esc -> Main Menu
  ev = await soundOf(page, () => press(page, 'Escape'));
  expect(names(ev), 'E12 Esc').toEqual(['menu_back']);
  eRecord('E12', ['menu_back'], ev);
  expect((await game(page)).screen).toBe('menu');

  writeFileSync(
    `${REPORTS}/${RUN}-gameover-audio-results.json`,
    JSON.stringify({ case: 'TC-010', group: 'E1-E12', runId: RUN, rows: eRows, at: new Date().toISOString() }, null, 2),
  );
});

test('TC-010 — Game Over returns on gamepad B with menu_back (E13)', async ({ page }) => {
  test.setTimeout(120_000);
  await installAudioHook(page);
  await installGamepads(page);
  await page.goto('/?e2e=1');
  await page.mouse.click(5, 5);
  await startMatch(page);
  await reachGameOver(page);
  await clearSfx(page);
  await page.waitForTimeout(260);
  await clearSfx(page);

  const ev = await soundOf(page, () => tapPad(page, 0, { buttons: [BTN.B] }, 120));
  expect(names(ev), 'E13 gamepad B').toEqual(['menu_back']);
  expect((await game(page)).screen).toBe('menu');

  writeFileSync(
    `${REPORTS}/${RUN}-gameover-B.json`,
    JSON.stringify(
      { case: 'TC-010', group: 'E13', runId: RUN, actual: names(ev), pans: pans(ev), at: new Date().toISOString() },
      null,
      2,
    ),
  );
});
