# 02 — Technical Spec

## Tech Stack

- TypeScript + HTML5 Canvas 2D.
- Vite (dev server + build).
- No framework (no React). No backend, no sockets.
- Web Gamepad API for gamepad input.

## Project Structure (suggested)

```
local-tetris/
  index.html
  src/
    main.ts          # entry, screen router
    game/            # board, piece, collision, rotation (SRS)
    input/           # keyboard + gamepad, DAS
    render/          # canvas drawing
    audio/           # sound effects, volume
    screens/         # menu, countdown, play, gameover, stats
    storage/         # localStorage (stats, volume, mute pref)
    rng/             # seeded PRNG
  public/
    sounds/          # sfx files
  vite.config.ts
```

## Core Data Structures

- `Board`: 2D grid (10×20) of cell color/null.
- `Piece`: shape matrix, position, rotation state, color.
- `GameState`: boards[2], current pieces[2], queues[2] (next 1), scores[2], levels[2], piecesPlaced[2], status (playing/gameover), seed.
- `Stats`: sessionsPlayed, sessionsPlayedToday, totalPlayTimeMs, todayPlayTimeMs (reset when date changes), winsP1, winsP1Today, winsP2, winsP2Today, lastSessions[] (max 5: date, winner, scores, pieces). Win % derived.

## Seeded RNG

- Use a simple seeded PRNG (e.g., mulberry32 or xoshiro). Same seed → identical piece sequence for both boards.
- Piece selection: bag randomizer? For simplicity, seeded random from piece pool (standard then expanded). Ensure fairness: maybe 7-bag for standard pieces, then random from expanded pool. Decision: use seeded random pick from current pool (simpler). Developer may refine.

## Persistence (localStorage)

Keys:
- `local-tetris:stats` — Stats object.
- `local-tetris:volume` — number 0–1.
- No reset option in v1.

## Rendering

- Single canvas, responsive scaling to fit window (target 1920×1080). Maintain aspect ratio, letterbox if needed.
- 60fps game loop via requestAnimationFrame.
- Delta-time based updates for drops.

## Audio

- HTML5 Audio or Web Audio API. Volume controlled by slider; 0 = silent (no separate mute).
- SFX files in /public/sounds.
