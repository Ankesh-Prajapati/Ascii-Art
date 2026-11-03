# Dither / ASCII Studio

A browser-based image effect tool that converts any photo into a grid of shapes
(circles, halftone dots, ASCII-style marks, custom SVG shapes, and more), driven
entirely by pixel brightness. Runs fully client-side on `<canvas>` — no build step,
no server.

## Features

- 23+ pixel-mapping algorithms (halftone, glitch, CRT scanline, flow field, edge
  detect, posterize, and more)
- 26 built-in shapes plus support for loading your own SVG path as a custom shape
- Live controls for cell size, gap, contrast, color mode, scale, and effect intensity
- Drag-and-drop or file-picker image upload
- Export the result as a PNG

## Usage

Open `index.html` in a browser. No installation or dependencies required.

- **Upload Image** — load your own photo (or drag and drop it anywhere on the page)
- **Shape grid** — pick a shape, or click "Load Custom SVG…" to use your own
- **Grid & Color / Effect panels** — tune cell size, contrast, colors, algorithm
  mode, scale, and intensity
- **Save PNG** — download the current render

## Files

- `index.html` — page structure and control panel markup
- `style.css` — dark studio UI styling
- `script.js` — render engine, shape library, and control bindings
