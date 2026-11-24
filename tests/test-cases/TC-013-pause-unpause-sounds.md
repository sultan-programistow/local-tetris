# TC-013 — Pause and unpause sounds on every input path

- **Area:** Audio / pause / input paths
- **Priority:** Medium
- **Date run:** 2026-11-24 (run 1: FAIL — 8/12; keyboard `Esc` resume, both gamepad `Start` pause paths and mouse Resume are silent)
- **Spec:** `specs/05-audio-and-visuals.md` §"Audio Events (SFX)" — "Pause/unpause" is a listed SFX event with no input-path exception. Input paths from `specs/03-input-and-controls.md` (`Esc = pause/menu`, gamepad `Start`, `B`/`Select = back`, mouse supported in menus) and `specs/04-screens-and-ui.md` §"Main Menu" (Resume is the first item when paused). The spec does not name the sound files; `src/audio.ts` maps the events to `pause.ogg` / `unpause.ogg`.
- **Spec pin:** `specs/05-audio-and-visuals.md` §"Audio Events (SFX)" @ `962dc56`; input paths @ `8b4c2ef` / `ceabcd2` as pinned in TC-011.
- **Behaviour under test:** opening the menu over a live match (or the countdown) plays `pause` exactly once, and returning to play plays `unpause` exactly once — on every resume path the app offers. No other sound is required for these actions.

## Preconditions

1. Production build of `962dc56` served at `http://127.0.0.1:4183` (clean `git archive` copy, `vite preview`), headless Chrome 158, 1920×1080.
2. Volume `0.7` (default; non-zero, so `play()` is not short-circuited).
3. A trusted click on the page for AudioContext activation.
4. Gamepad path uses a standard-mapping mock exposed through `navigator.getGamepads()` (pads 0 and 1), same method as TC-005 / TC-009 / TC-012.
5. Fresh page load per input group (keyboard, gamepad, mouse).

## Method

- An init script runs before the app bundle and hooks the Web Audio API: `fetch` records the last `sounds/<name>.ogg` URL, `decodeAudioData` tags the returned buffer with that name, and a wrapped `createBufferSource().start()` records `{sound name, time}` — one entry per sound played, nothing when no sound plays.
- Each action clears the log, performs one input, waits 350 ms and reads the log, so a sub-case asserts the exact sequence of sound files a step must produce.
- After each step the canvas `fillText` log gives the screen and the green (`#0f0`) menu label, which proves the action actually happened even when it was silent. "Play" is only counted once the countdown digit has left the screen, so pause steps do not run on the countdown by mistake.
- Pause entry and resume are paired on the same page where possible: a resume step always starts from a verified pause menu with Resume highlighted.
- In B4 the same `A` press that resumes also reaches gameplay, so a `soft_drop` follows the `unpause`; that is a property of the test input, not a second pause-path sound.

## Sub-cases and results (run 1, `962dc56`)

| # | Input path | Action | Expected | Actual | Screen after | Status |
|---|---|---|---|---|---|---|
| A1 | Keyboard | `Esc` in play | `pause` ×1 | `pause` ×1 | pause menu, Resume highlighted | PASS |
| B1 | Keyboard | `Esc` in the pause menu (Resume selected) | `unpause` ×1 | no sound | play | **FAIL** |
| B2 | Keyboard | `Enter` on Resume | `unpause` ×1 | `unpause` ×1 | play | PASS |
| B3 | Keyboard | `Space` on Resume | `unpause` ×1 | `unpause` ×1 | play | PASS |
| A2 | Keyboard | `Esc` during the countdown | `pause` ×1 | `pause` ×1 | pause menu, Resume highlighted | PASS |
| A3 | Gamepad 0 | `Start` in play | `pause` ×1 | no sound | pause menu, Resume highlighted | **FAIL** |
| B4 | Gamepad 0 | `A` on Resume | `unpause` (a `soft_drop` from the same press follows in play) | `unpause`, then `soft_drop` | play | PASS |
| B5 | Gamepad 0 | `B` in the pause menu | `unpause` ×1 | `unpause` ×1 | play | PASS |
| B6 | Gamepad 0 | `Select` (button 8) in the pause menu | `unpause` ×1 | `unpause` ×1 | play | PASS |
| A4 | Gamepad 1 | `Start` in play | `pause` ×1 | no sound | pause menu, Resume highlighted | **FAIL** |
| B7 | Gamepad 0 | `Start` again on Resume (after Start opened the menu and was released) | `unpause` ×1 | `unpause` ×1 | play | PASS |
| B8 | Mouse | Click Resume (first item, y ≈ 390) | `unpause` ×1 | no sound | play | **FAIL** |

**Run 1 result: FAIL — 8 of 12.** Every pause entry and resume path that works is confirmed by the screen after the step: A1/A2 play `pause`, B2–B7 play `unpause`. Four paths perform the action silently: keyboard `Esc` to resume (B1), gamepad `Start` to pause on pad 0 (A3) and pad 1 (A4), and clicking Resume (B8). Screenshots `run1-pad-start-pause.png` (pause menu open with Resume highlighted after a silent pad-`Start` pause) and `run1-mouse-resume.png` (play screen after a silent Resume click) show the action happened without a sound; `run1-pause-menu.png` and `run1-countdown-pause.png` show the keyboard pause entries.

## Not covered

- Pan value of `pause`/`unpause` — covered for keyboard `Esc`/`Enter` in TC-012 D3/D4 (both 0).
- Whether the sound is audible, its loudness, or the OS output route — the hook proves a buffer start, not audibility.
- Pause from the volume/stats/controls screens — those screens have no pause affordance in `specs/03-input-and-controls.md`; `Esc` there is "back" (TC-010).
- `Restart` from the pause menu — `specs/05-audio-and-visuals.md` defines no sound for starting a match; not scored.

## Evidence

- `tests/reports/TC-013/run1-results.json` — every sub-case with expected/actual sound names, screen after the step, and the highlighted item.
- `tests/reports/TC-013/run1-pause-menu.png`, `run1-countdown-pause.png` — pause menu after keyboard `Esc` from play and from the countdown.
- `tests/reports/TC-013/run1-pad-start-pause.png` — pause menu open with Resume highlighted after gamepad `Start`; no `pause` sound recorded.
- `tests/reports/TC-013/run1-mouse-resume.png` — play screen after clicking Resume; no `unpause` sound recorded.

## Run history

| Run | Date | Build | Result | Notes |
|---|---|---|---|---|
| 1 | 2026-11-24 | `962dc56` | **FAIL** | 8/12; silent `Esc` resume, silent gamepad `Start` pause (pads 0 and 1), silent mouse Resume |
