# TC-001 — Start game by mouse-clicking the "Start" menu item

- **Area:** Main menu / input
- **Priority:** Medium
- **Date run:** 2026-11-23
- **Environment:** Chromium (OpenBot browser), `http://localhost:5173`, dev server, viewport 1766×1102, canvas 1920×1080 (scaled)

## Preconditions

1. The app is running (`npm run dev`) at `http://localhost:5173`.
2. The main menu is shown (`TETRIS DUEL` title, items: Start, Stats, Volume, Controls; "Start" highlighted green).

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

**PASS** (run 3) — mouse click on "Start" now starts the game. Runs 1–2 failed.

## Run history

| Run | Date | Result | Key evidence |
|---|---|---|---|
| 1 | 2026-11-23 | FAIL | pixels 15,566 → 15,525 after click; `Enter` → 43,896 |
| 2 | 2026-11-23 | FAIL | pixels 15,566 → 15,525 after click; green "Start" still present (405 px); `Enter` → 43,498 |
| 3 | 2026-11-23 | PASS | pixels 15,566 → 43,498 after click; green label gone; repeat 15,566 → 43,850 |

## Notes / follow-up

- Root cause is out of scope for this test asset; handed to engineering for triage.
- Mouse support now works; this case is the regression guard for it.
- Keyboard path (`Enter` on highlighted item) passes.

## Evidence

- Menu screenshot (before, run 1): `tests/reports/TC-001/menu-before.png`
- Game screenshot (after `Enter`, run 1): `tests/reports/TC-001/game-after-enter.png`
- Run 2: `tests/reports/TC-001/run2-menu-before.png`, `run2-after-click.png`, `run2-after-enter.png`
- Run 3 (pass): `tests/reports/TC-001/run3-menu-before.png`, `run3-after-click.png`
- Start label pixel bounds (logical canvas): x 925–996, y 375–399; click landed at its center.
