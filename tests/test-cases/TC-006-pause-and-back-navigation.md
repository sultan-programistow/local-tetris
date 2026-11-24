# TC-006 — Pause and back navigation (Esc / Start / B / Select)

- **Area:** Menus / navigation / input
- **Priority:** High
- **Spec pin:** `specs/03-input-and-controls.md` §"Pause (removed)" and §"Gamepad" @ `10aa6a0`; `specs/04-screens-and-ui.md` §"Main Menu", §"Play Screen", §"Game Over Screen" @ `db1a953`.
- **Spec:** `tests/e2e/tc-006-pause-and-back-navigation.spec.ts` — `npm run test TC-006`

## Must hold

- `Esc` or gamepad `Start` during play opens the Main Menu over a **paused** game: pieces do not move, no separate pause screen appears.
- First menu item reads "Resume" when opened from a game, "Start" otherwise.
- `Esc`, `Enter`, gamepad `A`, `B`, `Select` and a mouse click on Resume all return to play.
- On Game Over, `Esc`, `B` and `Select` each return to the Main Menu; Restart and Main Menu stay explicit options.

## Notes

- Menu state, item list and the frozen board come from the `?e2e=1` hook: player pieces and piece counts must be identical across a 900 ms menu visit **while the frame counter keeps rising**, so a frozen page cannot pass.
- Game Over is reached by holding soft drop on both mocked pads, which tops out both stacks in ~7–9 s; the three back keys are checked on three separate matches.
- Mouse Resume is covered; the gamepad is a standard-mapping mock (no physical pad).
- Root cause is out of scope for this asset.

## Can it fail

Dropping `Select` from the back-button handling fails both the paused-menu Select resume and the Game Over Select path. Restored afterwards.

## History

| Run | Date | Result | Failure |
|---|---|---|---|
| 1 | 2026-11-23 | FAIL | gamepad `Start` did not open the menu; `B` and `Select` did not resume or return from Game Over (checks 2–5, 9) |
| 2 | 2026-11-23 | FAIL | after the `Start` fix `82b1d18`, checks 2–3 passed; `B`/`Select` still failed (fixed in `5bd2de2`) |

Last automated run: run 4, PASS (2026-11-24) — evidence `tests/reports/TC-006/run4-results.json`.
