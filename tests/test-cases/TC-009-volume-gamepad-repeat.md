# TC-009 — Volume screen: tap, 300 ms hold delay, then 50 ms repeat (gamepad + keyboard)

- **Area:** Menus / volume / gamepad + keyboard input
- **Priority:** High
- **Date run:** 2026-11-24 (run 4: PASS, automated; manual run 3: PASS)
- **Environment:** Chromium (OpenBot private browser), production build served statically at `http://127.0.0.1:4173` (`vite preview`, no HMR), build commit `3d58e25`. Page rendered at ~60 fps (rAF interval ~16.7 ms), kept awake with tab recording; an earlier attempt at ~1 fps was discarded because the game loop could not run often enough to show DAS.
- **Automated:** `tests/e2e/tc-009-volume-gamepad-repeat.spec.ts` — `npm run test TC-009`
- **Spec:** `specs/05-audio-and-visuals.md` → "Volume": slider 0.0–1.0, ±0.05 per keyboard / gamepad D-pad / left-stick input, live apply, persisted to `local-tetris:volume`.
- **Spec pin:** `specs/05-audio-and-visuals.md` §"Volume" @ `3d58e25` (±0.05 per input; no repeat timing specified).
- **Behaviour under test:** the repeat timing is **not in the spec**. It comes from the user's request of 2026-11-23: one step on press, no further step during the first 300 ms, then one step every ~50 ms while held; release stops the repeat. Applies to gamepad D-pad / left stick and keyboard `A`/`D` / left/right arrows. Still needs a spec entry via the user's re-spec process.

## Purpose

Check that the volume slider behaves like game movement DAS: a single press changes the volume by one 5% step, a hold shorter than 300 ms still changes it by one step only, and after 300 ms it repeats one 5% step approximately every 50 ms until release — for both gamepad and keyboard, without keyboard auto-repeat double-stepping.

## Preconditions

1. Production build served at `http://127.0.0.1:4173`.
2. `local-tetris:volume` set to `0.5` before each sub-case (headroom in both directions).
3. Main menu open → Volume screen (`ArrowDown` ×2, `Enter`).
4. Page must be rendering continuously; if the tab is background-throttled (~1 fps), start a tab recording first, otherwise the DAS timings are not observable.
5. For gamepad: a standard-mapping pad is exposed through `navigator.getGamepads()` as pad 0. This run uses a mock (buttons 12–15, axes 0–1), the same method as TC-005, because no physical pad was attached.
6. For keyboard: keys are held with `KeyboardEvent` down/up dispatched on `window`, timed inside the page with `setTimeout`. Both a plain held key and OS-style auto-repeat (500 ms first delay, 33 ms interval) are measured; the auto-repeat variant checks that repeated `keydown` events do not cause extra steps.

## Method

- `Storage.prototype.setItem` hook records every `local-tetris:volume` write with `performance.now()` and the new value; each recorded write is one volume step (0.05), including writes that clamp at 0 or 1.
- Press and release are scheduled inside the page with `setTimeout` (120 / 250 / 650 ms), so hold lengths are not distorted by driver round-trips. Actual hold lengths measured from the input marks: 250.1–250.3 ms and 649.8–650.3 ms.
- One sub-case per input path, each from a fresh page load with volume 0.5.

## Sub-cases and results

### Gamepad (run 3)

| # | Input | Hold | Expected | Actual | Status |
|---|---|---|---|---|---|
| A1 | D-pad left | 120 ms | one step: 0.50 → 0.45 | one step, first at +11.1 ms | PASS |
| A2 | D-pad right | 120 ms | one step: 0.50 → 0.55 | one step, first at +11.0 ms | PASS |
| A3 | Left stick left | 120 ms | one step: 0.50 → 0.45 | one step, first at +11.5 ms | PASS |
| A4 | Left stick right | 120 ms | one step: 0.50 → 0.55 | one step, first at +12.4 ms | PASS |
| B1 | D-pad left | 250 ms | one step only | one step only | PASS |
| B2 | D-pad right | 250 ms | one step only | one step only | PASS |
| B3 | Left stick left | 250 ms | one step only | one step only | PASS |
| B4 | Left stick right | 250 ms | one step only | one step only | PASS |
| C1 | D-pad left | 650 ms | 1 step, no repeat before 300 ms, then 5% / ~50 ms | 1 step; repeats from +306 ms at 50–66 ms; 0.50 → 0.10 | PASS |
| C2 | D-pad right | 650 ms | same | 1 step; repeats from +311 ms at 50–67 ms; 0.50 → 0.90 | PASS |
| C3 | Left stick left | 650 ms | same | 1 step; repeats from +310 ms at 50–67 ms; 0.50 → 0.15 | PASS |
| C4 | Left stick right | 650 ms | same | 1 step; repeats from +309 ms at 50–66 ms; 0.50 → 0.90 | PASS |
| D1 | D-pad up | 250 ms | no volume change | no writes, 0.50 unchanged | PASS |
| D2 | Left stick down | 250 ms | no volume change | no writes, 0.50 unchanged | PASS |

### Keyboard (run 3)

