# TC-001 — Start game by mouse-clicking the "Start" menu item

- **Area:** Main menu / input
- **Priority:** Medium
- **Spec pin:** `specs/03-input-and-controls.md` §"Menu selection model (Option B)" @ `da49ce6` — "Enter (keyboard) / A (gamepad) / click activates the selected item"; mouse is supported in menus (`§Input Capture Policy`).
- **Spec:** `tests/e2e/tc-001-start-click.spec.ts` — `npm run test TC-001`

## Must hold

- One left click on the "Start" label starts the match: `screen` goes `menu` → `countdown` → `play`, the same result as `Enter` on the highlighted item.
- The frame counter rises across the transition, so the play screen is actually painted, not just switched in state.
- Content proof: the green menu label disappears (0 px) and the P1 board area is populated.
- Click coordinates are computed from the label's drawn bounding box, not hard-coded, so the 1920×1080 → CSS scaling cannot silently break the click.

## Notes

- Regression guard for mouse support: runs 1–2 failed while `Enter` on the same menu still worked.
- The `Enter` path runs as a control inside the same spec, so a mouse-only break is distinguishable from a general breakage.
- State comes from the read-only `?e2e=1` hook (`screen`, `menuIndex`, `frame`); `harness.spec.ts` guards that it stays absent without the flag and cannot be written.
- Root cause is out of scope for this asset.

## Can it fail

Disabling the click handler in `handleMouseClick` fails the click test while the `Enter` control still passes — the same split as runs 1–2. Restored afterwards.

## History

| Run | Date | Result | Failure |
|---|---|---|---|
| 1–2 | 2026-11-23 | FAIL | click did nothing (non-background pixels 15,566 → 15,525); green "Start" still drawn; `Enter` started the game |

Last automated run: run 4, PASS (2026-11-24) — evidence `tests/reports/TC-001/run4-*`.
