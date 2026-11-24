# TC-002 — Mouse hover updates the menu selection (single highlight)

- **Area:** Main menu / input
- **Priority:** Medium
- **Spec pin:** `specs/03-input-and-controls.md` §"Menu selection model (Option B)" @ `da49ce6` — "Mouse hover UPDATES the keyboard selection (hovered item becomes the selected item)"; "Enter / A / click activates the selected item".
- **Spec:** `tests/e2e/tc-002-hover-selection.spec.ts` — `npm run test TC-002`

## Must hold

- Exactly one menu item is selected (green) at any time.
- Hover moves the selection; there is no separate hover style.
- Moving the pointer off the items keeps the last selection.
- `Enter`, gamepad `A` and a click activate the selected item — including a click on an item that was not selected before.
- Gamepad path: hovering "Stats" and pressing pad 0 `A` opens the Stats screen.

## Notes

- The highlight is counted per menu row band, so two green rows fail the case; a global green total would not catch the original bug.
- Expected sequences are from the menu order Start → Stats → Volume → Controls.
- Gamepad is a standard-mapping mock installed before page load (no physical pad).
- Decision: Option B (relayed via Orchestrator, 2026-11-23).
- Mutation checks are recorded below; root cause is out of scope.

## Can it fail

Removing `menuIndex = i` from `updateHover` fails step 3 (hover no longer selects); disabling the gamepad `activate` branch fails the gamepad step. Both restored afterwards.

## History

| Run | Date | Result | Failure |
|---|---|---|---|
| 1–3 | 2026-11-23 | FAIL | dual highlight — two rows green at once; hover did not move the selection while `Enter` still activated the keyboard selection |

Last automated run: run 6, PASS (2026-11-24) — evidence `tests/reports/TC-002/run6-*`.
