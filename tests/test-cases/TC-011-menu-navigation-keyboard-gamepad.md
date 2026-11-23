# TC-011 — Menu navigation and activation across keyboard, D-pad and left stick

- **Area:** Menus / input / navigation
- **Priority:** High
- **Date run:** 2026-11-24 (run 1: PASS)
- **Environment:** Chromium (headless `--headless=new`, Chrome 158) at 1920×1080, production build served with `vite preview` at `http://127.0.0.1:4176`, commit `8da9d1f`, canvas 1920×1080 with no CSS scaling
- **Spec pins:** `specs/03-input-and-controls.md` §"Keyboard" (`Enter/Space = confirm in menus`, `Esc = pause/menu`), §"Menu navigation (gamepad)" (`D-pad / left stick: navigate up/down/left/right`, `A: select/confirm`, `B: back`) @ `ceabcd2`; `specs/04-screens-and-ui.md` §"Main Menu" (`Navigation: D-pad/arrows, A/Enter/Space select, B/Esc/Select back`) @ `ceabcd2`
- **Spec gap:** W/S as menu navigation keys are **not** specified. The user asked for them explicitly; sub-cases K3/K4 test a user requirement, not the spec.

## Purpose

Prove that the main menu selection moves with every requested input path — arrow keys, W/S, D-pad up/down, left-stick up/down — wraps in both directions, and that Enter, Space, A activate the highlighted item while Esc and B return from a sub-screen and from a game-paused menu.

## Preconditions

1. Production build at `http://127.0.0.1:4176` (static `vite preview`, no HMR).
2. Main menu shown, selection on "Start", volume at default 70%.
3. Page has a trusted user gesture (click) so keyboard events are accepted.

## Method

Canvas is the only output, so the drawn frame is read directly:

- `CanvasRenderingContext2D.fillRect` is wrapped; the full-screen `(0,0,1920,1080)` background clear starts a new frame record.
- `fillText` is wrapped and records `{text, y, fillStyle}` per drawn string. The selected menu item is the one drawn with `#00ff00`; non-selected items are `#aaaaaa`.
- The visible screen is identified from the frame's drawn titles (`LOCAL TETRIS`, `VOLUME`, `CONTROLS`, `STATS`, `GAME OVER`, or `P1 Score` for play).
- Keyboard input via CDP `Input.dispatchKeyEvent` (keydown/keyup, 30 ms apart). Gamepad input via a standard-mapping mock on `navigator.getGamepads()`: D-pad buttons 12/13, A = 0, B = 1, left stick = `axes[1]` ±0.9 for 150 ms.
- Every sub-case below was observed after a fresh page load; the whole script was executed twice and produced identical selection sequences.

## Sub-cases and results

Expected sequences are from the menu order Start → Stats → Volume → Controls.

| # | Input path | Expected | Actual | Status |
|---|---|---|---|---|
| K1 | `↓` ×4 from Start | Stats, Volume, Controls, Start (wrap) | Stats, Volume, Controls, Start | PASS |
| K2 | `↑` ×4 from Start | Controls, Volume, Stats, Start (wrap) | Controls, Volume, Stats, Start | PASS |
| K3 | `s` ×4 / `w` ×4 | same as K1 / K2 (user requirement, not spec) | Stats, Volume, Controls, Start / Controls, Volume, Stats, Start | PASS |
| K4 | `Space` on Volume | Volume screen opens | VOLUME screen; `Esc` returns to menu with Volume still selected | PASS |
| K5 | `Enter` on Controls | Controls screen opens | CONTROLS screen; `Esc` returns to menu with Controls still selected | PASS |
| K6 | `←`, `→`, `x` (negative control) | selection does not move | stays on Start for all three | PASS |
| K7 | D-pad `↓` ×4 / `↑` ×4 | K1 / K2 sequence | Stats, Volume, Controls, Start / Controls, Volume, Stats, Start | PASS |
| K8 | D-pad `↓` ×3 then `A`; then `B` | Controls opens; B returns to menu | CONTROLS screen; menu with Controls selected | PASS |
| K9 | Left stick `↓` ×4 / `↑` ×4 | K1 / K2 sequence | Stats, Volume, Controls, Start / Controls, Volume, Stats, Start | PASS |
| K10 | Left stick `↓` ×3 then `A`; then `B` | Controls opens; B returns to menu | CONTROLS screen; menu with Controls selected | PASS |
| K11 | `Esc` in play; `Esc` in the paused menu | menu shows Resume; second Esc resumes play | menu with Resume selected; play screen returns with scores | PASS |
| K12 | `B` in the paused menu | resumes play | play screen returns | PASS |

## Result

**PASS** (run 1, commit `8da9d1f`) — all 12 sub-cases match. Every direction path moves exactly one item per discrete press and wraps at both ends; Enter, Space and A activate the selected item; Esc and B go back both from sub-screens and from a game-paused menu.

## Evidence

`tests/reports/TC-011/`:

- `run1-timeline.json` — per-step screen, selected item, and drawn text after every input.
- `A1-arrowdown-4.png`, `A2-arrowup-4.png` — arrow-key cycles.
- `B1-s-4.png`, `B2-w-4.png` — W/S cycles.
- `C1-space-volume.png`, `C2-esc-back.png` — Space activation and Esc back.
- `D1-enter-controls.png`, `D2-esc-back.png` — Enter activation and Esc back with selection kept.
- `F1-dpad-cycle.png`, `F3-A-controls.png`, `F4-B-back.png` — D-pad cycle, A, B.
- `G1-stick-cycle.png`, `G3-A-controls.png` — left-stick cycle and A.
- `H2-esc-resume.png`, `H4-B-resume.png` — Esc/B resuming a game-paused menu.

## Notes

- W/S are handled in the implementation but absent from the spec; if they are intended as permanent menu keys, the spec should say so, otherwise this sub-case pins undocumented behaviour.
- Upper-case `S` (Shift+S) was not exercised; the implementation matches only lower-case `s` for menu-down.
- Root cause and code changes are out of scope for this test asset.
