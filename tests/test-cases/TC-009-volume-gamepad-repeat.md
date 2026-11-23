# TC-009 — Volume screen: tap, 300 ms hold delay, then 50 ms repeat (gamepad + keyboard)

- **Area:** Menus / volume / gamepad + keyboard input
- **Priority:** High
- **Date run:** 2026-11-23 (run 2: FAIL)
- **Environment:** Chromium (OpenBot private browser), production build served statically at `http://127.0.0.1:4173` (`vite preview`, no HMR). Run 1 build `7ab789c`; run 2 build `7527f9a` (stats-screen-only diff after run 1).
- **Spec:** `specs/05-audio-and-visuals.md` → "Volume": slider 0.0–1.0, ±0.05 per keyboard / gamepad D-pad / left-stick input, live apply, persisted to `local-tetris:volume`.
- **Spec pin:** `specs/05-audio-and-visuals.md` §"Volume" @ `7527f9a` (±0.05 per input; no repeat timing specified).
- **Behaviour under test:** the repeat timing is **not in the spec**. It comes from the user's request of 2026-11-23 and the message of commit `d1b6e61` ("Volume gamepad: 300ms initial, 50ms repeat"): one step on press, no further step during the first 300 ms, then one step every ~50 ms while held. Applies to gamepad D-pad / left stick and keyboard `A`/`D` / left/right arrows. Needs a spec entry via the user's re-spec process.

## Purpose

Check that the volume slider behaves like game movement DAS: a single press changes the volume by one 5% step, a hold shorter than 300 ms still changes it by one step only, and after 300 ms it repeats one 5% step approximately every 50 ms until release — for both gamepad and keyboard.

## Preconditions

1. Production build served at `http://127.0.0.1:4173`.
2. `local-tetris:volume` set to `0.5` before each sub-case (headroom in both directions).
3. Main menu open → Volume screen (`ArrowDown` ×2, `Enter`).
4. For gamepad: a standard-mapping pad is exposed through `navigator.getGamepads()` as pad 0. This run uses a mock (buttons 12–15, axes 0–1), the same method as TC-005, because no physical pad was attached.
5. For keyboard: keys are held with `KeyboardEvent` down/up dispatched on `window`, timed inside the page with `setTimeout`. Run 2 measures both a plain held key (no repeat events) and OS-style auto-repeat (500 ms first delay, 33 ms interval — typical desktop defaults). Synthetic events are used for sub-millisecond hold control; the volume handler does not distinguish them from trusted keys. Navigation to the screen uses trusted key presses.

## Method

- `Storage.prototype.setItem` hook records every `local-tetris:volume` write with `performance.now()` and the new value; each recorded write is one volume step (0.05), including writes that clamp at 0 or 1.
- `CanvasRenderingContext2D.fillText` hook confirms the `VOLUME` screen and its percentage text.
- Press and release are scheduled inside the page with `setTimeout` (120 / 250 / 700 ms), so the hold length is not distorted by driver round-trips. Actual hold lengths measured from the input marks: 250.1–250.2 ms and 700.1–700.2 ms.
- Display frame interval in this run was ~33 ms, which bounds the observable repeat granularity.

## Sub-cases and results

### Gamepad (run 1, `7ab789c`)

| # | Input | Hold | Expected | Actual | Status |
|---|---|---|---|---|---|
| A1 | D-pad left | 120 ms | one step: 0.50 → 0.45 | 4 steps: 0.50 → 0.30 | FAIL |
| A2 | D-pad right | 120 ms | one step: 0.50 → 0.55 | 4 steps: 0.50 → 0.70 | FAIL |
| A3 | Left stick left | 120 ms | one step: 0.50 → 0.45 | 4 steps: 0.50 → 0.30 | FAIL |
| A4 | Left stick right | 120 ms | one step: 0.50 → 0.55 | 4 steps: 0.50 → 0.70 | FAIL |
| B1 | D-pad left | 250 ms | one step only | 7 steps: 0.50 → 0.15 | FAIL |
| B2 | D-pad right | 250 ms | one step only | 7 steps: 0.50 → 0.85 | FAIL |
| B3 | Left stick left | 250 ms | one step only | 8 steps: 0.50 → 0.10 | FAIL |
| B4 | Left stick right | 250 ms | one step only | 8 steps: 0.50 → 0.90 | FAIL |
| C1 | D-pad left | 700 ms | 1 step, 300 ms quiet, then 5% / ~50 ms | first step at 28 ms, then every ~33 ms; bound reached (0.50 → 0.00) in 312 ms | FAIL |
| C2 | D-pad right | 700 ms | same | first step at 25 ms, then every ~33 ms; bound reached (0.50 → 1.00) in 359 ms | FAIL |
| C3 | Left stick left | 700 ms | same | first step at 28 ms, then every ~33 ms; bound reached (0.50 → 0.00) in 328 ms | FAIL |
| C4 | Left stick right | 700 ms | same | first step at 11 ms, then every ~33 ms; bound reached (0.50 → 1.00) in 311 ms | FAIL |
| D1 | D-pad up | 250 ms | no volume change | no writes, 0.50 unchanged | PASS |
| D2 | Left stick down | 250 ms | no volume change | no writes, 0.50 unchanged | PASS |

### Keyboard (run 2, `7527f9a`)

