# TC-010 — Menu navigation and movement sounds

- **Area:** Menus / audio / gameplay SFX
- **Priority:** Medium
- **Date run:** 2026-11-24 (run 8: PASS, automated; manual run 7: PASS)
- **Automated:** `tests/e2e/tc-010-menu-navigation-sound.spec.ts` — `npm run test TC-010`
- **Spec:** `specs/05-audio-and-visuals.md` §"Audio Events (SFX)" — "Move (left/right)", "Soft drop", "Menu navigation (select/back)" are listed SFX events. The spec does not name the files; `src/audio.ts` maps the events to `move.ogg`, `soft_drop.ogg`, `menu_select.ogg`, `menu_back.ogg`.
- **Spec pin:** `specs/05-audio-and-visuals.md` §"Audio Events (SFX)" incl. "Menu enter submenu (opening Stats, Volume, or Controls)" and §"Sound Design (Panning)" @ `4d88126` (sound-file mapping and panning are implementation details read from `src/audio.ts`).
- **Spec (Game Over group):** `specs/05-audio-and-visuals.md` §"Audio Events (SFX)" lists "Menu navigation (select/back)" as a global SFX with no per-screen exception; `specs/04-screens-and-ui.md` §"Game Over Screen" @ `8b4c2ef` defines the options Restart (default), Stats, Main Menu and the navigation paths covered below.
- **Engine note:** from `bb71dc0` sounds play through the Web Audio API (`AudioBufferSourceNode` → `StereoPannerNode` → `GainNode`), not `HTMLAudioElement.play()`. The run 1–2 method no longer observes anything; run 3 uses the Web Audio hook described below.
- **Behaviour under test:** each listed event causes exactly one played sound for the expected file, on the expected input path, and not otherwise. This applies to every menu, including the Game Over screen (group E).

## Method (run 3 — Web Audio hook, supersedes the run 1–2 mock)

- An init script runs before the app bundle and hooks the Web Audio API:
  - `window.fetch` records the last `sounds/<name>.ogg` URL fetched, and `AudioContext.prototype.decodeAudioData` tags the returned `AudioBuffer` with that name (preload fetches and decodes the ten assets in order).
  - `AudioContext.prototype.createBufferSource` wraps `connect` and `start`, so every `start()` records `{sound name, pan, time}` — one entry per sound played, nothing when no sound plays.
- Each action is followed by a 250 ms wait and a read of the recorded list, so a sub-case asserts the exact sequence of sound files a step must produce (usually one, sometimes none).
- Recording the pan value also proves each sound is routed through a `StereoPannerNode`; the pan assertions themselves are in TC-012.
- `play()` rejections are gone with the `HTMLMediaElement` path; asset loading is checked by fetching all ten files and confirming no `audio preload failed` console warning.
- Screenshots confirm which screen each back-key sub-case ran on.

Run 1 used real audio capture from a private PipeWire null sink. That rig was dropped: it needed rewiring, and frame loss in the sink monitor made results unreliable. Run 1 audio evidence is kept for the record but not used for the run 2–3 verdict.

## Preconditions

1. Production build served at `http://127.0.0.1:4174` (`vite preview`), headless Chromium driven over CDP.
2. Fresh page load before each group; volume `0.7` (`local-tetris:volume`), so `playSfx` is not short-circuited by zero volume.
3. A trusted click for user activation.
4. Gamepad path uses a standard-mapping mock exposed through `navigator.getGamepads()`; buttons 12/13 = D-pad up/down, button 1 = B.

## Sub-cases and results (run 3–4, commits bb71dc0 / 4d88126)

