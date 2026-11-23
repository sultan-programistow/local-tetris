# TC-003 — Horizontal steering: tap, hold delay (DAS) and repeat (keyboard + gamepad)

- **Area:** Gameplay / input
- **Priority:** High
- **Date run:** 2026-11-23 (run 5)
- **Environment:** Chromium (OpenBot browser), production build served statically at `http://127.0.0.1:4174` (`vite preview`, no HMR), build from `7774d42`, canvas 1920×1080, cell 50 px, P1 board origin (200,40), P2 origin (1220,40)
- **Spec:** `specs/03-input-and-controls.md` → Keyboard, Gamepad, DAS (initial delay 350 ms, repeat 50 ms, keyboard and gamepad)
- **Spec pin:** `specs/03-input-and-controls.md` §DAS @ `10aa6a0` (350 ms initial delay, 50 ms repeat). Re-check the pin when the spec changes.

## Preconditions

1. The app is running (static preview) at `http://127.0.0.1:4174`.
2. A fresh match is in progress with a falling piece for both players.

## Expected result

**A. Tap (single step).** A short tap (~130 ms) of the left/right input moves the piece **exactly one column** immediately, and no further.

**B. Hold (initial delay, then auto-repeat).** Holding left/right moves one column at the press edge, provides **no further movement for 350 ms**, then repeats every **50 ms** (DAS/ARR). This applies to keyboard (`a`/`d` for P1, `←`/`→` for P2), gamepad D-pad left/right, and gamepad left stick.

Same inputs as TC-005's soft-drop matrix: keyboard and gamepad must both honour the hold delay.

## Method

`CanvasRenderingContext2D.fillRect` hook logged every drawn 50 px board cell with `performance.now()`. The current piece is the last four cells drawn for each side (locked board cells are drawn first); its left edge gives the column. A fresh match was started per run with a unique page URL (so no stale board carried over), and the hold was ended by an in-page `setTimeout`, so harness sleep drift does not skew the release time. Gamepads were mocked via `navigator.getGamepads()` (pad 0 → P1, pad 1 → P2).

## Actual result

### Sub-case A — tap: PASS

| Input | Press → first move | Move | Extra moves |
|---|---|---|---|
| P1 `a` | +67 ms | one column (3 → 2) | none |
| P2 `ArrowRight` | +44 ms | one column (3 → 4) | none |
| pad0 D-pad right | +111 ms | one column (3 → 4) | none |
| pad1 D-pad right | +59 ms | one column (3 → 4) | none |
| pad0 left stick +1 | +47 ms | one column (3 → 4) | none |

### Sub-case B — hold 900 ms: FAIL

| Input | Press → first cell | Repeat starts | Gap after first cell | Then |
|---|---|---|---|---|
| P1 `a` | +39 / +60 ms | +239 / +260 ms | **200 ms** | +273/+293 ms, wall |
| P1 `d` | +56 ms | +423 ms | 367 ms | +489 ms, wall |
| P2 `ArrowRight` | +66 ms | +417 ms | 351 ms | +483, +517 ms, wall |
| pad0 D-pad right | +38 ms | **never** | — | no move in 900 ms |
| pad1 D-pad right | +50 ms | **never** | — | no move in 900 ms |
| pad0 left stick +1 | +68 ms | **never** | — | no move in 900 ms |

Keyboard-right matches the spec's ~350 ms delay (351–367 ms measured; repeat gaps were 34–66 ms, at the ~33 ms draw-frame resolution). Keyboard-left repeats after ~200 ms instead of 350 ms (confirmed in two runs). Gamepad D-pad and left stick move one column on press and never auto-repeat, although the spec applies DAS to left/right movement for keyboard and gamepad.

## Status

**FAIL** (run 5) — tap moves exactly one column for every input; keyboard-right hold delay matches the spec; **keyboard-left hold delay is ~200 ms instead of 350 ms**, and **gamepad hold does not auto-repeat at all**.

## Run history

| Run | Date | Result | Notes |
|---|---|---|---|
| 1 | 2026-11-23 | PASS | keyboard moves and gamepad D-pad/stick single moves; hold timing not measured |
| 2–4 | 2026-11-23 | PASS | re-checks after input/gamepad changes (dev server) |
| 5 | 2026-11-23 | FAIL | hold timing added; keyboard-left delay ~200 ms; gamepad hold never repeats |

## Verification

Per-frame analysis via a `fillRect` hook, current piece = last four cell fills per side, timestamps relative to the input press. Raw timeline: `tests/reports/TC-003/run5-das-timeline.txt`. No image input used.

## Notes / follow-up

- Hold timing is new coverage in this case (runs 1–4 only checked single moves), so this is a first-time failure of an untested area, not a regression of a previously passing check.
- Root cause is out of scope for this test asset.