| # | Input | Hold | Expected | Actual | Status |
|---|---|---|---|---|---|
| E1 | `A` | 120 ms | one step: 0.50 → 0.45 | one step | PASS |
| E2 | `D` | 120 ms | one step: 0.50 → 0.55 | one step | PASS |
| E3 | `←` | 120 ms | one step: 0.50 → 0.45 | one step | PASS |
| E4 | `→` | 120 ms | one step: 0.50 → 0.55 | one step | PASS |
| F1 | `A` | 250 ms | one step only | one step only | PASS |
| F2 | `D` | 250 ms | one step only | one step only | PASS |
| F3 | `←` | 250 ms | one step only | one step only | PASS |
| F4 | `→` | 250 ms | one step only | one step only | PASS |
| G1 | `A` | 650 ms, no repeat events | 1 step, then 5% / ~50 ms after 300 ms | 1 step; repeats from +292 ms at 50–67 ms; 0.50 → 0.10 | PASS |
| G2 | `D` | 650 ms, no repeat events | same | 1 step; repeats from +290 ms at 49–67 ms; 0.50 → 0.90 | PASS |
| G3 | `←` | 650 ms, no repeat events | same | 1 step; repeats from +290 ms at 49–68 ms; 0.50 → 0.10 | PASS |
| G4 | `→` | 650 ms, no repeat events | same | 1 step; repeats from +291 ms at 50–67 ms; 0.50 → 0.90 | PASS |
| H1 | `A` | 650 ms, OS-style repeat 500/33 ms | same, without double-stepping | 8 steps, same schedule as G1; repeat events ignored | PASS |
| H2 | `D` | 650 ms, OS-style repeat 500/33 ms | same | 8 steps, same schedule as G2; repeat events ignored | PASS |
| H3 | `←` | 650 ms, OS-style repeat 500/33 ms | same | 8 steps, same schedule as G3; repeat events ignored | PASS |
| H4 | `→` | 650 ms, OS-style repeat 500/33 ms | same | 8 steps, same schedule as G4; repeat events ignored | PASS |

### Measured repeat timings

- Gamepad first repeat after press: 306, 311, 310, 309 ms (D-pad left/right, stick left/right). Intervals: 50–67 ms; 8 steps by 650 ms on three paths, 7 on stick left (one frame interval missed).
- Keyboard plain first repeat after press: 292, 290, 290, 291 ms. Intervals: 49–68 ms; 8 steps by 650 ms on all four keys.
- Keyboard OS-repeat variant: identical step count and timing to the plain hold — repeat `keydown` events are ignored, no double-step.
- No volume writes occur after key/button release in any 650 ms sub-case.

## Status

**PASS** (run 4 automated, manual run 3) — gamepad and keyboard both produce exactly one 5% step on a tap and on a 250 ms hold; after a ~300 ms delay (measured 290–311 ms, within one frame) they repeat 5% every ~50 ms (50–67 ms, frame-quantised) until release. Keyboard auto-repeat events do not add extra steps. Vertical gamepad inputs leave the volume unchanged. A prior run on the same build at ~1 fps was discarded as invalid.

## Evidence

- `tests/reports/TC-009/run3-gamepad-repeat-timeline.txt` — gamepad taps, 250/650 ms holds, offsets, intervals.
- `tests/reports/TC-009/run3-keyboard-repeat-timeline.txt` — keyboard plain and OS-repeat timings.
- `tests/reports/TC-009/run1-volume-screen.png` — volume screen and build hash (earlier build).

## Run history

| Run | Date | Build | Result | Notes |
|---|---|---|---|---|
| 1 | 2026-11-23 | `7ab789c` | FAIL | Gamepad: tap and 250 ms hold repeated per frame; no 300 ms delay; vertical controls pass |
| 2 | 2026-11-23 | `7527f9a` | FAIL | Keyboard added: tap/250 ms pass; hold had no app-side repeat and followed OS 500/33 ms |
| 3 | 2026-11-23 | `3d58e25` | PASS |
| 4 | 2026-11-24 | current | PASS (automated) | `npm run test TC-009`: 12 gamepad and 12 keyboard sub-cases; taps and 250 ms holds = one 5% step; 650 ms holds repeat after 269–308 ms then every 35–75 ms; OS-style auto-repeat adds no extra steps; vertical inputs silent | Gamepad tap/250 ms/650 ms and keyboard plain/OS-repeat all match 1 step, 300 ms, ~50 ms |

## Notes / follow-up

- Fixed by @Developer in `3d58e25`; re-tested on the production build of that commit.
- `specs/05-audio-and-visuals.md` still has no repeat-timing requirement; the 300 ms / 50 ms values need a spec pin before this case can be cited as spec-derived.
- Not tested: a physical gamepad, a physical keyboard (synthetic key events only), mouse drag, and OS repeat settings other than the emulated 500/33 ms.

## Automation (run 4)

`tests/e2e/tc-009-volume-gamepad-repeat.spec.ts`, run with `npm run test TC-009`. The page starts at 50% volume (seeded through `localStorage`); each sub-case steps the volume back to exactly 50% with short arrow taps, then holds the input for 120, 250 or 650 ms. Volume is sampled per frame from the hook, so each 5% write is counted with its timestamp. Gaps are frame-quantised, hence the 250–450 ms delay band and the ≤ 150 ms repeat band.

Inputs: gamepad D-pad and left stick, both directions, taps/250/650 ms; keyboard `A`, `D`, `←`, `→`, taps/250/650 ms; D-pad up and stick down as negative controls; `A` with OS-style auto-repeat events (500/33 ms) injected every 33 ms to prove they add no steps.

Mutation check: gamepad hold delay 300 → 0 ms fails the first tap sub-case; restored afterwards.

Evidence: `tests/reports/TC-009/run4-repeat-timeline.json` (per sub-case step count and gaps), `run4-volume-screen.png`, `run4-after-volume.png`.
