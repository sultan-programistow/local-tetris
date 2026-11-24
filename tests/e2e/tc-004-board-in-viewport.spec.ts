/**
 * TC-004 — Both board borders are inside the viewport.
 * Case of record: tests/test-cases/TC-004-board-border-in-viewport.md
 *
 * The board rectangle is measured from the drawn #ccc border (not from a hard-coded
 * cell size), mapped through the canvas's CSS scale, and compared with the viewport.
 * Checked at two window sizes because the historical failure was a cell-size change
 * that pushed the bottom border past the canvas.
 */
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { startMatch } from './helpers/app';

const REPORTS = 'tests/reports/TC-004';

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

type Bounds = { left: number; top: number; right: number; bottom: number };

type Geometry = {
  viewport: { w: number; h: number };
  canvas: Bounds & { w: number; h: number };
  boards: { id: string; logical: Bounds; css: Bounds; insideCanvas: boolean; insideViewport: boolean }[];
  borderPixel: { x: number; y: number; rgb: [number, number, number] };
};

/**
 * Measure each board's drawn border. The 2 px #ccc border is the only long, light-grey
 * horizontal/vertical line on the play screen: a row of the P1 half with >200 near-#ccc
 * pixels is a border row, a column of the board band with >800 is a border column.
 */
async function geometry(page: Page): Promise<Geometry> {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width / canvas.width;
    const grey = (r: number, g: number, b: number) =>
      r > 185 && r < 220 && Math.abs(r - g) < 8 && Math.abs(g - b) < 8;

    function measure(xFrom: number, xTo: number) {
      const w = xTo - xFrom;
      const { data } = ctx.getImageData(xFrom, 0, w, 1080);
      const rowCount = new Array(1080).fill(0);
      const colCount = new Array(w).fill(0);
      for (let y = 0; y < 1080; y++) {
        for (let x = 0; x < w; x++) {
          const p = (y * w + x) * 4;
          if (grey(data[p], data[p + 1], data[p + 2])) {
            rowCount[y]++;
            colCount[x]++;
          }
        }
      }
      const rows = rowCount.map((n, y) => (n > 200 ? y : -1)).filter((y) => y >= 0);
      const cols = colCount.map((n, x) => (n > 800 ? x : -1)).filter((x) => x >= 0);
      if (!rows.length || !cols.length) throw new Error('board border not drawn');
      return {
        left: xFrom + cols[0],
        right: xFrom + cols[cols.length - 1],
        top: rows[0],
        bottom: rows[rows.length - 1],
      } as Bounds;
    }

    const toCss = (b: Bounds): Bounds => ({
      left: rect.left + b.left * scale,
      top: rect.top + b.top * scale,
      right: rect.left + b.right * scale,
      bottom: rect.top + b.bottom * scale,
    });

    const canvasBox = {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      w: rect.width,
      h: rect.height,
    };
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const boards = [
      { id: 'P1', logical: measure(100, 900) },
      { id: 'P2', logical: measure(1000, 1850) },
    ].map((b) => {
      const css = toCss(b.logical);
      return {
        ...b,
        css,
        insideCanvas:
          css.left >= canvasBox.left &&
          css.top >= canvasBox.top &&
          css.right <= canvasBox.right &&
          css.bottom <= canvasBox.bottom,
        insideViewport: css.left >= 0 && css.top >= 0 && css.right <= vw && css.bottom <= vh,
      };
    });

    // Colour at the bottom border of the P1 board, a few cells in from the corner.
    const bx = Math.round((boards[0].logical.left + boards[0].logical.right) / 2);
    const by = boards[0].logical.bottom;
    const px = ctx.getImageData(bx, by, 1, 1).data;

    return {
      viewport: { w: vw, h: vh },
      canvas: canvasBox,
      boards,
      borderPixel: { x: bx, y: by, rgb: [px[0], px[1], px[2]] },
    };
  });
}

const SIZES = [
  { width: 1600, height: 900, label: '1600x900' },
  { width: 1366, height: 768, label: '1366x768' },
];

test('TC-004 — both board borders stay inside the viewport', async ({ page }) => {
  const results: Record<string, Geometry> = {};

  for (const size of SIZES) {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto('/?e2e=1');
    await startMatch(page);
    const g = await geometry(page);
    results[size.label] = g;

    expect(g.canvas.h, `canvas taller than the viewport at ${size.label}`).toBeLessThanOrEqual(
      g.viewport.h + 0.5,
    );
    expect(g.canvas.w, `canvas wider than the viewport at ${size.label}`).toBeLessThanOrEqual(
      g.viewport.w + 0.5,
    );

    for (const b of g.boards) {
      expect(b.insideCanvas, `${b.id} board outside the canvas at ${size.label}`).toBe(true);
      expect(b.insideViewport, `${b.id} board outside the viewport at ${size.label}`).toBe(true);
      // 10x20 cells: the measured border is twice as tall as it is wide, within 2 px.
      expect(Math.abs(b.logical.right - b.logical.left) * 2).toBeCloseTo(
        b.logical.bottom - b.logical.top,
        -1,
      );
    }

    const [r, gg, bb] = g.borderPixel.rgb;
    expect(r, `bottom border pixel at ${size.label}`).toBeGreaterThan(150);
    expect(Math.abs(r - gg)).toBeLessThanOrEqual(12);
    expect(Math.abs(gg - bb)).toBeLessThanOrEqual(12);

    await page.screenshot({
      path: `${REPORTS}/${RUN}-${size.label}-play.png`,
      fullPage: false,
    });
  }

  writeFileSync(
    `${REPORTS}/${RUN}-geometry.json`,
    JSON.stringify({ case: 'TC-004', runId: RUN, results, at: new Date().toISOString() }, null, 2),
  );
});
