import type { Page } from '@playwright/test';

/**
 * Typed reader for the read-only `?e2e=1` state hook in src/main.ts.
 * Everything here is a plain copy: the app's own objects stay private.
 */

export type PlayerView = {
  x: number | null;
  y: number | null;
  type: string | null;
  rotation: number | null;
  next: string | null;
  score: number;
  pieces: number;
  over: boolean;
};

export type Hook = {
  screen: 'menu' | 'countdown' | 'play' | 'gameover' | 'stats' | 'controls' | 'volume';
  menuIndex: number;
  frame: number;
  menuItems: string[];
  gameOverIndex: number;
  volume: number;
  status: 'countdown' | 'playing' | 'paused' | 'gameover' | null;
  countdownMs: number | null;
  players: [PlayerView, PlayerView] | null;
};

export async function game(page: Page): Promise<Hook> {
  return page.evaluate(() => {
    const h = (window as unknown as { __tetris?: Record<string, unknown> }).__tetris;
    if (!h) throw new Error('?e2e=1 state hook missing');
    return {
      screen: h.screen,
      menuIndex: h.menuIndex,
      frame: h.frame,
      menuItems: h.menuItems,
      gameOverIndex: h.gameOverIndex,
      volume: h.volume,
      status: h.status,
      countdownMs: h.countdownMs,
      players: h.players,
    } as never;
  });
}
