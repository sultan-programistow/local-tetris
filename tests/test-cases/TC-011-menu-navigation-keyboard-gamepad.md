# TC-011 — Menu navigation and activation: keyboard, D-pad, left stick

- **Area:** Menus / input / navigation
- **Priority:** High
- **Spec pin:** `specs/03-input-and-controls.md` §"Keyboard" and §"Menu navigation" @ `8b4c2ef`, §"Menu navigation (gamepad)" @ `ceabcd2`; `specs/04-screens-and-ui.md` §"Main Menu" / §"Game Over" @ `8b4c2ef`.
- **Spec:** `tests/e2e/tc-011-menu-navigation-keyboard-gamepad.spec.ts` — `npm run test TC-011`

## Must hold

- One discrete press moves the selection by one item, for arrows, `W`/`S` (case-insensitive, incl. Shift), D-pad and left stick, in both directions.
- The selection wraps at both ends: Start → Stats → Volume → Controls → Start, and back.
- `Enter`, `Space` and gamepad `A` activate the highlighted item.
- `Esc` and `B` go back from a sub-screen, and resume a game-paused menu.
- `←`, `→` and `x` on the main menu do not move the selection.

## Notes

- `screen` and `menuIndex` are asserted from the `?e2e=1` hook, so a highlight that moves without the app agreeing fails.
- Expected order: Start → Stats → Volume → Controls; the paused menu adds Resume first.
- Gamepad is a standard-mapping mock: D-pad 12/13, `A` 0, `B` 1, left stick `axes[1]` ±0.9 for 150 ms.
- Root cause is out of scope for this asset.

## Can it fail

Making the menu down-handler case-sensitive again (dropping `S`) fails the Shift+S step. Restored afterwards.

## History

| Run | Date | Result | Failure |
|---|---|---|---|
| 2 | 2026-11-24 | FAIL | `Shift+S` did not navigate down (fixed in `a45c99b`, spec wording aligned in `8b4c2ef`) |

Last automated run: run 5, PASS (2026-11-24) — evidence `tests/reports/TC-011/run5-timeline.json`.
