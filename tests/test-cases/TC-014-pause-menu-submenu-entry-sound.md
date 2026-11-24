# TC-014 — Submenu entry sound from the pause menu

- **Area:** Menus / audio / submenu entry
- **Priority:** Medium
- **Spec pin:** `specs/05-audio-and-visuals.md` §"Audio Events (SFX)" @ `962dc56` — "Menu enter submenu (opening Stats, Volume, or Controls)" is a listed event; no file is named.
- **Spec:** `tests/e2e/tc-014-pause-menu-submenu-entry-sound.spec.ts` — `npm run test TC-014`

## Must hold

- Opening Stats, Volume or Controls from the **pause menu** plays exactly one entry sound — by keyboard `Enter`, gamepad `A` and mouse click.
- Going back plays `menu_back` and no second entry sound.
- The screen reached is asserted (`STATS` / `VOLUME` / `CONTROLS`), so a silent path cannot pass.

## Notes

- The paused menu shows Resume, Restart, Stats, Volume, Controls, so all three submenus are reachable; TC-010 A10/A11 covers the same event from the main menu.
- For a mouse click the pointer is moved onto the row and left to settle first (that hover is navigation and plays `menu_select`), then the log is cleared and the click is scored.
- The file name is recorded, not scored, because the spec names none; it is currently `menu_enter.ogg`.
- Out of scope permanently: audibility, loudness, OS output route.
- Root cause is out of scope for this asset.

## Can it fail

Removing the entry sound from the submenu branch fails the keyboard Stats step. Restored afterwards.

## History

No failures recorded. Run 1 played `menu_select.ogg` for these entries (spec allowed it); run 2 and run 3 record the dedicated `menu_enter.ogg` wired in `4c74459` — evidence `tests/reports/TC-014/run3-results.json`.
