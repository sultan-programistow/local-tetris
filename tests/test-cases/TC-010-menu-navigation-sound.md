# TC-010 — Menu navigation, movement and Game Over sounds

- **Area:** Menus / audio / gameplay SFX
- **Priority:** Medium
- **Spec pin:** `specs/05-audio-and-visuals.md` §"Audio Events (SFX)" incl. "Menu enter submenu" @ `4d88126`; `specs/04-screens-and-ui.md` §"Game Over Screen" @ `8b4c2ef`.
- **Spec:** `tests/e2e/tc-010-menu-navigation-sound.spec.ts` — `npm run test TC-010`

## Must hold

Each listed event plays **exactly one** sound, for the expected file, on the expected input path — and no sound where none is defined:

- **A** menu navigation: hover onto an item, arrows, W/S (incl. Shift) and D-pad move the selection and sound once; re-hovering the same item, hovering empty space and clamped moves stay silent.
- **B** back keys: `Esc` and gamepad `B` from Stats/Volume/Controls play `menu_back`.
- **C** play: move left/right and a soft-drop tap sound only when the piece actually moves.
- **D** assets: every sound file the built bundle declares is reachable and preloaded, with no `audio preload failed` warning.
- **E** Game Over menu: selection moves (arrows, `s`/`w`, D-pad, hover) play once and only when the highlight actually moves; `Esc`/`B` play `menu_back`; clamped steps stay silent.

## Notes

- Sounds are recorded by a Web Audio hook installed before the bundle: `fetch` records `sounds/<name>.ogg`, `decodeAudioData` tags the buffer, and every `createBufferSource().start()` records `{name, pan, gain, time}`.
- The expected asset list is derived from the production bundle (`sounds/<name>.ogg` strings in `dist/assets/*.js`), so a newly added sound is checked instead of ignored.
- The spec names no files; the event→file mapping is read from `src/audio.ts`. Submenu entry asserts one sound, its file is not scored.
- A soft-drop tap on a piece already resting on the stack is silent by design of the check, and is not a failure.
- Keys held ~70 ms and pad presses 120–150 ms with a 40 ms gap: a shorter press can fall between two animation frames and be missed.
- Out of scope permanently: audibility, loudness, OS output route.
- Root cause is out of scope for this asset.

## Can it fail

Muting the Game Over arrow selection sound fails E1. Restored afterwards.

## History

| Run | Date | Result | Failure |
|---|---|---|---|
| 1 | 2026-11-23 | FAIL | no navigation sounds at all (captured on a null sink; rig later retired) |
| 2 | 2026-11-23 | FAIL | 16/18 — `Esc` back from Stats and Controls silent (fixed in `2cfb966`) |
| 5 | 2026-11-24 | FAIL | 6 genuine failures — Game Over selection moves (arrows, `s`/`w`, D-pad) silent; fixed keyboard/D-pad in `37a97fd`, hover in `962dc56` |
| 6 | 2026-11-24 | FAIL | hover fix not in that build; hover step invalid, so not validly exercised |

Last automated run: run 9, PASS (2026-11-24) — evidence `tests/reports/TC-010/run9-audio-results.json`.
