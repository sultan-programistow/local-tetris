# TC-012 — Sound panning: P1 left, P2 right, UI centred

- **Area:** Audio / stereo panning
- **Priority:** Medium
- **Spec pin:** `specs/05-audio-and-visuals.md` §"Sound Design (Panning)" @ `4d88126` — player sounds at 95% left for P1, 95% right for P2; menu/UI sounds centred (pan 0); Web Audio API.
- **Spec:** `tests/e2e/tc-012-sound-panning.spec.ts` — `npm run test TC-012`

## Must hold

- Every P1 sound sets `pan = −0.95`, every P2 sound `+0.95`, every menu/UI sound `0`.
- Player sounds: move, soft drop, rotate and piece lock for both players, on keyboard and gamepad.
- UI sounds: menu select, the three back keys, pause/unpause and the volume blip.
- Values are asserted to two decimals, because they arrive as float32 (`0.949999988079071`).

## Notes

- Pan is recorded from the `StereoPannerNode` the app sets, not from captured audio; nothing is listened to.
- Piece locks are produced by holding soft drop until the hook reports the piece count advanced, so a lock is a real lock, not a timed guess.
- Asset loading is not re-checked here: TC-010 D1 covers every declared file.
- **Not covered:** `line_clear` panning — no line was completed.
- **Open spec question:** `game_over` plays with the default (centred) pan, while the spec lists "game over for that player" among panned sounds and "global game over fanfare" as centred. Which one this call is, is a spec decision (Orchestrator), not scored here.
- Countdown has no sound at all, so its "centred" requirement is vacuous.
- Out of scope permanently: audibility, loudness, OS output route.
- Root cause is out of scope for this asset.

## Can it fail

Reverting the per-player pan to 0.85 fails the first player sound. Restored afterwards.

## History

No failures recorded. Run 1 verified the previous 85% value; run 2 (manual) and run 3 (automated) verified 95% — evidence `tests/reports/TC-012/run3-panning.json`.
