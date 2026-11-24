/**
 * Guard for the ?e2e=1 test hook itself: absent in a normal page load, and
 * read-only when enabled. Not a product test case.
 */
import { test, expect } from '@playwright/test';
import { state } from './helpers/canvas';

test('test hook is absent without ?e2e=1', async ({ page }) => {
  await page.goto('/');
  await expect
    .poll(() => page.evaluate(() => typeof (window as unknown as { __tetris?: unknown }).__tetris))
    .toBe('undefined');
});

test('test hook is read-only with ?e2e=1', async ({ page }) => {
  await page.goto('/?e2e=1');
  await expect.poll(async () => (await state(page))?.frame ?? 0).toBeGreaterThan(0);

  const before = await state(page);
  expect(before?.screen).toBe('menu');

  await page.evaluate(() => {
    try {
      (window as unknown as { __tetris: { screen: string } }).__tetris.screen = 'play';
    } catch {
      /* frozen object: assignment throws in strict mode, which is fine */
    }
  });

  const after = await state(page);
  expect(after?.screen).toBe('menu');
  expect(after?.menuIndex).toBe(before?.menuIndex);
});
