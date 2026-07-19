# QR Creator

Create styled QR codes with optional logo and bottom text. No backend—runs in the browser.

## Features

- **URL or text** — Encode any link or plain text
- **Styles** — DOTS, PIXELS, or HYBRID (with optional per-module border on PIXELS/HYBRID)
- **Colors** — Custom QR and background colors (default black & white)
- **Logo** — Optional centre image (PNG or JPG)
- **Bottom text** — Optional caption under the QR (e.g. “Scan me” or “qr id”)
- **Outputs** — Download PNG, JPEG, or SVG; copy PNG to clipboard

Preview matches the downloaded image (512×512 with centred QR and caption strip).

## Tech

- Vanilla HTML, CSS, and JavaScript
- [qr-code-styling](https://github.com/kozakdenys/qr-code-styling) 
(loaded from jsDelivr) for QR generation and styling

## Branding

- **Favicon** — `favicon.svg` is linked from the document head as an SVG favicon.
- **Footer signature** — The footer intentionally displays `>_ inder`, including the
  space before `inder`, matching the signature used on
  [iphobbes.github.io](https://iphobbes.github.io/).
- **Blinking cursor** — Only the underscore is animated. The `.cursor-blink` span
  uses the `cursor-blink` CSS keyframes with a one-second stepped loop, alternating
  its opacity to create a terminal-style blinking cursor.

