# TC-015 — Placement SFX suppressed when the placement ends the match

- **Area:** Audio / game over / top-out
- **Priority:** Medium
- **Date run:** 2026-11-24 (run 1: PASS, automated)
- **Automated:** `tests/e2e/tc-015-placement-sfx-suppressed-on-match-end.spec.ts` — `npm run test TC-015`
- **Spec:** `specs/05-audio-and-visuals.md` §"Audio Events (SFX)" — "Placement SFX (piece lock / line clear) is suppressed when the placed piece leaves both players topped out and ends the match; in that case only the Game over SFX plays."
- **Spec pin:** `specs/05-audio-and-visuals.md` §"Audio Events (SFX)" @ `8ef3a7c`
- **Behaviour under test:** a normal piece lock still plays `piece_lock`, but the lock that tops out the second player and ends the match plays no `piece_lock`/`line_clear` — `game_over` is the only placement-related sound at that moment.

## Preconditions

1. Production build of `8ef3a7c` (`npm run test` builds and serves it on `127.0.0.1:4317`), headless Chromium, 1600×900.
2. Volume `0.7` (default; non-zero, so `play()` is not short-circuited).
3. A trusted click on the page for AudioContext activation.
4. Two standard-mapping gamepads mocked through `navigator.getGamepads()` (pads 0 and 1), both holding `A` (soft drop) to top out quickly, same mock as TC-005/TC-009/TC-012/TC-013.

## Method

- The Web Audio hook runs before the app bundle: it tags each decoded buffer with its `sounds/<name>.ogg` file and records `{name, pan, time}` at `createBufferSource().start()`. It proves which sound the app played, not audibility.
- A1 (positive control): P1 soft-drops one piece with `S` until the piece counter advances; exactly one P1-panned `piece_lock` must be recorded, so the harness would notice a build that muted all placement sounds.
- A2: both pads hold `A` until the hook reports `screen === 'gameover'`. The hook is polled every 20 ms; the first top-out (player, piece counts) is recorded. The log is then searched for the last `game_over` event, and the 150 ms before it is checked for placement sounds. The lock delay is 500 ms, so a genuine earlier lock cannot fall inside that window.
- The check is deliberately a window, not an exact-count rule for the whole run: the surviving player may lock further pieces between the first and second top-out, and those normal locks must still sound.

## Sub-cases and results (run 1, `8ef3a7c`)

| # | Action | Expected | Actual | Status |
|---|---|---|---|---|
| A1 | P1 locks a piece in live play | one `piece_lock`, pan −0.95 | one `piece_lock`, pan −0.95 (pieces 0 → 1) | PASS |
| A2 | Both players top out; second top-out ends the match | no `piece_lock`/`line_clear` in the 150 ms before `game_over`; exactly one `game_over` | tail contains only `game_over` (pan 0); previous `piece_lock` was 508 ms before it; both players `over: true` | PASS |

**Run 1 result: PASS — 2 of 2.**

Match detail: P1 topped out first at 11 pieces, P2 at 9; P2 played two more pieces and topped out at 11, ending the match 7.7 s after the rush began. The final placement produced no placement SFX; the last `piece_lock` (−0.95) was the preceding normal lock, 508 ms earlier — just over the 500 ms lock delay, as expected.

**Mutation check:** with the suppression temporarily removed (`if (!matchEnds)` → `if (true)`), A2 failed with a `piece_lock` in the final window; the source was restored and the suite passed again. This shows the case detects the defect it was written for.

## Not covered

- The `line_clear` variant of the rule (a final placement that also clears a line): reaching a double top-out with a line clear on the last piece is not reproducible reliably; the app takes the same suppressed branch for both sounds, but that is code reading, not a test result.
- The first player's top-out placement (the one that does *not* end the match): the spec only suppresses the placement that leaves both players topped out, so its sound is not scored here.
- Audibility, loudness, and the OS output route.
- `game_over` panning: the fanfare is centred (pan 0) in this run, which matches the "global game over fanfare" line, but panning is TC-012's scope.

## Evidence

- `tests/reports/TC-015/run1-results.json` — sub-cases with expected/actual events, the final-window event list, the last placement before `game_over` with its time delta, and the top-out/piece counts.
- `tests/reports/TC-015/run1-game-over.png` — Game Over screen after the match-ending double top-out.

## Run history

| Run | Date | Build | Result | Notes |
|---|---|---|---|---|
| 1 | 2026-11-24 | `8ef3a7c` | **PASS** | 2/2; normal lock sounds, match-ending placement silent, only `game_over` in the final window |
