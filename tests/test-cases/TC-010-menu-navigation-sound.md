# TC-010 — Menu navigation: does moving the selection play a sound?

- **Area:** Menus / audio
- **Priority:** Medium
- **Date run:** 2026-11-24 (run 1: FAIL)
- **Environment:** Chromium (headless, `--headless=new`), production build served with `vite preview` at `http://127.0.0.1:4173`, commit `f12ecbf`. Audio captured from a private PipeWire null sink (`opencode_test`): Chrome launched with `PULSE_SINK=opencode_test`, monitor recorded with `parec` (48 kHz, s16le, stereo), analysed at 25 ms window RMS with `-50 dB` detection threshold.
- **Spec:** `specs/05-audio-and-visuals.md` §"Audio Events (SFX)" → "Menu navigation (select/back)" is listed as an SFX event; `specs/04-screens-and-ui.md` for the menu items.
- **Behaviour under test:** moving the menu selection — by mouse hover, Up/Down arrow keys, or gamepad D-pad — either plays a sound or it does not. The spec does not name which file; `sounds/menu_select.ogg` is the blip the app uses for menu selection elsewhere (volume slider).

## Purpose

Determine whether a selection change in the main menu produces any sound, and which sound, per input path.

## Preconditions

1. Production build at `http://127.0.0.1:4173`.
2. Main menu visible (`Esc` from any screen), volume at default `0.7` (`local-tetris:volume` unset).
3. Page has a real user activation (trusted click) so media playback is not auto-blocked.
4. Capture rig validated by a positive control in the same run (volume-slider step, which the app does play `menu_select.ogg` for).

## Method

- `HTMLMediaElement.prototype.play` wrapped in the page to record `{time, src, volume}` for every requested sound.
- Null-sink monitor recorded per phase; each phase has page-clock timestamps for every input; audio intervals above `-50 dB` are matched to those timestamps.
- Gamepad path uses a standard-mapping mock exposed through `navigator.getGamepads()` (same method as TC-005/TC-009), buttons 12/13 = D-pad up/down, button 0 = A.
- The navigation path itself was verified independently of sound: after hovering "Controls" the page showed the Controls screen on `Enter`, and after 3 × D-pad down the page showed the Controls screen on `A`.

## Sub-cases and results

| # | Input path | Expected (spec) | Actual | Status |
|---|---|---|---|---|
| P1 | Volume screen, `→` once (positive control) | `menu_select.ogg` blip | `menu_select.ogg`, captured peak −22.9 dB | PASS (rig) |
| P2 | Volume screen, `←` once (positive control) | `menu_select.ogg` blip | `menu_select.ogg`, captured peak −22.5 dB | PASS (rig) |
| A1 | Hover Start → Stats | navigation sound | no `play()` call, silence | FAIL |
| A2 | Hover Stats → Volume | navigation sound | no `play()` call, silence | FAIL |
| A3 | Hover Volume → Controls | navigation sound | no `play()` call, silence | FAIL |
| A4 | Hover Controls → empty area → Start | navigation sound on re-entry | no `play()` call, silence | FAIL |
| B1 | `↓` ×4 (full cycle incl. wrap) | navigation sound | no `play()` call, silence | FAIL |
| B2 | `↑` ×4 | navigation sound | no `play()` call, silence | FAIL |
| C1 | D-pad `↓` ×3, `↑` ×2 | navigation sound | no `play()` call, silence | FAIL |

Supplementary observation (not a sub-case): `menu_back`, `move` and `soft_drop` assets exist in `src/audio.ts` but no `playSfx("menu_back"|"move"|"soft_drop")` call exists in `src/main.ts`; the spec lists Move, Soft drop and menu back among the audio events.

## Result

**FAIL** — no sound is produced when the menu selection moves by hover, arrow keys, or D-pad. The only menu sound observed is `menu_select.ogg`, and it is played on volume-slider steps, not on navigation. The capture rig is proven by the positive controls, so this is not a measurement gap.

The "which sound" answer for the current build: none, on all three paths.

## Evidence

- `tests/reports/TC-010/run1-control-volume-step.ogg` — positive control, two `menu_select` blips at 2350 ms and 3575 ms.
- `tests/reports/TC-010/run1-hover.ogg` — silent across six hover marks.
- `tests/reports/TC-010/run1-arrows.ogg` — silent across eight arrow marks.
- `tests/reports/TC-010/run1-dpad.ogg` — silent across five D-pad marks.
- `tests/reports/TC-010/run1-timeline.txt` — per-phase marks, audio intervals, and the `play()` log.
- `tests/reports/TC-010/run1-hover-start.png`, `run1-hover-controls.png` — hover highlight moves with the pointer.
- `tests/reports/TC-010/run1-hover-then-enter.png` — hover on Controls, `Enter` opens Controls (hover path works, silently).
- `tests/reports/TC-010/run1-pad-then-A.png` — 3 × D-pad down, `A` opens Controls (D-pad path works, silently).

## Notes

- The OpenBot private browser instance available to the Tester produced no system audio at all: a 2 s, full-scale 1 kHz WebAudio tone left the default sink monitor at peak `-inf`, and no Chrome sink-input ever appeared. Audio tests therefore run in a separate headless Chrome launched with `PULSE_SINK` pointed at the private sink. This is an environment limitation, not an app result.