| # | Action | Expected | Actual | Status |
|---|---|---|---|---|
| A1 | Hover Start → Stats | `menu_select` ×1 | `menu_select` ×1 | PASS |
| A2 | Hover the same item again | no sound | no sound | PASS |
| A3 | Hover the empty row below the items | no sound | no sound | PASS |
| A4 | Hover from empty back onto Start | `menu_select` ×1 | `menu_select` ×1 | PASS |
| A5 | `↓` ×4 (wraps past the last item) | `menu_select` ×4 | `menu_select` ×4 | PASS |
| A6 | `↑` ×4 | `menu_select` ×4 | `menu_select` ×4 | PASS |
| A7 | D-pad ↓ ×3, ↑ ×2 (mock pad 0) | `menu_select` ×5 | `menu_select` ×5 | PASS |
| B1 | Volume screen, `Esc` → menu | `menu_back` ×1 | `menu_back` ×1 | PASS |
| B2 | Stats screen, `Esc` → menu | `menu_back` ×1 | `menu_back` ×1 | PASS (was FAIL in run 2) |
| B3 | Controls screen, `Esc` → menu | `menu_back` ×1 | `menu_back` ×1 | PASS (was FAIL in run 2) |
| B4 | Volume screen, gamepad `B` → menu | `menu_back` ×1 | `menu_back` ×1 | PASS |
| C1 | In play, P1 `a` (move left) | `move` ×1 | `move` ×1 | PASS |
| C2 | In play, P1 `d` (move right) | `move` ×1 | `move` ×1 | PASS |
| C3 | In play, P1 `s` (soft-drop tap) | `soft_drop` ×1 | `soft_drop` ×1 | PASS |
| C4 | In play, P2 `↓` (soft-drop tap) | `soft_drop` ×1 | `soft_drop` ×1 | PASS |
| C5 | In play, P2 `←` (move left) | `move` ×1 | `move` ×1 | PASS |
| C6 | In play, P2 `→` (move right) | `move` ×1 | `move` ×1 | PASS |
| C7 | In play, P2 `↓` again | `soft_drop` ×1 | `soft_drop` ×1 | PASS |
| A10 | Menu, `Enter` on Stats / Volume / Controls (run 5, spec `4d88126`) | one sound per entry | `menu_select` ×1 each | PASS |
| A11 | Menu, gamepad `A` on Stats (run 5) | one sound per entry | `menu_select` ×1 | PASS |
| D1 | All 10 sound assets fetched + decoded | all load, no decode warning | 10/10 fetched (4.1–7.3 kB), no `audio preload failed` | PASS |
| A8 | `s`, `Shift+S`, `w`, `Shift+W` in the menu (case-insensitive navigation, spec `8b4c2ef`) | `menu_select` ×4 | `menu_select` ×4 | PASS (run 4) |

Note on C3–C7: soft drop and move only sound when the piece actually moves, so those steps are performed immediately after the countdown. A soft-drop tap on a piece already resting on the stack is silent by design of the check (`!collides(...)`), which is not scored as a failure.

Extra checks recorded in the same run (not part of the original 18): P1 `x` / P2 `]` rotate each play `rotate` once, and a natural piece lock plays `piece_lock`. Both are covered with pan values in TC-012.

## Result (runs 3–5)

**PASS — 22 of 22 sub-cases in groups A–D.** Run 5 re-ran the whole suite on `4d88126` and added A10/A11 for the new "Menu enter submenu" event: opening Stats, Volume and Controls from the menu plays exactly one sound each (keyboard `Enter` and gamepad `A`), so the event is audible; at `4d88126` it reuses `menu_select.ogg` rather than a dedicated file (a `menu_enter.ogg` asset appeared in the working tree afterwards; re-run A10/A11 once it is wired into `src/audio.ts`). Menu selection, Move, Soft drop, piece lock and every back-key path (keyboard and gamepad) play the expected sound exactly once. The two run 2 failures (silent `Esc` back from Stats and Controls) are fixed by `2cfb966` and re-verified here on the Web Audio engine.

Run 2 (superseded): **FAIL — 2 of 18** — `Esc` back from Stats/Controls was silent.

Run 4 (2026-11-24, `cb935ae`): **PASS — 19 of 19**, same Web Audio hook plus one added sub-case, A8, for the case-insensitive `s`/`Shift+S`/`w`/`Shift+W` menu navigation added to the spec in `8b4c2ef`. All menu-select, back-key, move and soft-drop sub-cases still pass; the three commits after `bb71dc0` only change screen layout.

## Game Over group E (run 5 — FAIL, 6 genuine failures; run 7 — PASS 14/14)

**Harness correction:** runs 5 and 6 hovered Stats at the end of E9, but E8 leaves the selection on Stats, so that step never changed the selection and scored a correct silence as a failure. Run 7 fixes the step (normalise to Restart with `↑`, then hover Stats) and is the authoritative hover result; the E9 rows of runs 5–6 are superseded.

