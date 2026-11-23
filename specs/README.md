# Local Tetris — Specification Index

Project: **Local Tetris** (working name)
Type: 2-player local couch Tetris, single HTML page, no server/sockets.

## Documents

| File | Purpose |
|---|---|
| `01-game-design.md` | Core mechanics, scoring, levels, win condition, piece set |
| `02-technical-spec.md` | Tech stack, architecture, data structures, persistence |
| `03-input-and-controls.md` | Keyboard/gamepad mapping, DAS, lock delay, rotation |
| `04-screens-and-ui.md` | Screens, menus, HUD, game over, stats |
| `05-audio-and-visuals.md` | Audio events, volume, visual style, effects |
| `06-implementation-plan.md` | Suggested build order / milestones |

## Target

- Resolution: 1920×1080, fullscreen, responsive scaling. No mobile focus.
- Browser: modern Chromium/Firefox (Gamepad API support).
- Language: TypeScript + HTML5 Canvas, Vite for dev/build.

## Status

Design complete. Ready for implementation. No code yet.
