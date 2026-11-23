# TC-002 — Mouse hover updates the menu selection (single highlight)

- **Area:** Main menu / input
- **Priority:** Medium
- **Date run:** 2026-11-23 (last observed run: pre-implementation)
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

## Actual result (last run, before implementation)

The pre-Option-B behavior was still present: keyboard selection stayed green and the hovered item was also drawn green, so two items appeared selected at once (e.g. "Start" + "Stats"). Pressing `Enter` activated the keyboard selection.

## Status

**PENDING** — spec updated to Option B; awaiting Developer implementation. Re-run after the change lands.

## Evidence (pre-implementation baseline)

- Keyboard selection on "Stats": `tests/reports/TC-002/keyboard-stats.png`
- Hover "Start" while "Stats" selected (dual highlight): `tests/reports/TC-002/hover-start-dual.png`

## Notes / follow-up

- Decision: Option B (relayed via Orchestrator, 2026-11-23).
- Gamepad path (`A` activates) not tested; no gamepad connected.
- Root cause is out of scope for this test asset.
