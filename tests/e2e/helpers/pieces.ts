import type { Page } from '@playwright/test';
import { game, type PlayerView } from './hook';

/**
 * Piece helpers for TC-007 / TC-008.
 *
 * Pieces are driven with real keyboard input: P1 with a/d/s, P2 with ArrowLeft/ArrowRight/ArrowDown.
 * Both players are moved to the same column and soft-dropped together, so neither stack
 * grows in one column (which would top out before ten pieces). The spawn table is read
 * from the ?e2e=1 hook at the moment each piece appears.
 */

/** Width in cells of each tetromino at spawn (for clamping the target column). */
const WIDTH: Record<string, number> = { I: 4, O: 2, T: 3, S: 3, Z: 3, J: 3, L: 3, 'Pento-X': 3 };

export const COLUMNS = [1, 3, 5, 7];

export type Spawn = {
  index: number;
  p1: string | null;
  p2: string | null;
  next1: string | null;
  next2: string | null;
  extra?: Record<string, unknown>;
};

/** Move both current pieces to `target` (clamped to the piece width), one cell per tap. */
async function moveTo(page: Page, target: number) {
  for (let guard = 0; guard < 10; guard++) {
    const s = await game(page);
    const p1 = s.players![0];
    const p2 = s.players![1];
    const width = WIDTH[p1.type ?? ''] ?? 3;
    const goal = Math.max(0, Math.min(target, 10 - width));
    if (p1.x === goal && p2.x === goal) return;
    const left = (p1.x ?? 3) > goal;
    await page.keyboard.press(left ? 'a' : 'd');
    await page.keyboard.press(left ? 'ArrowLeft' : 'ArrowRight');
    await page.waitForTimeout(25);
  }
}

/** Hold soft drop for both players until both pieces lock and new ones spawn. */
async function dropOne(page: Page, before: number) {
  await page.keyboard.down('s');
  await page.keyboard.down('ArrowDown');
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    const s = await game(page);
    if (s.players![0].pieces > before && s.players![1].pieces > before) break;
    await page.waitForTimeout(30);
  }
  await page.keyboard.up('s');
  await page.keyboard.up('ArrowDown');
  const s = await game(page);
  if (s.players![0].pieces <= before) throw new Error('piece did not lock in time');
}

/** Record the spawn `count` pieces, moving each to a spread-out column before dropping it. */
export async function spawnTable(
  page: Page,
  count: number,
  capture?: (index: number) => Promise<Record<string, unknown>>,
): Promise<Spawn[]> {
  const rows: Spawn[] = [];
  for (let i = 0; i < count; i++) {
    const s = await game(page);
    const [p1, p2] = s.players as [PlayerView, PlayerView];
    rows.push({
      index: i,
      p1: p1.type,
      p2: p2.type,
      next1: p1.next,
      next2: p2.next,
      extra: capture ? await capture(i) : undefined,
    });
    if (i === count - 1) break;
    await moveTo(page, COLUMNS[i % COLUMNS.length]);
    await dropOne(page, p1.pieces);
  }
  return rows;
}

export type Preview = {
  /** 4x4 grid of cell colours (null = empty). */
  colours: (string | null)[][];
  /** Trimmed shape as rows of 0/1. */
  shape: number[][];
  /** Piece type from the exact palette colour, or null. */
  type: string | null;
  /** Pixels of the 1 px #666 border found on the box outline. */
  borderPixels: number;
};

const PALETTE: Record<string, string> = {
  '00f0f0': 'I',
  f0f000: 'O',
  a000f0: 'T',
  '00f000': 'S',
  f00000: 'Z',
  '0000f0': 'J',
  f0a000: 'L',
};

/** Read a 4x4 next-piece preview box (cell size 20 px) at logical (ox, oy). */
export async function readPreview(page: Page, ox: number, oy: number): Promise<Preview> {
  return page.evaluate(
    ({ ox, oy }) => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      const hex = (r: number, g: number, b: number) =>
        [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
      const colours: (string | null)[][] = [];
      for (let r = 0; r < 4; r++) {
        const row: (string | null)[] = [];
        for (let c = 0; c < 4; c++) {
          const p = ctx.getImageData(ox + c * 20 + 10, oy + r * 20 + 10, 1, 1).data;
          // Empty cells are the page background (#0f1115); piece cells are flat palette colours.
          const empty = p[0] < 45 && p[1] < 45 && p[2] < 50;
          row.push(empty ? null : hex(p[0], p[1], p[2]));
        }
        colours.push(row);
      }
      // Trim empty outer rows/columns to get the drawn shape.
      const filled = colours.map((row) => row.map((c) => (c ? 1 : 0)));
      const nonEmptyRows = filled.map((r) => r.some(Boolean));
      const nonEmptyCols = filled[0].map((_, c) => filled.some((r) => r[c]));
      const r0 = nonEmptyRows.indexOf(true);
      const r1 = nonEmptyRows.lastIndexOf(true);
      const c0 = nonEmptyCols.indexOf(true);
      const c1 = nonEmptyCols.lastIndexOf(true);
      const shape =
        r0 < 0 ? [] : filled.slice(r0, r1 + 1).map((row) => row.slice(c0, c1 + 1));

      let borderPixels = 0;
      // A 1 px #666 stroke on integer coordinates antialiases to ~(58,59,61) on the dark
      // background, so count near-neutral grey rather than the exact #666 value.
      const isBorder = (r: number, g: number, b: number) =>
        r > 40 && r < 140 && Math.abs(r - g) < 8 && Math.abs(g - b) < 10;
      const edge = (x: number, y: number) => {
        const p = ctx.getImageData(x, y, 1, 1).data;
        if (isBorder(p[0], p[1], p[2])) borderPixels++;
      };
      for (let x = ox; x <= ox + 80; x++) {
        edge(x, oy);
        edge(x, oy + 80);
      }
      for (let y = oy; y <= oy + 80; y++) {
        edge(ox, y);
        edge(ox + 80, y);
      }
      return { colours, shape, type: null, borderPixels };
    },
    { ox, oy },
  );
}

/** Piece type implied by the preview's colours, or null when empty/mixed. */
export function previewType(p: Preview): string | null {
  const seen = new Set(p.colours.flat().filter((c): c is string => Boolean(c)));
  if (seen.size !== 1) return null;
  return PALETTE[[...seen][0]] ?? null;
}

/** Spawn-orientation shapes from src/game/pieces.ts. */
export const SPAWN_SHAPES: Record<string, number[][]> = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
};
