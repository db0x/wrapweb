# wrapweb

Turn any web app into a standalone Linux desktop application — packaged as an AppImage, with its own window, session, and taskbar entry.

Built on [Electron](https://www.electronjs.org/). Each app gets an isolated browser profile (cookies, storage, login state) so WhatsApp, Teams, Google Earth and your own internal tools can all run side by side without interfering.

## Features

- **Isolated sessions** — each app has its own persistent profile; logging into one never affects another
- **Native feel** — no browser chrome, auto-hidden menu bar, correct WM class for taskbar grouping
- **Context menu** — Cut / Copy / Paste + Save Image As (i18n: German / English, follows system locale)
- **Zoom** — `Ctrl+Scroll` to zoom in/out per window
- **Screen sharing** — WebRTC / PipeWire capture works out of the box (Teams, Meet, …)
- **DevTools** — press `F12` to toggle
- **Private builds** — configs matching `build.private.*.json` are gitignored and never committed

## Included app configs

| Config | App |
|---|---|
| `build.whatsapp.json` | WhatsApp Web |
| `build.teams.json` | Microsoft Teams |
| `build.google-docs.json` | Google Docs |
| `build.google-spreadsheets.json` | Google Spreadsheets |
| `build.google-gemini.json` | Google Gemini |
| `build.google-earth.json` | Google Earth |
| `build.openai.json` | ChatGPT / OpenAI |

## Requirements

- Node.js ≥ 18
- Linux (Wayland or X11)

```bash
npm install
```

## Building

Build all discovered `build.*.json` configs:

```bash
npm run build
```

Build a single app:

```bash
npm run build -- whatsapp
npm run build -- teams
npm run build -- google-earth
```

Output lands in `dist/` as a self-contained AppImage.

## Adding your own app

Create a `build.<name>.json` in the project root. The build script generates all electron-builder boilerplate automatically — you only specify what is unique to your app:

```json
{
    "profile": "myapp",
    "url": "https://app.example.com"
}
```

Then build it:

```bash
npm run build -- myapp
```

### Config reference

| Field | Type | Description |
|---|---|---|
| `profile` | string | **Required.** Unique identifier — used for the session partition, userData path, and derived app IDs |
| `url` | string | **Required.** URL to load on startup |
| `userAgent` | string | *(optional)* Override the user-agent string |
| `geometry.width` | number | *(optional)* Initial window width (default: 1280) |
| `geometry.height` | number | *(optional)* Initial window height (default: 1024) |
| `geometry.x` | number | *(optional)* Initial window X position |
| `geometry.y` | number | *(optional)* Initial window Y position |
| `crossOriginIsolation` | boolean | *(optional)* Enable `SharedArrayBuffer` — required for apps like Google Earth that use multi-threaded WASM |

Everything else (`appId`, `productName`, `artifactName`, the `linux` section) is derived from `profile` by `scripts/build.js`.

### Real-world examples

Minimal — just a URL:
```json
{ "profile": "google-docs", "url": "https://docs.google.com" }
```

With custom user-agent (needed for some apps that block non-Chrome agents):
```json
{
    "profile": "teams",
    "url": "https://teams.microsoft.com",
    "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"
}
```

With window position and WASM multi-threading:
```json
{
    "profile": "google-earth",
    "url": "https://earth.google.com",
    "crossOriginIsolation": true,
    "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"
}
```

### Private configs

Name your config `build.private.<name>.json` — it is gitignored and will never be committed, but the build script discovers and builds it just like any other config.

```bash
cp build.whatsapp.json build.private.myinternalapp.json
# edit it, then:
npm run build -- private.myinternalapp
```

## Session data

Each app stores its data (cookies, localStorage, cache) under:

```
~/.config/wrapweb/<profile>/
```

Profiles are fully isolated from each other and persist across app restarts.

## Wayland / GPU notes

The app runs on Wayland by default (`ozone-platform-hint=wayland`) with ANGLE for GL. If you run into GPU-related crashes, you can override via environment variables or by passing additional Chromium flags through `executableArgs` in `scripts/build.js`.
