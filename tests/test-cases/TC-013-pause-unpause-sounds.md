# TC-013 — Pause and unpause sounds on every input path

- **Area:** Audio / pause / input paths
- **Priority:** Medium
- **Spec pin:** `specs/05-audio-and-visuals.md` §"Audio Events (SFX)" @ `962dc56` — "Pause/unpause" is a listed event with no input-path exception; input paths from `specs/03-input-and-controls.md` @ `8b4c2ef` / `ceabcd2`; gamepad Select is inert at `f21a997`.
- **Spec:** `tests/e2e/tc-013-pause-unpause-sounds.spec.ts` — `npm run test TC-013`

## Must hold

- Opening the menu over a live match or the countdown plays `pause` exactly once: keyboard `Esc`, gamepad `Start` on pad 0 and pad 1.
- Returning to play plays `unpause` exactly once on every resume path: `Esc`, `Enter`, `Space`, gamepad `A`, `B`, `Start` again, and a mouse click on Resume.
- Gamepad `Select` is inert: on the paused menu it plays nothing and the game stays paused.
- Each step also lands on the expected screen, so a silent path cannot pass as "nothing happened".
- "Play" is only counted once the countdown digit has left the screen.

## Notes

- Sounds come from the Web Audio hook (TC-010); each step clears the log, performs one input, waits 350 ms and asserts the exact file list.
- In the gamepad-`A` resume step the same press also reaches gameplay, so exactly one `unpause` followed by an optional `soft_drop` is expected — a property of the test input, not a second pause sound.
- The spec names no files; `pause.ogg` / `unpause.ogg` come from `src/audio.ts`.
- Not covered: pause from the Stats/Volume/Controls screens (they have no pause affordance; `Esc` there is back, TC-010).
- Out of scope permanently: audibility, loudness, OS output route.
- Root cause is out of scope for this asset.

## Can it fail

Removing the mouse-resume `unpause` play fails the mouse Resume step. Restored afterwards.

## History

| Run | Date | Result | Failure |
|---|---|---|---|
| 1 | 2026-11-24 | FAIL | 8/12 — silent `Esc` resume, silent gamepad `Start` pause on pads 0 and 1, silent mouse Resume; all fixed in `4616b7e` |
| 4 | 2026-11-24 | PASS | 12/12 after Select became inert: B6 expects no sound and a still-paused menu; the other 11 paths unchanged |

Last automated run: run 4, PASS (2026-11-24) — evidence `tests/reports/TC-013/run4-results.json`.