| # | Input | Hold | Expected | Actual | Status |
|---|---|---|---|---|---|
| E1 | `A` | 120 ms | one step: 0.50 → 0.45 | one step | PASS |
| E2 | `D` | 120 ms | one step: 0.50 → 0.55 | one step | PASS |
| E3 | `←` | 120 ms | one step: 0.50 → 0.45 | one step | PASS |
| E4 | `→` | 120 ms | one step: 0.50 → 0.55 | one step | PASS |
| F1 | `A` | 250 ms, no repeat events | one step only | one step only | PASS |
| F2 | `D` | 250 ms, no repeat events | one step only | one step only | PASS |
| F3 | `←` | 250 ms, no repeat events | one step only | one step only | PASS |
| F4 | `→` | 250 ms, no repeat events | one step only | one step only | PASS |
| G1 | `A` | 700 ms, no repeat events | 1 step, then 5% / ~50 ms after 300 ms | one step only, no repeat until release | FAIL |
| G2 | `D` | 700 ms, no repeat events | same | one step only, no repeat until release | FAIL |
| G3 | `←` | 700 ms, no repeat events | same | one step only, no repeat until release | FAIL |
| G4 | `→` | 700 ms, no repeat events | same | one step only, no repeat until release | FAIL |
| H1 | `A` | 700 ms, OS-style repeat 500/33 ms | 1 step, then 5% / ~50 ms after 300 ms | first repeat at 500 ms, then every ~33 ms; 0.50 → 0.15 | FAIL |
| H2 | `D` | 700 ms, OS-style repeat 500/33 ms | same | first repeat at 500 ms, then every ~33 ms; 0.50 → 0.85 | FAIL |
| H3 | `←` | 700 ms, OS-style repeat 500/33 ms | same | first repeat at 500 ms, then every ~33 ms; 0.50 → 0.15 | FAIL |
| H4 | `→` | 700 ms, OS-style repeat 500/33 ms | same | first repeat at 500 ms, then every ~33 ms; 0.50 → 0.85 | FAIL |

### Measured step offsets from press (ms)

- Gamepad 120 ms tap: `3.5, 36.6, 69.9, 103.3` (D-pad left); `9.3, 42.3, 76.3, 110.0` (D-pad right); `10.7, 43.9, 77.1, 110.9` (stick left); `23.1, 56.8, 89.7, 106.6` (stick right).
- Gamepad 250 ms hold: 7–8 steps, first at 5–10 ms, then roughly every 33–50 ms: D-pad left `5.4, 38.4, 88.8, 138.4, 172.0, 204.9, 238.4`; stick right `10.1, 43.3, 76.6, 110.3, 127.0, 160.5, 193.6, 227.0`.
- Gamepad 700 ms hold: 10 distinct steps to the 0/1 bound within 311–359 ms, then continued writes at the clamped value until release; no 300 ms gap after the press step on any input.
- Keyboard 120 ms tap and 250 ms hold: exactly one write per press, on all four keys.
- Keyboard 700 ms, plain hold: one write at press, none afterwards; no app-side repeat.
- Keyboard 700 ms with OS-style repeat: writes at press `+0`, then `+500, +533, +567, +600, +633, +667` ms — driven by the repeat events, not by a 300/50 schedule.

## Status

**FAIL** (run 2, build `7527f9a`) — gamepad: every horizontal input repeats 5% per rendered frame from the press, so a tap already changes the volume by ~20%, a 250 ms hold by 35–40%, and the slider reaches 0%/100% in ~0.31–0.36 s; no 300 ms delay, no 50 ms cadence. Keyboard: tap and 250 ms hold are correct (one 5% step), but a held key produces no repeat of its own, and with OS auto-repeat it follows the OS 500 ms/33 ms instead of 300 ms/50 ms. Vertical gamepad inputs correctly leave the volume unchanged.

Tested: gamepad D-pad left/right and left stick left/right at 120/250/700 ms, both bounds; keyboard `A`/`D`/left/right arrows at 120/250/700 ms, with and without OS-style repeat; vertical controls. Not tested: a physical gamepad, physical keyboard auto-repeat settings other than the emulated 500/33 ms, mouse drag.

## Evidence

- `tests/reports/TC-009/run1-gamepad-repeat-timeline.txt` — gamepad holds, step counts, offsets, intervals.
- `tests/reports/TC-009/run2-keyboard-repeat-timeline.txt` — keyboard tap/hold, plain-hold and OS-repeat timings.
- `tests/reports/TC-009/run1-volume-screen.png` — volume screen, 100%, build hash `7ab789c` bottom-right.

## Run history

| Run | Date | Build | Result | Notes |
|---|---|---|---|---|
| 1 | 2026-11-23 | `7ab789c` | FAIL | Gamepad: tap and 250 ms hold repeat per frame; no 300 ms delay; vertical controls pass |
| 2 | 2026-11-23 | `7527f9a` | FAIL | Keyboard added: tap/250 ms pass; hold repeats absent app-side and OS-driven at 500/33 ms |

## Notes / follow-up

- First-time failure of this case, reported to @Developer at the user's request (2026-11-23).
- `specs/05-audio-and-visuals.md` has no repeat-timing requirement; the 300 ms / 50 ms values need a spec pin before this case can be cited as spec-derived.
- Runnable coverage: gamepad repeat and keyboard tap/250 ms; keyboard hold repeat fails both with and without OS repeat.
