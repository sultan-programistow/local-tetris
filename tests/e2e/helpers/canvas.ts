import type { Page } from '@playwright/test';

/** The app draws to a fixed 1920x1080 canvas and scales it with CSS to fit the window. */
export const LOGICAL_W = 1920;
export const LOGICAL_H = 1080;

export type Probe = {
  /** Pixels differing from the #0f1115 background over the whole canvas. */
  nonBg: number;
  /** Green (#0f0) pixels in the menu-item band; the selected item is the only green text there. */
  menuGreen: number;
  /** Non-background pixels inside the P1 board area (200,40)-(680,1040). The menu draws nothing there. */
  p1Board: number;
  /** Non-background pixels where the countdown digit is drawn (880,430)-(1040,560); empty during play. */
  centerDigit: number;
};

/** Convert a logical canvas point to CSS pixels for the current scaled canvas. */
export async function toCss(page: Page, x: number, y: number) {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('canvas not found');
  return {
    x: box.x + (x / LOGICAL_W) * box.width,
    y: box.y + (y / LOGICAL_H) * box.height,
  };
}

/** Read the ?e2e=1 state hook. Null when the hook is absent (flag not set). */
export async function state(page: Page) {
  return page.evaluate(() => {
    const hook = (window as unknown as { __tetris?: { screen: string; menuIndex: number; frame: number } })
      .__tetris;
    return hook ? { screen: hook.screen, menuIndex: hook.menuIndex, frame: hook.frame } : null;
  });
}

/** Read the four canvas regions the menu/game checks rely on, in one pass inside the page. */
export async function probe(page: Page): Promise<Probe> {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) throw new Error('canvas not found');
    const ctx = canvas.getContext('2d')!;

    const count = (
      x: number,
      y: number,
      w: number,
      h: number,
      pred?: (r: number, g: number, b: number) => boolean,
    ) => {
      const { data } = ctx.getImageData(x, y, w, h);
      let n = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i],
          g = data[i + 1],
          b = data[i + 2];
        if (pred ? pred(r, g, b) : r > 28 || g > 30 || b > 34) n++;
      }
      return n;
    };

    return {
      nonBg: count(0, 0, 1920, 1080),
      menuGreen: count(700, 350, 520, 320, (r, g, b) => g > 180 && r < 90 && b < 90),
      p1Board: count(200, 40, 480, 1000),
      centerDigit: count(880, 430, 160, 130),
    };
  });
}

/** Green (#0f0) pixel count per menu row band, top to bottom (rows drawn at y = 400 + 60·i). */
export async function menuRowGreen(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) throw new Error('canvas not found');
    const ctx = canvas.getContext('2d')!;
    return [0, 1, 2, 3, 4].map((i) => {
      const { data } = ctx.getImageData(700, 370 + i * 60, 520, 40);
      let n = 0;
      for (let p = 0; p < data.length; p += 4) {
        if (data[p + 1] > 180 && data[p] < 90 && data[p + 2] < 90) n++;
      }
      return n;
    });
  });
}
