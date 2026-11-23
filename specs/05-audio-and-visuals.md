# 05 — Audio & Visuals

## Audio Events (SFX)

- Move (left/right) — subtle.
- Rotate (CW/CCW).
- Soft drop.
- Piece lock.
- Line clear.
- Level up — none (silent progression).
- Game over.
- Pause/unpause.
- Menu navigation (select/back).

## Volume

- Single volume slider 0–1, persisted to localStorage.
- 0 = silent (no separate mute toggle).
- Applies to all SFX.

## Visual Effects

- Line clear: flash affected rows + brief particle burst before removal.
- Piece lock: subtle (optional).
- Level up: no visual banner.
- Game over: winner highlight.
- Countdown: 3-2-1 with scale/fade.

## Color Palette (suggested)

- Background: dark (e.g., #0f1115).
- Grid lines: subtle gray.
- Board border: clearly visible outline (distinct color, e.g. light gray/white, 2px) around each 10×20 playfield so players can easily see board edges; cell borders slightly brighter than background for readability.
- Classic 7 pieces: standard Tetris colors (I cyan, O yellow, T purple, S green, Z red, J blue, L orange).
- New pieces: distinct vibrant colors (pink, teal, lime, etc.), assigned per shape.

## Responsive

- Scale canvas to fit window preserving aspect ratio; letterbox if needed.
- Board sizing: the two 10×20 playfields together take ~40–45% of the horizontal screen width; remaining space for HUD (score, level, next preview, stats). Scale cell size accordingly; target 1920×1080.
- Target 1920×1080; no mobile-specific layout.
