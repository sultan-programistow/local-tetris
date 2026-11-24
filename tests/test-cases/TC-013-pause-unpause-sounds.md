# TC-013 — Pause and unpause sounds on every input path

- **Area:** Audio / pause / input paths
- **Priority:** Medium
- **Date run:** 2026-11-24 (run 3: PASS, automated; manual run 2: PASS)
- **Automated:** `tests/e2e/tc-013-pause-unpause-sounds.spec.ts` — `npm run test TC-013`
- **Spec:** `specs/05-audio-and-visuals.md` §"Audio Events (SFX)" — "Pause/unpause" is a listed SFX event with no input-path exception. Input paths from `specs/03-input-and-controls.md` (`Esc = pause/menu`, gamepad `Start`, `B`/`Select = back`, mouse supported in menus) and `specs/04-screens-and-ui.md` §"Main Menu" (Resume is the first item when paused). The spec does not name the sound files; `src/audio.ts` maps the events to `pause.ogg` / `unpause.ogg`.
- **Spec pin:** `specs/05-audio-and-visuals.md` §"Audio Events (SFX)" @ `962dc56`; input paths @ `8b4c2ef` / `ceabcd2` as pinned in TC-011.
- **Behaviour under test:** opening the menu over a live match (or the countdown) plays `pause` exactly once, and returning to play plays `unpause` exactly once — on every resume path the app offers. No other sound is required for these actions.

## Preconditions

1. Production build of `4616b7e` served at `http://127.0.0.1:4183` (clean `git archive` copy served statically: `vite preview` in run 1, `python3 -m http.server` in run 2), headless Chrome 158, 1920×1080.
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

## Sub-cases and results (run 2, `4616b7e`; run 1 actuals in the run history)

| # | Input path | Action | Expected | Actual | Screen after | Status |
|---|---|---|---|---|---|---|
| A1 | Keyboard | `Esc` in play | `pause` ×1 | `pause` ×1 | pause menu, Resume highlighted | PASS |
| B1 | Keyboard | `Esc` in the pause menu (Resume selected) | `unpause` ×1 | `unpause` ×1 | play | PASS |
| B2 | Keyboard | `Enter` on Resume | `unpause` ×1 | `unpause` ×1 | play | PASS |
| B3 | Keyboard | `Space` on Resume | `unpause` ×1 | `unpause` ×1 | play | PASS |
| A2 | Keyboard | `Esc` during the countdown | `pause` ×1 | `pause` ×1 | pause menu, Resume highlighted | PASS |
| A3 | Gamepad 0 | `Start` in play | `pause` ×1 | `pause` ×1 | pause menu, Resume highlighted | PASS |
| B4 | Gamepad 0 | `A` on Resume | `unpause` (a `soft_drop` from the same press follows in play) | `unpause`, then `soft_drop` | play | PASS |
| B5 | Gamepad 0 | `B` in the pause menu | `unpause` ×1 | `unpause` ×1 | play | PASS |
| B6 | Gamepad 0 | `Select` (button 8) in the pause menu | `unpause` ×1 | `unpause` ×1 | play | PASS |
| A4 | Gamepad 1 | `Start` in play | `pause` ×1 | `pause` ×1 | pause menu, Resume highlighted | PASS |
| B7 | Gamepad 0 | `Start` again on Resume (after Start opened the menu and was released) | `unpause` ×1 | `unpause` ×1 | play | PASS |
| B8 | Mouse | Click Resume (first item, y ≈ 390) | `unpause` ×1 | `unpause` ×1 | play | PASS |

**Run 3 (automated) result: PASS — 12 of 12.** Run 2 result: PASS — 12 of 12 on `4616b7e` ("Add missing pause/unpause SFX paths"). All four paths that were silent in run 1 now play the expected sound: keyboard `Esc` resume (B1), gamepad `Start` pause on pad 0 (A3) and pad 1 (A4), and mouse Resume (B8). The eight paths that already passed still pass. Screenshots `run2-pad-start-pause.png` (pause menu after gamepad `Start`) and `run2-mouse-resume.png` (play screen after clicking Resume) confirm the actions, and `run2-pause-menu.png` / `run2-countdown-pause.png` the keyboard entries.

Run 1 (superseded, `962dc56`): **FAIL — 8 of 12.** The same four paths performed the action silently, proven by the screen after each step (screenshots `run1-*`).

## Not covered

- Pan value of `pause`/`unpause` — covered for keyboard `Esc`/`Enter` in TC-012 D3/D4 (both 0).
- Whether the sound is audible, its loudness, or the OS output route — the hook proves a buffer start, not audibility.
- Pause from the volume/stats/controls screens — those screens have no pause affordance in `specs/03-input-and-controls.md`; `Esc` there is "back" (TC-010).
- `Restart` from the pause menu — `specs/05-audio-and-visuals.md` defines no sound for starting a match; not scored.

## Evidence

- `tests/reports/TC-013/run2-results.json` — run 2 (`4616b7e`): every sub-case with expected/actual sound names, screen after the step, and the highlighted item.
- `tests/reports/TC-013/run2-*.png` — run 2: pause menu and countdown pause via keyboard, pause menu after gamepad `Start`, play screen after mouse Resume.
- `tests/reports/TC-013/run1-results.json`, `run1-*.png` — run 1 (`962dc56`) with the four silent paths.

## Run history

| Run | Date | Build | Result | Notes |
|---|---|---|---|---|
| 1 | 2026-11-24 | `962dc56` | **FAIL** | 8/12; silent `Esc` resume, silent gamepad `Start` pause (pads 0 and 1), silent mouse Resume |
| 2 | 2026-11-24 | `4616b7e` | **PASS** | 12/12; all four silent paths fixed, no regressions |
| 3 | 2026-11-24 | current | PASS (automated) | `npm run test TC-013`: all 12 paths (A1–A4, B1–B8) play `pause`/`unpause` exactly once and reach the expected screen |

## Automation (run 3)

`tests/e2e/tc-013-pause-unpause-sounds.spec.ts`, run with `npm run test TC-013`. Each step clears the sound log, performs one input, waits 350 ms and asserts the exact file list plus the screen/status from the hook. Keyboard Esc/Enter/Space, gamepad Start/A/B/Select on pads 0 and 1, Esc during the countdown, and a mouse click on Resume are covered. For B4 the same A press that resumes also soft-drops, so the step requires exactly one `unpause` followed by an optional `soft_drop`.

Mutation check: removing the mouse-resume `unpause` play fails B8; restored afterwards.

Evidence: `tests/reports/TC-013/run3-results.json`, `run3-countdown-pause.png`, `run3-pause-menu.png`, `run3-resumed.png`.
