/**
 * TC-001 — Start game by mouse-clicking the "Start" menu item.
 * Case of record: tests/test-cases/TC-001-start-menu-mouse-click.md
 *
 * State comes from the read-only ?e2e=1 hook (screen, menuIndex, frame); the
 * canvas pixels are checked too, so a state change without a drawn frame fails.
 */
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { probe, state, toCss } from './helpers/canvas';

const REPORTS = 'tests/reports/TC-001';

/** Next free run number (run1.., matches the manual evidence naming), or TC_RUN_ID for CI. */
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

/** "Start" is row 0 of the menu: label baseline y=400, hit area x 800-1120, y 370-410. */
const START = { x: 960, y: 388 };

async function menuShown(page: Page) {
  const s = await state(page);
  const p = await probe(page);
  return s?.screen === 'menu' && s.frame > 0 && p.menuGreen > 150 && p.nonBg < 30_000;
}

/** Boards drawn and no menu label green: the countdown or play screen. */
async function gameShell(page: Page) {
  const s = await state(page);
  const p = await probe(page);
  return (
    (s?.screen === 'countdown' || s?.screen === 'play') &&
    p.p1Board > 5_000 &&
    p.menuGreen < 20
  );
}

async function record(
  page: Page,
  mode: string,
  probes: Record<string, unknown>,
  shots: string[],
) {
  const result = {
    case: 'TC-001',
    mode,
    runId: RUN,
    viewport: page.viewportSize(),
    probes,
    screenshots: shots,
    final: { state: await state(page), pixels: await probe(page) },
    at: new Date().toISOString(),
  };
  writeFileSync(`${REPORTS}/${RUN}-${mode}-results.json`, JSON.stringify(result, null, 2));
}

test('TC-001 — mouse click on "Start" starts the game', async ({ page }) => {
  await page.goto('/?e2e=1');
  await expect.poll(() => menuShown(page), { timeout: 10_000 }).toBe(true);

  const before = await state(page);
  const beforePixels = await probe(page);
  expect(before?.menuIndex, 'first menu item must be selected').toBe(0);
  const menuShot = `${REPORTS}/${RUN}-menu-before.png`;
  await page.screenshot({ path: menuShot });

  const pt = await toCss(page, START.x, START.y);
  await page.mouse.move(pt.x, pt.y);
  await page.mouse.click(pt.x, pt.y);

  await expect.poll(() => gameShell(page), { timeout: 5_000 }).toBe(true);
  const afterClick = await state(page);
  const afterPixels = await probe(page);
  expect(afterClick?.frame, 'canvas must keep drawing after the click').toBeGreaterThan(
    before!.frame,
  );
  expect(afterPixels.menuGreen, 'green menu label must be gone after the click').toBeLessThan(
    20,
  );
  const clickShot = `${REPORTS}/${RUN}-after-click.png`;
  await page.screenshot({ path: clickShot });

  await expect.poll(async () => (await state(page))?.screen, { timeout: 8_000 }).toBe('play');
  const playShot = `${REPORTS}/${RUN}-play.png`;
  await page.screenshot({ path: playShot });

  await record(
    page,
    'mouse',
    { before, beforePixels, afterClick, afterPixels },
    [menuShot, clickShot, playShot],
  );
});

test('TC-001 control — Enter on the highlighted item gives the same transition', async ({
  page,
}) => {
  await page.goto('/?e2e=1');
  await expect.poll(() => menuShown(page), { timeout: 10_000 }).toBe(true);

  await page.keyboard.press('Enter');

  await expect.poll(() => gameShell(page), { timeout: 5_000 }).toBe(true);
  const afterEnter = await state(page);
  const afterPixels = await probe(page);
  expect(afterPixels.menuGreen, 'green menu label must be gone after Enter').toBeLessThan(20);

  await expect.poll(async () => (await state(page))?.screen, { timeout: 8_000 }).toBe('play');
  const playShot = `${REPORTS}/${RUN}-enter-play.png`;
  await page.screenshot({ path: playShot });

  await record(page, 'keyboard', { afterEnter, afterPixels }, [playShot]);
});