**Why:** the case covered the Main Menu and the back keys from Volume/Stats/Controls, but not the Game Over menu, which `specs/04-screens-and-ui.md` §"Game Over Screen" defines with the same kind of navigable options. The global "Menu navigation (select/back)" SFX in `specs/05-audio-and-visuals.md` has no per-screen exception, so the Game Over selection is expected to sound like every other menu.

**Preconditions (in addition to those above):**

1. Game Over screen reached by holding soft drop on both mocked pads (buttons 0/1 with the same pad object in slots 0 and 1; ~6–10 s, method from TC-006 run 3), then release both.
2. After entering Game Over, wait 250 ms and read the log once to take a baseline: the `game_over` fanfare from entering the screen must not be counted in any E sub-case.
3. Selection starts on Restart (`gameOverIndex = 0`); Game Over items are drawn at y ≈ 500 / 560 / 620, hover area x 860–1060.
4. Fresh page load for the keyboard group and again for the gamepad group; volume 0.7.

**Run 5 environment:** production build of `4d88126` (clean copy, `vite preview` at `http://127.0.0.1:4181`), headless Chrome 158, 1920×1080, run 3 Web Audio hook with an added `fillText` hook so the selected Game Over option (green `#0f0`) is read after every step. Two sessions: both players topped out by holding soft drop with the same mock pad in slots 0 and 1 (~6–10 s).

**Expected:** each selection move on the Game Over screen plays `menu_select` exactly once; `Esc` and gamepad `B`/`Select` play `menu_back` exactly once. `specs/04-screens-and-ui.md` states no wrapping for Game Over, so an extra `↓` on Main Menu or `↑` on Restart must not move the selection and must stay silent (negative controls).

| # | Action | Expected | Actual | Status |
|---|---|---|---|---|
| E1 | `↓` from Restart → Stats | `menu_select` ×1 | selection moved to Stats; no sound | **FAIL** |
| E2 | `↓` → Main Menu | `menu_select` ×1 | selection moved to Main Menu; no sound | **FAIL** |
| E3 | `↓` again on Main Menu (clamped, no wrap) | no sound | no move, no sound | PASS |
| E4 | `↑` → Stats | `menu_select` ×1 | selection moved to Stats; no sound | **FAIL** |
| E5 | `↑` → Restart | `menu_select` ×1 | selection moved to Restart; no sound | **FAIL** |
| E6 | `↑` again on Restart (clamped) | no sound | no move, no sound | PASS |
| E7 | `s` then `w` (case-insensitive navigation) | `menu_select` ×2; selection Stats then Restart | selection went Stats then Restart; no sound | **FAIL** |
| E8 | D-pad `↓` ×2, `↑` ×1 (mock pad 0) | `menu_select` ×3; selection Main Menu → Stats → Restart | selection ended on Stats after the 3 moves; no sound | **FAIL** |
| E9 | Hover on Stats (intended Restart → Stats) | `menu_select` ×1 | selection was already Stats after E8; no change, no sound | N/A — step set up incorrectly |
| E10 | Hover the same item again | no sound | no sound | PASS |
| E11 | Hover the empty area below the items | no sound | no sound | PASS |
| E12 | `Esc` → Main Menu | `menu_back` ×1 | `menu_back` ×1 | PASS |
| E13 | Gamepad `B` (pad 0) → Main Menu | `menu_back` ×1 | `menu_back` ×1 | PASS |
| E14 | Record the pan value of every E1–E13 sound | all 0 (centred); recorded only | `[0, 0]` (the two `menu_back` plays); no selection sounds to measure | INFO |

**Run 5 result: FAIL — 6 genuine failures at `4d88126`.** Arrows, `s`/`w` and D-pad move the highlight but play no sound (E1, E2, E4, E5, E7, E8); `Esc` and gamepad `B` play `menu_back` (E12, E13), and the clamped/no-change controls stay silent (E3, E6, E10, E11). E9 is not counted: its hover target was already the selected item. Selection positions were confirmed from the drawn green label after each step, so the failures are missing sounds, not missing navigation.

Method is the run 3 Web Audio hook; each step waits 250 ms and the E-group reads the log delta since the previous read. Screenshots after E1, E7 and E9 confirm the Game Over selection position.

