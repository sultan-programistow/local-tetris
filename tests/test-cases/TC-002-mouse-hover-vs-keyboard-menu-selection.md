# TC-002 — Mouse hover must not clear the keyboard/gamepad menu selection

- **Area:** Main menu / input
- **Priority:** Medium
- **Date run:** 2026-11-23
- **Environment:** Chromium (OpenBot browser), `http://localhost:5173`, dev server, viewport 1766×1102, canvas 1920×1080 (scaled)

## Preconditions

1. The app is running (`npm run dev`) at `http://localhost:5173`.
2. The main menu is shown (`TETRIS DUEL`; items Start, Stats, Volume, Controls). The keyboard-selected item is rendered green.

## Steps

1. Load `http://localhost:5173` (Start is highlighted).
2. Press `ArrowDown` once → "Stats" becomes the keyboard-selected (green) item.
3. Move the mouse over "Start" (do not click).
4. Observe which menu items are highlighted.
5. Move the mouse over "Volume".
6. Move the mouse to an empty area away from the menu.
7. With "Stats" still keyboard-selected, hover "Start" and press `Enter`.

## Expected result

Moving the mouse must not clear or unhighlight the item selected by keyboard/gamepad. The keyboard selection stays highlighted regardless of pointer movement. (Whether the hovered item gets an additional hover style is a separate visual decision.)

## Actual result

The keyboard-selected item is **not** unhighlighted — "Stats" stays green in every step.

However, the hovered item is **also** drawn green, so two items appear highlighted at the same time:

| Step | Green items |
|---|---|
| After `ArrowDown` | Stats |
| Hover "Start" | Start **and** Stats |
| Hover "Volume" | Stats **and** Volume |
| Pointer away | Stats |
| Hover "Start", press `Enter` | Keyboard selection wins → Stats screen opens |

## Status

**PASS** — mouse hover does not unhighlight the keyboard/gamepad selection.

## Observation (for review, not a failure of this case)

Two menu items can show the same green "selected" style simultaneously (keyboard selection + mouse hover). If the design wants a single selected item, this is an ambiguity worth a design decision.

## Notes / follow-up

- Gamepad steering was not tested (no gamepad connected); keyboard path was.
- Root cause is out of scope for this test asset.

## Evidence

- Keyboard selection on "Stats": `tests/reports/TC-002/keyboard-stats.png`
- Hover "Start" while "Stats" selected (dual highlight): `tests/reports/TC-002/hover-start-dual.png`
