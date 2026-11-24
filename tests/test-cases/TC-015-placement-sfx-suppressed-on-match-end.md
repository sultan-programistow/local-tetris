# TC-015 — Placement SFX suppressed when the placement ends the match

- **Area:** Audio / game over / top-out
- **Priority:** Medium
- **Spec pin:** `specs/05-audio-and-visuals.md` §"Audio Events (SFX)" @ `8ef3a7c` — placement SFX (piece lock / line clear) is suppressed when the placed piece leaves both players topped out and ends the match; then only the Game Over SFX plays.
- **Spec:** `tests/e2e/tc-015-placement-sfx-suppressed-on-match-end.spec.ts` — `npm run test TC-015`

## Must hold

- A normal piece lock still plays exactly one `piece_lock` — the positive control, so a build that muted all placement sounds cannot pass.
- The lock that tops out the second player and ends the match plays no `piece_lock`/`line_clear`: in the 150 ms before `game_over` there is no placement sound, and there is exactly one `game_over`.
- The check is a window, not a whole-run count: the surviving player may lock further pieces between the first and second top-out, and those normal locks must still sound.

## Notes

- Both pads hold `A` (soft drop) until the hook reports `screen === 'gameover'`, polled every 20 ms; the first top-out (player, piece counts) is recorded.
- The 150 ms window is safe against a genuine earlier lock because the lock delay is 500 ms — a real previous lock cannot fall inside it.
- The sound hook proves which sound the app started, not audibility.
- Not covered: the `line_clear` variant of the rule (a final placement that also clears a line) — not reliably reproducible; the app takes the same suppressed branch for both, but that is code reading, not a test result.
- Not scored: the first player's top-out placement, which does not end the match and is not suppressed by the spec.
- `game_over` panning is TC-012's scope; the fanfare is centred here, which matches the "global game over fanfare" line.
- Out of scope permanently: audibility, loudness, OS output route.
- Root cause is out of scope for this asset.

## Can it fail

With the suppression temporarily removed (`if (!matchEnds)` → `if (true)`), the second sub-case fails with a `piece_lock` in the final window. Source restored and the suite passed again.

## History

No failures recorded. Run 1 (2026-11-24, `8ef3a7c`, automated): PASS — normal lock sounds, match-ending placement silent, only `game_over` in the final window; P1 topped out first at 11 pieces, P2 at 11, ending the match 7.7 s after the rush began. Evidence `tests/reports/TC-015/run1-results.json`.
