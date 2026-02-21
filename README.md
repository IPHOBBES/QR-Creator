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

## How to run

Open `index.html` in a browser, or serve the folder with any static server:

```bash
# Example with Python
python3 -m http.server 8000
# Then open http://localhost:8000
```

No build step or dependencies.

## Tech

- Vanilla HTML, CSS, and JavaScript
- [qr-code-styling](https://github.com/kozakdenys/qr-code-styling) (loaded from jsDelivr) for QR generation and styling

## License

Use and modify as you like.
