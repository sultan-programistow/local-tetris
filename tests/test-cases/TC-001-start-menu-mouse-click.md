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

The screen stays on the main menu. Canvas non-background pixel count is effectively unchanged before/after the click (`15,566` → `15,525`; the small delta is antialiasing, not a screen change).

For comparison, pressing `Enter` on the same highlighted item does transition: pixel count rises to `43,896` (countdown/play screen with both boards).

## Status

**FAIL** — mouse click on "Start" does not start the game.

## Notes / follow-up

- Root cause is out of scope for this test asset; handed to engineering for triage.
- Confirm with the user whether mouse support is in scope. If yes, re-run this case after the fix.
- Keyboard path (`Enter` on highlighted item) passes.

## Evidence

- Menu screenshot (before): `tests/reports/TC-001/menu-before.png`
- Game screenshot (after `Enter`): `tests/reports/TC-001/game-after-enter.png`
- Start label pixel bounds (logical canvas): x 925–996, y 375–399; click landed at its center.
