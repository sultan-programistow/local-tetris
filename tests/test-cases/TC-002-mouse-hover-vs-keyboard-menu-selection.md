# TC-002 — Mouse hover updates the menu selection (single highlight)

- **Area:** Main menu / input
- **Priority:** Medium
- **Date run:** 2026-11-23 (run 4: PASS)
- **Environment:** Chromium (OpenBot browser), `http://localhost:5173`, dev server, viewport 1766×1102, canvas 1920×1080 (scaled)
- **Spec:** `specs/03-input-and-controls.md` → "Menu selection model (Option B)"

## Preconditions

1. The app is running (`npm run dev`) at `http://localhost:5173`.
2. The main menu is shown (`TETRIS DUEL`; items Start, Stats, Volume, Controls).

## Expected behavior (Option B)

- Exactly **one** menu item is selected (green) at any time.
- Mouse hover **updates** the selection: the hovered item becomes the selected item; no separate hover style.
- Moving the pointer away does **not** revert the selection; the last hovered/keyboard item stays selected.
- `Enter` (keyboard), `A` (gamepad), or click activates the selected item.

## Steps

1. Load `http://localhost:5173` (Start is selected).
2. Press `ArrowDown` once → "Stats" is selected (green), and only "Stats" is green.
3. Move the mouse over "Start" (do not click) → "Start" becomes selected; "Stats" is no longer green.
4. Move the mouse over "Volume" → "Volume" becomes selected; only "Volume" is green.
5. Move the mouse to an empty area away from the menu → selection stays on the last item ("Volume").
6. Hover "Stats", then press `Enter` → the Stats screen opens.
7. Return to the menu and click a non-selected item → that item is activated.

## Actual result (run 4, post-implementation)

- `ArrowDown` → only "Stats" green (single selection).
- Hover "Start" → only "Start" green; "Stats" no longer green.
- Hover "Volume" → only "Volume" green.
- Pointer away → selection stays on the last hovered item ("Volume").
- `Enter` after hovering "Stats" → Stats screen opens (pixels 15,566 → 7,627).
- Click after hovering "Controls" → Controls screen opens (pixels → 17,221).

All steps pass.

## Status

**PASS** (run 4) — single selected item; hover moves the selection; selection persists; Enter/click activates.

## Run history

| Run | Date | Result | Key evidence |
|---|---|---|---|
| 1 | 2026-11-23 | FAIL | dual highlight (Start + Stats green) |
| 2 | 2026-11-23 | FAIL | dual highlight; Enter still activated keyboard selection |
| 3 | 2026-11-23 | FAIL | dual highlight (hover did not move selection) |
| 4 | 2026-11-23 | PASS | single highlight; hover moves selection; Enter/click activates |

## Evidence (run 4)

- `tests/reports/TC-002/run4-keyboard-stats.png` (keyboard selection on Stats)
- `tests/reports/TC-002/run4-hover-start.png` (hover Start → only Start green)
- `tests/reports/TC-002/run4-hover-away.png` (pointer away → selection stays)
- Pre-implementation baseline: `tests/reports/TC-002/keyboard-stats.png`, `hover-start-dual.png`

## Notes / follow-up

- Decision: Option B (relayed via Orchestrator, 2026-11-23).
- Gamepad path (`A` activates) not tested; no gamepad connected.
- Root cause is out of scope for this test asset.
