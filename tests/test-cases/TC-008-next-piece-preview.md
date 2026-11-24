# TC-008 — Next-piece preview shows the piece that actually spawns next

- **Area:** Rendering / HUD
- **Priority:** Medium
- **Spec pin:** `specs/04-screens-and-ui.md` §"Play Screen" @ `4379d90` — next piece rendered in a small 4×4-cell preview box in the player's HUD, same colours, spawn orientation.
- **Spec:** `tests/e2e/tc-008-next-piece-preview.spec.ts` — `npm run test TC-008`

## Must hold

- Each player's 4×4 box shows exactly one piece, in spawn orientation and its palette colour.
- The piece that spawns next is the one the preview showed, on both boards, over several spawns.
- Both players' previews agree (shared sequence).
- The box is drawn, bordered and empty during the countdown.

## Notes

- Box pixels are read at cell centres and classified by exact palette colour, then compared with the hook's `next`, with the spawn-orientation shape from `src/game/pieces.ts`, and finally with the piece that actually spawns.
- The game advances state in one animation frame and paints on a later one, so a capture waits for a drawn frame and requires the state to be unchanged across the pixel read; without that, one run in three paired a fresh preview with a stale state.
- Observation, not a failure: odd-sized pieces sit one cell off exact centre (floor rounding). Cosmetic, flagged, never scored.
- Out of scope permanently: pentomino previews above level 2 (user decision).
- Root cause is out of scope for this asset.

## Can it fail

Setting `nextDef = def` (preview shows the current piece) fails the preview-vs-next-spawn assertion. Restored afterwards.

## History

No failures recorded; run 1 manual, run 2 automated — evidence `tests/reports/TC-008/run2-preview.json`.
