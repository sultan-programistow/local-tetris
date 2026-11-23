# TC-010 — Menu navigation and movement sounds

- **Area:** Menus / audio / gameplay SFX
- **Priority:** Medium
- **Date run:** 2026-11-24 (run 1: FAIL — no navigation sounds at all; run 2: FAIL — 16/18 sub-cases pass, keyboard Esc back from Stats and Controls is silent; run 3: PASS on the Web Audio engine)
- **Spec:** `specs/05-audio-and-visuals.md` §"Audio Events (SFX)" — "Move (left/right)", "Soft drop", "Menu navigation (select/back)" are listed SFX events. The spec does not name the files; `src/audio.ts` maps the events to `move.ogg`, `soft_drop.ogg`, `menu_select.ogg`, `menu_back.ogg`.
- **Spec pin:** `specs/05-audio-and-visuals.md` §"Audio Events (SFX)" and §"Sound Design (Panning)" @ `bb71dc0` (sound-file mapping and panning are implementation details read from `src/audio.ts`).
- **Engine note:** from `bb71dc0` sounds play through the Web Audio API (`AudioBufferSourceNode` → `StereoPannerNode` → `GainNode`), not `HTMLAudioElement.play()`. The run 1–2 method no longer observes anything; run 3 uses the Web Audio hook described below.
- **Behaviour under test:** each listed event causes exactly one `HTMLMediaElement.play()` for the expected sound file, on the expected input path, and not otherwise.

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

## Sub-cases and results (run 3, commit bb71dc0)

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
| D1 | All 10 sound assets fetched + decoded | all load, no decode warning | 10/10 fetched (4.1–7.3 kB), no `audio preload failed` | PASS |

Note on C3–C7: soft drop and move only sound when the piece actually moves, so those steps are performed immediately after the countdown. A soft-drop tap on a piece already resting on the stack is silent by design of the check (`!collides(...)`), which is not scored as a failure.

Extra checks recorded in the same run (not part of the original 18): P1 `x` / P2 `]` rotate each play `rotate` once, and a natural piece lock plays `piece_lock`. Both are covered with pan values in TC-012.

## Result (run 3)

**PASS — 18 of 18 sub-cases.** Menu selection, Move, Soft drop, piece lock and every back-key path (keyboard and gamepad) play the expected sound exactly once. The two run 2 failures (silent `Esc` back from Stats and Controls) are fixed by `2cfb966` and re-verified here on the Web Audio engine.

Run 2 (superseded): **FAIL — 2 of 18** — `Esc` back from Stats/Controls was silent.

## Evidence

- `tests/reports/TC-010/run3-screens-and-sfx.json` — back-key screens and move/rotate/soft-drop sub-cases with the recorded sound names.
- `tests/reports/TC-010/run3-hover.json` — A1–A4, C7 and the hover coordinates.
- `tests/reports/TC-010/run3-menu-repeat.json` — A5/A6 ×4 and A7 gamepad repeats.
- `tests/reports/TC-010/run3-gamepad-back.json` — B4.
- `tests/reports/TC-010/run2-*.json|png` — run 2 records (kept for the two failures).
- Run 1 (real audio capture) files: `run1-*.ogg`, `run1-timeline.txt`, `run1-*.png`.

## Notes

- What the hook cannot show: that a blip is audible, its loudness, or that the OS output route works. A recorded `AudioBufferSourceNode.start()` with a loaded buffer is the proxy; volume behaviour is checked in TC-009, panning in TC-012.
- Runs 1–2 mocks (`HTMLMediaElement.play`) are dead code from `bb71dc0` onward: they would record nothing even when a sound plays.
- Run 1 environment limitation (kept for the record): the OpenBot private browser produced no system audio, and `parec` on a null-sink monitor delivered only ~60% of real-time frames, so audio-capture timings were unreliable. `pw-record` captured correctly (4.9 s per 5 s wall) before the rig was retired.

## Run history

| Run | Date | Build | Result | Notes |
|---|---|---|---|---|
| 1 | 2026-11-24 | — | FAIL | No navigation sounds at all (null-sink capture) |
| 2 | 2026-11-24 | `8da9d1f` | FAIL | 16/18; `Esc` back from Stats and Controls silent |
| 3 | 2026-11-24 | `bb71dc0` | PASS | Web Audio hook; all 18 pass, both run 2 failures fixed |
