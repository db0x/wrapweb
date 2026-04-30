```
                                 __ 
 _    _________ ____ _    _____ / / 
| |/|/ / __/ _ `/ _ \ |/|/ / -_) _ \
|__,__/_/  \_,_/ .__/__,__/\__/_.__/🐧
              /_/                   
```

# wrapweb

Turn any web app into a standalone Linux desktop application — packaged as an AppImage, with its own window, session, and taskbar entry.

Built on [Electron](https://www.electronjs.org/). Each app gets an isolated browser profile so WhatsApp, Teams, Google Earth and your own internal tools can all run side by side without interfering.

> **Target environment: GNOME on Wayland.**
> wrapweb is built and tested on GNOME/Wayland. Features like correct WM class, taskbar grouping, window management, and the Manager's native icon integration rely on GNOME and Wayland conventions. It may run on other desktops or X11, but expect rough edges.

## Features

- **Isolated sessions** — each app has its own persistent profile; cookies, storage and login state never bleed across apps
- **Native feel** — no browser chrome, correct WM class for taskbar grouping and window management
- **Context menu** — Cut / Copy / Paste + Save Image As; spelling suggestions via `aspell` (falls back to English)
- **Zoom** — `Ctrl+Scroll` per window
- **Screen sharing** — WebRTC / PipeWire capture works out of the box
- **DevTools** — `F12` to toggle
- **Private builds** — configs matching `build.private.*.json` are gitignored

## Manager

Running `npm start` (without a profile) opens the **wrapweb Manager** — a graphical overview of all configured apps.

![Manager UI](assets/manager.png)

Each app is shown as a card with its icon, name, URL, and status badges. Hovering a card reveals a toolbar with four actions:

| Button | Action | Active when |
|---|---|---|
| Info | Shows AppImage path and profile directory | always |
| Build | Builds (or rebuilds) the AppImage | always |
| Install | Creates the `.desktop` launcher entry | built, not yet installed |
| Delete | Removes the AppImage and `.desktop` file (profile data is kept) | built |

Clicking the app icon directly **launches** the app — if it is installed. Uninstalled apps have a grayed-out icon.

The hamburger menu (top right) offers:
- **Light / Dark mode** toggle — preference is saved across sessions
- **Visibility filter** — show all apps, embedded-only, or user apps only
- **Hide uninstalled** — toggle to suppress apps that haven't been installed yet

The manager's WM class is `wrapweb`; each app's WM class is `wrapweb-<profile>`.

## Included app configs

| Config | App |
|---|---|
| `build.claude.json` | Claude (Anthropic) |
| `build.whatsapp.json` | WhatsApp Web |
| `build.teams.json` | Microsoft Teams |
| `build.google-docs.json` | Google Docs |
| `build.google-spreadsheets.json` | Google Spreadsheets |
| `build.google-gemini.json` | Google Gemini |
| `build.google-earth.json` | Google Earth |
| `build.openai.json` | ChatGPT / OpenAI |

## Requirements

- **Node.js ≥ 18**
- **Linux** (GNOME/Wayland recommended — see note above)
- **FUSE** — required to run AppImages (`sudo apt install fuse` or `fuse3`)
- **python3-gi** — GTK bindings used by the Manager to resolve system icon theme icons (`sudo apt install python3-gi`)
- **gtk-update-icon-cache** and **update-desktop-database** — called after installing an app; usually already present via `libgtk-3-bin` and `desktop-file-utils`
- **aspell** — spell-check suggestions in text fields (optional; `sudo apt install aspell-de` for German, etc.)

```bash
npm install
```

## Libraries

| Library | Used for |
|---|---|
| [Electron](https://www.electronjs.org/) | App shell, renderer, IPC |
| [electron-builder](https://www.electron.build/) | AppImage packaging |
| [OverlayScrollbars](https://github.com/KingSora/OverlayScrollbars) | Native-style overlay scrollbars in the Manager |

## Building

Build all apps or a single one by profile label:

```bash
npm run build                        # all configs
npm run build -- whatsapp
npm run build -- private.myapp
```

Output lands in `dist/` as a self-contained AppImage. A `.desktop` entry is written to `~/.local/share/applications/` automatically.

To (re-)install the launcher entry without rebuilding:

```bash
npm run install-app -- whatsapp
npm run install-app                  # all configs
```

## Adding your own app

Create a `build.<name>.json` in the project root:

```json
{
    "profile": "myapp",
    "url": "https://app.example.com"
}
```

For apps you don't want to commit, use `build.private.<name>.json` — it is gitignored automatically.

### Config reference

| Field | Type | Description |
|---|---|---|
| `profile` | string | **Required.** Unique identifier — used for the session, userData path, and app IDs |
| `url` | string | **Required.** URL to load on startup |
| `name` | string | Human-readable display name (default: derived from `profile`) |
| `icon` | string | Icon name resolved from the system icon theme (default: `profile` name) |
| `userAgent` | string | Override the user-agent string |
| `geometry.width/height` | number | Initial window size (default: 1280 × 1024) |
| `geometry.x/y` | number | Initial window position |
| `internalDomains` | string \| array | Extra domains allowed to open inside the app window (e.g. OAuth providers) |
| `crossOriginIsolation` | boolean | Enable `SharedArrayBuffer` — required for multi-threaded WASM (Google Earth) |

### Examples

```json
{ "profile": "google-docs", "url": "https://docs.google.com" }
```

```json
{
    "profile": "claude",
    "name": "Claude",
    "icon": "claude",
    "url": "https://claude.ai",
    "internalDomains": ["accounts.google.com", "github.com"]
}
```

```json
{
    "profile": "google-earth",
    "url": "https://earth.google.com",
    "crossOriginIsolation": true,
    "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"
}
```

## Session data

Each app stores cookies, localStorage and cache under:

```
~/.config/wrapweb/<profile>/
```

Profiles are fully isolated and persist across restarts.
