# TC-012 — Sound panning: P1 left, P2 right, UI centred

- **Area:** Audio / stereo panning
- **Priority:** Medium
- **Date run:** 2026-11-24 (run 1: PASS at 85%; run 2: PASS at the new 95% spec)
- **Environment:** Chromium (headless, CDP-driven), production build served at `http://127.0.0.1:4174` (`vite preview`), build commit `4d88126` ("Update sound panning to 95%").
- **Spec:** `specs/05-audio-and-visuals.md` §"Sound Design (Panning)" — player-related sounds (piece lock, soft drop, rotate, move, line clear, game over for that player) at 95% left for P1 and 95% right for P2; non-player sounds (menu navigation, select/back, volume test blip, countdown, global game over fanfare) centred (pan 0); implemented with the Web Audio API.
- **Spec pin:** `specs/05-audio-and-visuals.md` §"Sound Design (Panning)" @ `4d88126` (P1 = −0.95, P2 = +0.95, UI = 0). Run 1 used the previous 85% value.
- **Behaviour under test:** every sound played for P1 gets a `StereoPannerNode` with `pan = −0.95`, every P2 sound `pan = +0.95`, every menu/UI sound `pan = 0`, on both the keyboard and the gamepad input paths.

## Preconditions

1. Production build of `bb71dc0` served at `http://127.0.0.1:4174`.
2. Volume `0.7` (not zero), so `playSfx` is not short-circuited.
3. A trusted click on the page for the AudioContext to start.
4. Gamepad path uses a standard-mapping mock exposed through `navigator.getGamepads()` (pads 0 and 1), same method as TC-005/TC-009.

## Method

- An init script runs before the app bundle and hooks the Web Audio API:
  - `window.fetch` records the last `sounds/<name>.ogg` URL fetched, and `AudioContext.prototype.decodeAudioData` tags the returned `AudioBuffer` with that name (preload fetches and decodes the ten assets sequentially).
  - `AudioContext.prototype.createStereoPanner` marks the node, so the panner a buffer source connects to can be identified.
  - `AudioContext.prototype.createBufferSource` wraps `connect` and `start`, so every `start()` records `{sound name, panner.pan.value, time}`.
- Each action clears the log, performs one input, waits 250 ms and reads the recorded list.
- No audio capture or listening is involved: the assertion is on the pan value the app sets, which is the spec's stated value.

## Sub-cases and results (run 2, commit `4d88126`)

| # | Input path | Action | Expected | Actual (run 2) | Status |
|---|---|---|---|---|---|
| A1 | Keyboard | In play, P1 `a` (move left) | `move`, −0.85 | `move`, −0.850 | PASS |
| A2 | Keyboard | In play, P1 `d` (move right) | `move`, −0.85 | `move`, −0.850 | PASS |
| A3 | Keyboard | In play, P1 `s` (soft-drop tap) | `soft_drop`, −0.85 | `soft_drop`, −0.850 | PASS |
| A4 | Keyboard | In play, P1 `x` (rotate CW) | `rotate`, −0.85 | `rotate`, −0.850 | PASS |
| A5 | Keyboard | In play, P1 piece locks | `piece_lock`, −0.85 | `piece_lock`, −0.850 | PASS |
| B1 | Keyboard | In play, P2 `←` (move left) | `move`, +0.95 | `move`, +0.950 | PASS |
| B2 | Keyboard | In play, P2 `→` (move right) | `move`, +0.95 | `move`, +0.950 | PASS |
| B3 | Keyboard | In play, P2 `↓` (soft-drop tap) | `soft_drop`, +0.95 | `soft_drop`, +0.950 | PASS |
| B4 | Keyboard | In play, P2 `]` (rotate CW) | `rotate`, +0.95 | `rotate`, +0.950 | PASS |
| B5 | Keyboard | In play, P2 piece locks | `piece_lock`, +0.95 | `piece_lock`, +0.950 | PASS |
| C1 | Gamepad | In play, pad 0 D-pad left | `move`, −0.85 | `move`, −0.850 | PASS |
| C2 | Gamepad | In play, pad 0 D-pad down | `soft_drop`, −0.85 | `soft_drop`, −0.850 | PASS |
| C3 | Gamepad | In play, pad 1 D-pad left | `move`, +0.95 | `move`, +0.950 | PASS |
| C4 | Gamepad | In play, pad 1 `A` | `soft_drop`, +0.95 | `soft_drop`, +0.950 | PASS |
| D1 | Keyboard | Menu `↓` | `menu_select`, 0 | `menu_select`, 0.000 | PASS |
| D2 | Gamepad | Menu D-pad `↓` | `menu_select`, 0 | `menu_select`, 0.000 | PASS |
| D3 | Keyboard | `Esc` in play → menu | `pause`, 0 | `pause`, 0.000 | PASS |
| D4 | Keyboard | Enter on "Resume" | `unpause`, 0 | `unpause`, 0.000 | PASS |
| D5 | Keyboard | Volume screen `→` (volume test blip) | `menu_select`, 0 | `menu_select`, 0.000 | PASS |
| D6 | Keyboard | Volume screen `Esc` → menu | `menu_back`, 0 | `menu_back`, 0.000 | PASS |
| D7 | Keyboard | Stats screen `Esc` → menu | `menu_back`, 0 | `menu_back`, 0.000 | PASS |
| D8 | Keyboard | Controls screen `Esc` → menu | `menu_back`, 0 | `menu_back`, 0.000 | PASS |
| E1 | — | All ten sound assets fetched and decoded | no decode warning | 10/10 fetched (4.1–7.3 kB each), no `audio preload failed` warning | PASS |

Pan values read back as `0.949999988079071`-type float32 values / `0`, shown rounded above.

## Not covered

- **Line clear** — no line was completed in this run, so `line_clear` panning (code uses the same per-player −0.95/+0.95) is unverified.
- **Game over** — `game_over` is played with the default pan (centred). The spec lists "game over for that player" among panned sounds and "global game over fanfare" as centred, so it is unclear which one this call is meant to be; flagged for a spec/implementation decision rather than scored.
- Countdown has no sound effect at all, so its "centred" requirement is vacuous.

## Result

**PASS** — all player sounds checked on keyboard and gamepad carry the correct per-player pan (95% left/right per the updated spec), and every menu/UI sound is centred.

## Evidence

- `tests/reports/TC-012/run2-keyboard-panning.json` — menu, Stats/Volume/Controls back, move, rotate, soft drop for both players.
- `tests/reports/TC-012/run2-locks-pause.json` — simultaneous P1/P2 piece locks and pause/unpause.
- `tests/reports/TC-012/run2-gamepad-panning.json` — D-pad and A on both mock pads.
- `tests/reports/TC-012/run2-volume-screen.png`, `run2-play-screen.png`; run 1 evidence (`run1-*.json|png`) kept for the 85% run — screens the sub-cases ran on.

## Notes

- The asset-fetch/decode check (E1) only proves the buffers loaded; the pan assertion proves the routing the app configures. That the sound is physically audible in the left/right speaker is not checked.