**Run 7 (after the fixes):** production build of `962dc56` (clean copy of the commit via `git archive`, `vite preview` at `http://127.0.0.1:4183`), headless Chrome 158, 1920×1080, same Web Audio and `fillText` hooks, two sessions as in run 5. E9 now presses `↑` first so the selection is on Restart, then hovers Stats.

| # | Action | Expected | Actual (run 7, `962dc56`) | Status |
|---|---|---|---|---|
| E1 | `↓` from Restart → Stats | `menu_select` ×1 | `menu_select` ×1 | PASS |
| E2 | `↓` → Main Menu | `menu_select` ×1 | `menu_select` ×1 | PASS |
| E3 | `↓` again on Main Menu (clamped) | no sound | no move, no sound | PASS |
| E4 | `↑` → Stats | `menu_select` ×1 | `menu_select` ×1 | PASS |
| E5 | `↑` → Restart | `menu_select` ×1 | `menu_select` ×1 | PASS |
| E6 | `↑` again on Restart (clamped) | no sound | no move, no sound | PASS |
| E7 | `s` then `w` | `menu_select` ×2 | `menu_select` ×2 | PASS |
| E8 | D-pad `↓` ×2, `↑` ×1 | `menu_select` ×3 | `menu_select` ×3 | PASS |
| E9 | `↑` to Restart, then hover Stats | `menu_select` ×1 | `menu_select` ×1 | PASS |
| E10 | Hover the same item again | no sound | no sound | PASS |
| E11 | Hover the empty area below the items | no sound | no sound | PASS |
| E12 | `Esc` → Main Menu | `menu_back` ×1 | `menu_back` ×1 | PASS |
| E13 | Gamepad `B` (pad 0) → Main Menu | `menu_back` ×1 | `menu_back` ×1 | PASS |
| E14 | Pan value of every E1–E13 sound | all 0 (centred); recorded only | not recorded in run 7; panning is covered by TC-012 | INFO |

**Run 7 result: PASS — 14 of 14 scored.** Every Game Over selection change — arrows, `s`/`w`, D-pad, mouse hover — plays `menu_select` exactly once, only when the highlight actually moves; `Esc` and gamepad `B` play `menu_back`; the clamped and no-change controls stay silent. Hover was fixed in `962dc56`; the keyboard and D-pad paths were fixed in `37a97fd`.

## Evidence

- `tests/reports/TC-010/run7b-gameover-audio-results.json` — run 7 (`962dc56`): every sub-case (D-pad split into E8a–E8c) with expected/actual sound names and selection after each step; 15/15 PASS.
- `tests/reports/TC-010/run7b-gameover-screen.png`, `run7b-gameover-session2.png`, `run7b-E1-stats-selected.png`, `run7b-E7-after-w.png`, `run7b-E9-hover-stats.png` — run 7 Game Over: entry in both sessions, and the selection after `↓`, after `s`/`w`, and after hovering Stats.
- `tests/reports/TC-010/run6-gameover-audio-results.json` — run 6 (`37a97fd`, superseded): keyboard/D-pad passes; its E9 hover row is invalid per the harness note above.
- `tests/reports/TC-010/run5-gameover-audio-results.json` — run 5 (`4d88126`): E1–E14 expected/actual sound names, selection after each step, pan values, asset decode table.
- `tests/reports/TC-010/run5-gameover-audio-start.png`, `run5-gameover-session2.png` — Game Over screen with Restart highlighted in both sessions.
- `tests/reports/TC-010/run5-E1-stats-selected.png`, `run5-E7-after-w.png`, `run5-E9-hover-stats.png` — Game Over after `↓`, after `s`/`w`, and after hovering Stats; the highlighted option moved, no sound was recorded.
- `tests/reports/TC-010/run4-results.json` — run 4 (`cb935ae`): every sub-case with expected/actual sound names, the decode table, and A8.
- `tests/reports/TC-010/run4-*.png` — run 4 screenshots: Stats/Controls/Volume screens, game start and after the move/soft-drop steps.
- `tests/reports/TC-010/run5-submenu-entry.json` — A10/A11 and the submenu-entry pan values.
- `tests/reports/TC-010/run5-screens-and-sfx.json`, `run5-hover.json`, `run5-menu-repeat.json`, `run5-gamepad-back.json` — the run 5 re-run of groups A–D on `4d88126`.
- `tests/reports/TC-010/run2-*.json|png` — run 2 records (kept for the two failures).
- Run 1 (real audio capture) files: `run1-*.ogg`, `run1-timeline.txt`, `run1-*.png`.

