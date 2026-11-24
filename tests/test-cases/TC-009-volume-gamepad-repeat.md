# TC-009 — Volume screen: tap, hold delay, then repeat (keyboard + gamepad)

- **Area:** Menus / volume / input
- **Priority:** High
- **Spec pin:** `specs/05-audio-and-visuals.md` §"Volume" @ `3d58e25` — ±0.05 per input, live apply, persisted to `local-tetris:volume`. The spec sets no repeat timing.
- **Behaviour source:** the 300 ms delay and ~50 ms repeat come from the user's request of 2026-11-23, not from the spec. Still a spec gap: this case cannot cite them as spec-derived until the spec states them.
- **Spec:** `tests/e2e/tc-009-volume-gamepad-repeat.spec.ts` — `npm run test TC-009`

## Must hold

- One tap (and a 250 ms hold) changes the volume by exactly one 5% step.
- A 650 ms hold: one step, nothing for ~300 ms, then one 5% step per ~50 ms until release; nothing after release.
- Same on gamepad D-pad and left stick left/right, and on keyboard `A`/`D`/`←`/`→`.
- OS-style keyboard auto-repeat adds no extra steps.
- D-pad up and left-stick down change nothing.

## Notes

- Each write to `local-tetris:volume` is one step, timestamped; volume is sampled per frame from the hook.
- Each sub-case starts at exactly 50%, stepped back with short taps, so there is headroom both directions.
- Gaps are frame-quantised: asserted bands are 250–450 ms for the delay and ≤ 150 ms for repeats.
- The page must render continuously (~60 fps); a throttled tab (~1 fps) cannot show DAS and is not a valid run.
- Out of scope permanently: physical gamepad, physical keyboard, audibility/loudness.
- Root cause is out of scope for this asset.

## Can it fail

Gamepad hold delay 300 → 0 ms fails the first tap sub-case. Restored afterwards.

## History

| Run | Date | Result | Failure |
|---|---|---|---|
| 1 | 2026-11-23 | FAIL | gamepad repeated per frame, no 300 ms delay on tap or 250 ms hold |
| 2 | 2026-11-23 | FAIL | keyboard hold had no app-side repeat and followed the OS 500/33 ms; fixed in `3d58e25` |

Last automated run: run 5, PASS (2026-11-24) — evidence `tests/reports/TC-009/run5-repeat-timeline.json`.
