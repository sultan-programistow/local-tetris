# TC-010 — Menu navigation and movement sounds

- **Area:** Menus / audio / gameplay SFX
- **Priority:** Medium
- **Date run:** 2026-11-24 (run 1: FAIL — no navigation sounds at all; run 2: FAIL — 16/18 sub-cases pass, keyboard Esc back from Stats and Controls is silent)
- **Spec:** `specs/05-audio-and-visuals.md` §"Audio Events (SFX)" — "Move (left/right)", "Soft drop", "Menu navigation (select/back)" are listed SFX events. The spec does not name the files; `src/audio.ts` maps the events to `move.ogg`, `soft_drop.ogg`, `menu_select.ogg`, `menu_back.ogg`.
- **Behaviour under test:** each listed event causes exactly one `HTMLMediaElement.play()` for the expected sound file, on the expected input path, and not otherwise.

## Method (run 2 onward — mocked audio)

- `HTMLMediaElement.prototype.play` is wrapped in the page and every call recorded as `{src, time}`; nothing is recorded when no call happens.
- Each action is followed by a wait and then a read of the recorded list, so a sub-case asserts the exact sequence of sound files a step must produce (usually one, sometimes four or five, sometimes none).
- Sound files are separately fetched and decoded with `decodeAudioData` to prove the assets exist and are valid — this replaces listening to the audio without needing a sink or loopback capture.
- `play()` rejections are collected; none occurred.
- Screenshots confirm which screen each back-key sub-case ran on.

Run 1 used real audio capture from a private PipeWire null sink. That rig was dropped: it needed rewiring, and frame loss in the sink monitor made results unreliable. Run 1 audio evidence is kept for the record but not used for the run 2 verdict.

## Preconditions

1. Production build served at `http://127.0.0.1:4174` (`vite preview`), headless Chromium driven over CDP.
2. Fresh page load before each group; volume `0.7` (`local-tetris:volume`), so `playSfx` is not short-circuited by zero volume.
3. A trusted click for user activation.
4. Gamepad path uses a standard-mapping mock exposed through `navigator.getGamepads()`; buttons 12/13 = D-pad up/down, button 1 = B.

## Sub-cases and results (run 2, commit 8da9d1f)

| # | Action | Expected | Actual | Status |
|---|---|---|---|---|
| A1 | Hover Start → Stats | `menu_select.ogg` ×1 | `menu_select.ogg` ×1 | PASS |
| A2 | Hover the same item again | no call | no call | PASS |
| A3 | Hover the empty row below Controls | no call | no call | PASS |
| A4 | Hover from empty back onto Start | `menu_select.ogg` ×1 | `menu_select.ogg` ×1 | PASS |
| A5 | `↓` ×4 (wraps past Controls) | `menu_select.ogg` ×4 | `menu_select.ogg` ×4 | PASS |
| A6 | `↑` ×4 | `menu_select.ogg` ×4 | `menu_select.ogg` ×4 | PASS |
| A7 | D-pad ↓ ×3, ↑ ×2 | `menu_select.ogg` ×5 | `menu_select.ogg` ×5 | PASS |
| B1 | Volume screen, `Esc` → menu | `menu_back.ogg` ×1 | `menu_back.ogg` ×1 | PASS |
| B2 | Stats screen, `Esc` → menu | `menu_back.ogg` ×1 | no call | **FAIL** |
| B3 | Controls screen, `Esc` → menu | `menu_back.ogg` ×1 | no call | **FAIL** |
| B4 | Volume screen, gamepad `B` → menu | `menu_back.ogg` ×1 | `menu_back.ogg` ×1 | PASS |
| C1 | In play, P1 `a` (move left) | `move.ogg` ×1 | `move.ogg` ×1 | PASS |
| C2 | In play, P1 `d` (move right) | `move.ogg` ×1 | `move.ogg` ×1 | PASS |
| C3 | In play, P1 `s` (soft drop tap) | `soft_drop.ogg` ×1 | `soft_drop.ogg` ×1 | PASS |
| C4 | In play, P2 `ArrowDown` (soft drop tap) | `soft_drop.ogg` ×1 | `soft_drop.ogg` ×1 | PASS |
| C5 | In play, P2 `ArrowLeft` (move left) | `move.ogg` ×1 | `move.ogg` ×1 | PASS |
| C6 | In play, P2 `ArrowRight` (move right) | `move.ogg` ×1 | `move.ogg` ×1 | PASS |
| C7 | In play, P2 `ArrowDown` again | `soft_drop.ogg` ×1 | `soft_drop.ogg` ×1 | PASS |
| D1 | All 10 sound assets fetched + decoded | all decode | all decode, 0.042–0.617 s each | PASS |

Note on C3–C7: soft drop and move only sound when the piece actually moves, so those steps are performed immediately after the countdown. A soft-drop tap on a piece already resting on the stack is silent by design of the check (`!collides(...)`), which is not scored as a failure.

## Result (run 2)

**FAIL — 2 of 18 sub-cases.** Menu selection, Move, Soft drop and the Volume-screen back key all play the expected sound now. `Esc` back from the **Stats** and **Controls** screens plays nothing, although both screens show "Esc to back" and the gamepad `B` path on those screens does play `menu_back.ogg`.

## Evidence

- `tests/reports/TC-010/run2-results.json` — every sub-case with expected and actual call lists, plus the decode table.
- `tests/reports/TC-010/run2-b2-stats-screen.png` — Stats screen open, showing "Esc to back".
- `tests/reports/TC-010/run2-b3-controls-screen.png` — Controls screen open, showing "Press Esc to back".
- `tests/reports/TC-010/run2-b1-volume-screen.png` — Volume screen (passing back key, for contrast).
- `tests/reports/TC-010/run2-game-start.png`, `run2-game-after-input.png` — play screen before/after the move and soft-drop steps.
- Run 1 (real audio capture) files: `run1-*.ogg`, `run1-timeline.txt`, `run1-*.png`.

## Notes

- What the mock cannot show: that a blip is audible, its loudness, or that the OS output route works. Asset decode plus a successful `play()` is the proxy used here; volume behaviour is checked separately in TC-009.
- Run 1 environment limitation (kept for the record): the OpenBot private browser produced no system audio, and `parec` on a null-sink monitor delivered only ~60% of real-time frames, so audio-capture timings were unreliable. `pw-record` captured correctly (4.9 s per 5 s wall) before the rig was retired.