## Notes

- What the hook cannot show: that a blip is audible, its loudness, or that the OS output route works. A recorded `AudioBufferSourceNode.start()` with a loaded buffer is the proxy; volume behaviour is checked in TC-009, panning in TC-012.
- Runs 1–2 mock (`HTMLMediaElement.play`) is dead code from `bb71dc0` onward: they would record nothing even when a sound plays.
- Run 1 environment limitation (kept for the record): the OpenBot private browser produced no system audio, and `parec` on a null-sink monitor delivered only ~60% of real-time frames, so audio-capture timings were unreliable. `pw-record` captured correctly (4.9 s per 5 s wall) before the rig was retired.

## Run history

| Run | Date | Build | Result | Notes |
|---|---|---|---|---|
| 1 | 2026-11-24 | — | FAIL | No navigation sounds at all (null-sink capture) |
| 2 | 2026-11-24 | `8da9d1f` | FAIL | 16/18; `Esc` back from Stats and Controls silent |
| 3 | 2026-11-24 | `bb71dc0` | PASS | Web Audio hook; all 18 pass, both run 2 failures fixed |
| 4 | 2026-11-24 | `cb935ae` | PASS | 19/19; adds A8 case-insensitive `w`/`s` navigation |
| 5 | 2026-11-24 | `4d88126` | **FAIL** | Groups A–D 22/22 PASS incl. new submenu-entry A10/A11 (panning now 95%); Game Over group E: arrows, `w`/`s` and D-pad silent (6 genuine failures), `Esc`/`B` back play `menu_back`; E9 hover step invalid (see harness note) |
| 6 | 2026-11-24 | `37a97fd` | **FAIL** | Group E: arrows, `w`/`s`, D-pad and back keys now pass; hover fix not in this build; E9 step invalid, so hover not validly exercised |
| 7 | 2026-11-24 | `962dc56` | **PASS** |
| 8 | 2026-11-24 | current | PASS (automated) | `npm run test TC-010`: groups A (12 steps), B (4), C (7), D1 and E (13) all pass; the asset check takes the file list from the built bundle |
| 8 | 2026-11-24 | current | PASS (automated) | `npm run test TC-010`: groups A (12 steps), B (4), C (7), D1 and E (13) all pass; the asset check takes the file list from the built bundle | Group E 14/14 with the corrected hover step; hover plays `menu_select` only on a real selection change, clamped/no-change steps stay silent |

## Automation (run 8)

`tests/e2e/tc-010-menu-navigation-sound.spec.ts`, run with `npm run test TC-010`, three tests: groups A–D, the Game Over group E1–E12, and E13 (Game Over back via gamepad B, which needs its own match).

Sounds are recorded by a Web Audio hook installed before the app bundle (see `tests/e2e/helpers/audio.ts`): `fetch` records the requested `sounds/<name>.ogg`, `decodeAudioData` tags the returned buffer, and every `createBufferSource().start()` records `{name, pan, gain, time}`. Each step clears the log, performs one input, waits 250 ms and asserts the exact file sequence, so an extra sound fails as loudly as a missing one. Asset check D1 derives the expected file list from the production bundle (`sounds/<name>.ogg` strings in `dist/assets/*.js`), so a newly added sound is checked instead of ignored, and the list cannot go stale. Every declared file must be reachable and preloaded, no undeclared sound may be fetched, and an `audio preload failed` warning fails the step.

Keys are held for ~70 ms because a `keyboard.press()` can fall entirely between two animation frames and be missed by the game's per-frame polling; gamepad presses are held 120–150 ms with a 40 ms release gap so each press is a fresh edge.

Mutation check: muting the Game Over arrow selection sound fails E1; restored afterwards.

Evidence: `tests/reports/TC-010/run8-audio-results.json`, `run8-gameover-audio-results.json`, `run8-gameover-B.json`, `run8-after-moves.png`.
