# TC-001 — Start game by mouse-clicking the "Start" menu item

- **Area:** Main menu / input
- **Priority:** Medium
- **Date run:** 2026-11-23
- **Environment:** Chromium (OpenBot browser), `http://localhost:5173`, dev server, viewport 1766×1102, canvas 1920×1080 (scaled)
- **Automated:** `tests/e2e/tc-001-start-click.spec.ts` — `npm run test TC-001`

## Preconditions

1. The app is running (`npm run dev`) at `http://localhost:5173`.
2. The main menu is shown (`LOCAL TETRIS` title, items: Start, Stats, Volume, Controls; "Start" highlighted green).

## Steps

1. Load `http://localhost:5173` and wait for the menu to render.
2. Locate the "Start" label (green text) on the canvas.
3. Move the mouse pointer over "Start" and left-click it once.
4. Observe the screen for ~1 s.

## Expected result

Clicking "Start" transitions from the main menu to the game screen (countdown, then play), i.e. the same result as pressing `Enter` on the highlighted menu item.

## Actual result

Run 3 (latest): clicking "Start" transitions to the game screen. Canvas non-background pixel count rises `15,566 → 43,498`, and the green menu label disappears (0 green px). Repeated after a fresh reload: `15,566 → 43,850`. See `tests/reports/TC-001/run3-*`.

Runs 1–2 (same day, before the app changed): the screen stayed on the main menu (`15,566 → 15,525`).

## Status

**PASS** (run 4, automated Playwright; manual run 3) — mouse click on "Start" starts the game. Runs 1–2 failed.

## Run history

| Run | Date | Result | Key evidence |
|---|---|---|---|
| 1 | 2026-11-23 | FAIL | pixels 15,566 → 15,525 after click; `Enter` → 43,896 |
| 2 | 2026-11-23 | FAIL | pixels 15,566 → 15,525 after click; green "Start" still present (405 px); `Enter` → 43,498 |
| 3 | 2026-11-23 | PASS | pixels 15,566 → 43,498 after click; green label gone; repeat 15,566 → 43,850 |
| 4 | 2026-11-24 | PASS (automated) | `npm run test TC-001` on production build at 1600×900: screen `menu` → `countdown` → `play`, frame counter 8 → 208, green label 567 → 0 px, non-background 15,932 → 89,780; `Enter` control identical |

## Notes / follow-up

- Root cause is out of scope for this test asset; handed to engineering for triage.
- Mouse support now works; this case is the regression guard for it.
- Keyboard path (`Enter` on highlighted item) passes.

## Evidence

- Menu screenshot (before, run 1): `tests/reports/TC-001/menu-before.png`
- Game screenshot (after `Enter`, run 1): `tests/reports/TC-001/game-after-enter.png`
- Run 2: `tests/reports/TC-001/run2-menu-before.png`, `run2-after-click.png`, `run2-after-enter.png`
- Run 3 (pass): `tests/reports/TC-001/run3-menu-before.png`, `run3-after-click.png`
- Run 4 (automated): `tests/reports/TC-001/run4-menu-before.png`, `run4-after-click.png`, `run4-play.png`, `run4-enter-play.png`, `run4-mouse-results.json`, `run4-keyboard-results.json`
- Start label pixel bounds (logical canvas): x 925–996, y 375–399; click landed at its center.

## Automation

`tests/e2e/tc-001-start-click.spec.ts`, run with `npm run test TC-001`. Started by the runner against the production build (`npm run build && vite preview`, port 4317), viewport 1600×900.

State comes from a read-only `?e2e=1` hook in `src/main.ts` (approved by Developer): `window.__tetris` exposes `screen`, `menuIndex` and a monotonic `frame` counter incremented in `draw()`. The hook is absent without the flag; `tests/e2e/harness.spec.ts` guards both properties. Canvas pixels are still checked (green selected label, P1 board area), so a state change without a painted frame fails.

The case has teeth: with the click handler disabled in `handleMouseClick` (temporary local mutation), the mouse test fails and the `Enter` control still passes — the same split as runs 1–2. Restored afterwards.
