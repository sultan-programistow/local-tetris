/**
 * TC-008 — The next-piece preview shows the piece that actually spawns next.
 * Case of record: tests/test-cases/TC-008-next-piece-preview.md
 *
 * For each spawn the four 4x4 preview boxes are read from canvas pixels (exact palette
 * colours), compared with the hook's next piece, and then checked one spawn later
 * against the piece that actually appears. Colour, spawn orientation and both players'
 * agreement are all asserted; the box border is measured too. Two matches are played so
 * more of the seven tetrominoes are seen.
 */
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { startMatch } from './helpers/app';
import { game } from './helpers/hook';
import { previewType, readPreview, SPAWN_SHAPES, spawnTable, type Spawn } from './helpers/pieces';

const REPORTS = 'tests/reports/TC-008';

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
const P1_BOX = { x: 720, y: 40 };
const P2_BOX = { x: 1120, y: 40 };

type PreviewRead = {
  type1: string | null;
  type2: string | null;
  shape1: number[][];
  shape2: number[][];
  border1: number;
  border2: number;
  /** The hook's next piece at the same moment the boxes were drawn. */
  hookNext1: string | null;
  hookNext2: string | null;
};

/**
 * Read both preview boxes together with the hook value they should show.
 *
 * update() advances the game and draw() paints on a later frame, so the hook can
 * report a new `nextDef` while the canvas still shows the previous frame. Wait for a
 * drawn frame after the state read, then require the state to be unchanged across the
 * pixel read; otherwise retry.
 */
async function capture(page: Page): Promise<PreviewRead> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const h0 = await game(page);
    const f0 = h0.frame;
    await page
      .waitForFunction((f) => (window as any).__tetris.frame > f, f0, { timeout: 2_000 })
      .catch(() => undefined);
    const a = await readPreview(page, P1_BOX.x, P1_BOX.y);
    const b = await readPreview(page, P2_BOX.x, P2_BOX.y);
    const h1 = await game(page);
    const stable =
      h0.players![0].pieces === h1.players![0].pieces &&
      h0.players![1].pieces === h1.players![1].pieces &&
      h0.players![0].next === h1.players![0].next &&
      h0.players![1].next === h1.players![1].next;
    if (!stable) continue;
    return {
      type1: previewType(a),
      type2: previewType(b),
      shape1: a.shape,
      shape2: b.shape,
      border1: a.borderPixels,
      border2: b.borderPixels,
      hookNext1: h0.players![0].next,
      hookNext2: h0.players![1].next,
    };
  }
  throw new Error('preview boxes changed while being read');
}

/** Check one match: every preview equals the hook's next piece and the piece that follows. */
async function checkMatch(page: Page, count: number, label: string) {
  const rows = await spawnTable(page, count, async () => capture(page));
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as Spawn & { extra: PreviewRead };
    const p = row.extra;
    expect(p.type1, `${label} spawn ${i}: P1 preview colour -> type`).toBe(p.hookNext1);
    expect(p.type2, `${label} spawn ${i}: P2 preview colour -> type`).toBe(p.hookNext2);
    expect(p.hookNext1, `${label} spawn ${i}: hook next agrees with the row`).toBe(row.next1);
    expect(p.type1, `${label} spawn ${i}: both previews`).toBe(p.type2);
    expect(p.border1, `${label} spawn ${i}: P1 box border`).toBeGreaterThan(20);
    expect(p.border2, `${label} spawn ${i}: P2 box border`).toBeGreaterThan(20);

    if (p.hookNext1) {
      expect(p.shape1, `${label} spawn ${i}: P1 preview shape`).toEqual(SPAWN_SHAPES[p.hookNext1]);
      expect(p.shape2, `${label} spawn ${i}: P2 preview shape`).toEqual(SPAWN_SHAPES[p.hookNext1]);
    }

    if (i + 1 < rows.length) {
      expect(rows[i + 1].p1, `${label} spawn ${i} preview vs spawn ${i + 1} (P1)`).toBe(p.type1);
      expect(rows[i + 1].p2, `${label} spawn ${i} preview vs spawn ${i + 1} (P2)`).toBe(p.type1);
    }
  }
  return rows;
}

test('TC-008 — preview matches the next spawn on both boards', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/?e2e=1');

  // The box is drawn on the countdown but empty until the first spawn (nextDef is null).
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await game(page)).screen).toBe('countdown');
  const duringCountdown = await capture(page);
  expect(duringCountdown.type1).toBeNull();
  expect(duringCountdown.type2).toBeNull();
  expect(duringCountdown.border1).toBeGreaterThan(20);

  await expect.poll(async () => (await game(page)).screen, { timeout: 15_000 }).toBe('play');
  const match1 = await checkMatch(page, 8, 'match 1');

  // A fresh match: new seed, same expectations.
  await page.goto('/?e2e=1');
  await startMatch(page);
  const match2 = await checkMatch(page, 6, 'match 2');

  const seen = new Set<string>();
  for (const row of [...match1, ...match2]) {
    for (const t of [row.p1, row.next1]) if (t) seen.add(t);
  }

  await page.screenshot({ path: `${REPORTS}/${RUN}-previews.png` });
  writeFileSync(
    `${REPORTS}/${RUN}-preview.json`,
    JSON.stringify(
      {
        case: 'TC-008',
        runId: RUN,
        duringCountdown,
        match1,
        match2,
        distinctTypesSeen: [...seen].sort(),
        boxes: { p1: P1_BOX, p2: P2_BOX },
        at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  expect(match1.length + match2.length - 2).toBeGreaterThanOrEqual(6);
  // 14 spawns over 7 equally likely types; five distinct is a safe coverage floor.
  expect(seen.size).toBeGreaterThanOrEqual(5);
});
