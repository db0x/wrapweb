```
                                 __ 
 _    _________ ____ _    _____ / / 
| |/|/ / __/ _ `/ _ \ |/|/ / -_) _ \
|__,__/_/  \_,_/ .__/__,__/\__/_.__/🐧
              /_/                   
```

# wrapweb

Turn any web app into a standalone Linux desktop application — packaged as an AppImage, with its own window, session, and taskbar entry.

Built on [Electron](https://www.electronjs.org/). Each app gets an isolated browser profile (cookies, storage, login state) so WhatsApp, Teams, Google Earth and your own internal tools can all run side by side without interfering.

## Features

- **Isolated sessions** — each app has its own persistent profile; logging into one never affects another
- **Native feel** — no browser chrome, auto-hidden menu bar, correct WM class for taskbar grouping
- **Context menu** — Cut / Copy / Paste + Save Image As (i18n: German / English, follows system locale); right-clicking a misspelled word shows spelling suggestions via `aspell` (falls back to English if no system dictionary is installed for the current locale)
- **Zoom** — `Ctrl+Scroll` to zoom in/out per window
- **Screen sharing** — WebRTC / PipeWire capture works out of the box (Teams, Meet, …)
- **DevTools** — press `F12` to toggle
- **Private builds** — configs matching `build.private.*.json` are gitignored and never committed
- **Desktop integration** — auto-installs a `.desktop` entry after each build; `npm run install-app` to install without rebuilding

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
- `aspell` for spelling suggestions in the context menu (English is built in; install the matching language pack for native-language suggestions, e.g. `sudo apt install aspell-de` for German)

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

Output lands in `dist/` as a self-contained AppImage. A `.desktop` entry is written to `~/.local/share/applications/` automatically after each build, so the app appears in your launcher right away.

## Installing without rebuilding

If you already have a built AppImage and just want to (re-)create the launcher entry:

```bash
npm run install-app -- whatsapp
npm run install-app            # all configs
```

If the `.desktop` file already exists it is skipped. To force an update, delete it first:

```bash
rm ~/.local/share/applications/wrapweb-whatsapp.desktop
npm run install-app -- whatsapp
```

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
| `name` | string | *(optional)* Human-readable display name shown in the launcher (default: derived from `profile`, e.g. `google-earth` → `Google Earth`) |
| `icon` | string | *(optional)* Icon name for the `.desktop` entry — resolved from the system icon theme (default: `profile` name) |
| `userAgent` | string | *(optional)* Override the user-agent string |
| `geometry.width` | number | *(optional)* Initial window width (default: 1280) |
| `geometry.height` | number | *(optional)* Initial window height (default: 1024) |
| `geometry.x` | number | *(optional)* Initial window X position |
| `geometry.y` | number | *(optional)* Initial window Y position |
| `internalDomains` | string or array | *(optional)* Domains to allow opening in new windows (e.g., OAuth providers like `accounts.google.com`, `github.com`). By default, only same-origin URLs open internally; external links open in the system browser. |
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

With OAuth providers whitelisted (so login flows stay in the app) and a custom display name:
```json
{
    "profile": "claude",
    "name": "Claude",
    "icon": "claude",
    "url": "https://claude.ai",
    "internalDomains": ["accounts.google.com", "github.com"]
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
