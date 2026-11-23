# TC-004 — Board border is inside the viewport

- **Area:** Rendering / layout
- **Priority:** Medium
- **Date run:** 2026-11-23
- **Environment:** Chromium (OpenBot browser), `http://localhost:5173`, dev server, viewport 1781×1103, canvas 1920×1080 (scaled ≈0.928×)

## Preconditions

1. The app is running (`npm run dev`) at `http://localhost:5173`.
2. A match is in progress (boards rendered).

## Expected result

The board border (outer grid lines) of both players is fully visible inside the browser viewport — i.e. the displayed bounding box of each 10×20 board lies within `window.innerWidth` × `window.innerHeight`, and the border is actually drawn (non-background pixels at the board corners).

## Steps

1. Load `http://localhost:5173`, start a match, wait for the countdown to finish.
2. For each board (P1: logical origin (200,80); P2: (1480,80); size 240×480):
   - Sample the corner pixels and their 5×5 neighborhoods for non-background pixels (confirms the border is drawn).
   - Compute the displayed bounding box from `canvas.getBoundingClientRect()` and the scale factor, and check it is inside `window.innerWidth` × `window.innerHeight`.

## Actual result

Both boards' borders are drawn and fully inside the viewport:

| Board | Corner non-bg pixels (5×5) | Displayed bbox (left, top, right, bottom) | Inside viewport |
|---|---|---|---|
| P1 | yes (e.g. (200,80) = 204,204,204 anti-aliased grid) | 178.0, 124.7, 400.7, 570.0 | yes |
| P2 | yes | 1365.4, 124.7, 1588.0, 570.0 | yes |

Viewport: 1781×1103. Canvas displayed: 1781.0×1001.8 (top offset 50.5).

## Status

**PASS** — board border is inside the viewport for both players.

## Verification

Pixel sampling of corner pixels (non-background = grid/border drawn) plus geometry check of the displayed bounding box against `window.innerWidth`/`window.innerHeight`. No image input used.

## Notes / follow-up

- Replaces the previous "first tile visible" criterion (renamed from TC-004-first-tile-visible.md).
- Root cause is out of scope for this test asset.
