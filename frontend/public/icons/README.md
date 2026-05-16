# App icons

Replace these placeholders with real PNGs before shipping.

Required:
- `icon-192.png` — 192×192
- `icon-512.png` — 512×512
- `icon-512-maskable.png` — 512×512 with 10% padding for the safe zone

Free tools: [maskable.app](https://maskable.app) — drop a square image and export both standard and maskable variants.

For Petsitter's warm-editorial brand, a good starting point is a single Fraunces "P" letterform centered on `#FAF7F2` with `#B86B4B` (terracotta) glyph color. A simple SVG version lives next to this file as `placeholder.svg` — convert it via `npx svg2png-many ./placeholder.svg ./icon-512.png --width 512` (or any image editor) until you have real artwork.
