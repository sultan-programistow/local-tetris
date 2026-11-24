# TC-006 — Pause and back navigation (Esc / Start / B; Select inert)

- **Area:** Menus / navigation / input
- **Priority:** High
- **Spec pin:** `specs/03-input-and-controls.md` §"Pause (removed)" and §"Gamepad" @ `f21a997`; `specs/04-screens-and-ui.md` §"Main Menu", §"Play Screen", §"Game Over Screen" @ `db1a953`.
- **Spec:** `tests/e2e/tc-006-pause-and-back-navigation.spec.ts` — `npm run test TC-006`

## Must hold

- `Esc` or gamepad `Start` during play opens the Main Menu over a **paused** game: pieces do not move, no separate pause screen appears.
- First menu item reads "Resume" when opened from a game, "Start" otherwise.
- `Esc`, `Enter`, gamepad `A`, `B`, `Start` again and a mouse click on Resume all return to play.
- Gamepad `Select` is inert in menus: on the paused menu it does not resume, change the row or unfreeze the game; on Game Over it leaves the screen and selection unchanged.
- On Game Over, `Esc` and `B` return to the Main Menu; Restart and Main Menu stay explicit options.

## Notes

- Menu state, item list and the frozen board come from the `?e2e=1` hook: player pieces and piece counts must be identical across a 900 ms menu visit **while the frame counter keeps rising**, so a frozen page cannot pass.
- Game Over is reached by holding soft drop on both mocked pads, which tops out both stacks in ~7–9 s; `Esc` and `B` are checked on separate matches, and `Select` is checked both on a live paused menu and on Game Over.
- Mouse Resume is covered; the gamepad is a standard-mapping mock (no physical pad).
- Root cause is out of scope for this asset.

## Can it fail

A build that treats Select as back (the pre-change behaviour) fails step 5 (menu would close) and step 9b (screen would change); step 2 guards the gamepad `Start` branch.

## History

| Run | Date | Result | Failure |
|---|---|---|---|
| 1 | 2026-11-23 | FAIL | gamepad `Start` did not open the menu; `B` and `Select` did not resume or return from Game Over (checks 2–5, 9) |
| 2 | 2026-11-23 | FAIL | after the `Start` fix `82b1d18`, checks 2–3 passed; `B`/`Select` still failed (fixed in `5bd2de2`) |
| 6 | 2026-11-24 | PASS | 10 steps: Select inert on the paused menu and on Game Over, all resume paths and both Game Over back keys still pass |

Last automated run: run 6, PASS (2026-11-24) — evidence `tests/reports/TC-006/run6-results.json`.
