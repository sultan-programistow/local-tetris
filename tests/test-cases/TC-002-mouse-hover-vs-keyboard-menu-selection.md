# TC-002 — Mouse hover updates the menu selection (single highlight)

- **Area:** Main menu / input
- **Priority:** Medium
- **Date run:** 2026-11-24 (run 6: PASS, automated; manual run 4: PASS)
- **Environment:** Chromium (OpenBot browser), `http://localhost:5173`, dev server, viewport 1766×1102, canvas 1920×1080 (scaled)
- **Automated:** `tests/e2e/tc-002-hover-selection.spec.ts` — `npm run test TC-002`
- **Verification:** canvas pixel sampling (green pixels per menu band + total non-background pixels); no image input used
- **Spec:** `specs/03-input-and-controls.md` → "Menu selection model (Option B)"

## Preconditions

1. The app is running (`npm run dev`) at `http://localhost:5173`.
2. The main menu is shown (`LOCAL TETRIS`; items Start, Stats, Volume, Controls).

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

**PASS** (run 6, automated; manual run 4) — single selected item; hover moves the selection; selection persists; Enter, mouse click and gamepad A activate.

## Run history

| Run | Date | Result | Key evidence |
|---|---|---|---|
| 1 | 2026-11-23 | FAIL | dual highlight (Start + Stats green) |
| 2 | 2026-11-23 | FAIL | dual highlight; Enter still activated keyboard selection |
| 3 | 2026-11-23 | FAIL | dual highlight (hover did not move selection) |
| 4 | 2026-11-23 | PASS | single highlight; hover moves selection; Enter/click activates |
| 5 | 2026-11-24 | PASS (automated) | `npm run test TC-002`: every step one green row only (567/626 px); hover Start/Volume moves selection; pointer away keeps it; Enter opens Stats; click on Controls opens Controls |
| 6 | 2026-11-24 | PASS (automated) | adds the gamepad `A` path: hover Stats, press pad 0 `A`, Stats screen opens with one green row throughout |

## Evidence (run 4)

- `tests/reports/TC-002/run4-keyboard-stats.png` (keyboard selection on Stats)
- `tests/reports/TC-002/run4-hover-start.png` (hover Start → only Start green)
- `tests/reports/TC-002/run4-hover-away.png` (pointer away → selection stays)
- Pre-implementation baseline: `tests/reports/TC-002/keyboard-stats.png`, `hover-start-dual.png`

## Evidence (run 6, automated)

- `tests/reports/TC-002/run6-*.png` (one screenshot per step, including `run6-gamepad-stats.png`) and `run6-results.json` (state + per-row green counts after every step)

## Notes / follow-up

- Decision: Option B (relayed via Orchestrator, 2026-11-23).
- Gamepad path (`A` activates) is covered from run 6 with a standard-mapping pad mock (no physical pad attached).
- Root cause is out of scope for this test asset.

## Automation

`tests/e2e/tc-002-hover-selection.spec.ts`, run with `npm run test TC-002`, production build at 1600×900. State from the read-only `?e2e=1` hook (`screen`, `menuIndex`, `frame`); the highlight is checked per menu row band, so "exactly one green" is a real assertion, not a sum. Gamepad input comes from a standard-mapping mock installed before the page loads: hover Stats, then pad 0 `A` must open the Stats screen.

Mutation checks: with `menuIndex = i` removed from `updateHover` (hover no longer selects), the spec fails at step 3; with the gamepad `activate` branch disabled, it fails at step 8. Both restored afterwards.
