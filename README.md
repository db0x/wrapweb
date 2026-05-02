```
                                 __ 
 _    _________ ____ _    _____ / / 
| |/|/ / __/ _ `/ _ \ |/|/ / -_) _ \
|__,__/_/  \_,_/ .__/__,__/\__/_.__/🐧
              /_/                   
```
Turn any *web app* into a standalone Linux *desktop application* — packaged as an AppImage, with its own window, session, and taskbar entry.

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

Running `npm start` (without a profile) opens the **wrapweb Manager** — a graphical overview of all configured apps. The Manager is the primary interface for adding, configuring, building, installing, and launching apps. The UI language follows the system locale (German and English supported).

![Manager UI](assets/manager.png)

### App cards

Each app is shown as a card with its icon, name, URL, and status badges. Hovering a card reveals a toolbar:

| Button | Action | Active when |
|---|---|---|
| Info | Shows all config values and filesystem paths | always |
| Build | Builds (or rebuilds) the AppImage | always |
| Install | Creates the `.desktop` launcher entry | built, not yet installed |
| Delete | Removes AppImage and `.desktop` file; profile data is kept | built |

Clicking the app icon directly **launches** the app — only if it is installed. Uninstalled apps show a grayed-out icon.

Only one build can run at a time; a full-screen overlay blocks other actions while a build is in progress.

### Info dialog

The info button opens a dialog showing every configured value for that app: URL, profile, icon, window geometry, user-agent, internal domains, and Cross-Origin Isolation. If the app is built, the AppImage path and profile directory are shown with **Open in file manager** buttons.

### Delete

For **user apps** (added via the Manager or private JSON configs), the delete dialog offers an additional toggle to also remove the configuration file. Without it, the card reappears on next launch and the app can be rebuilt.

### Adding a new app

Click the **+** card at the end of the grid to open the **Create App** dialog. All configuration options are available from within the Manager:

| Field | Notes |
|---|---|
| Profile | Unique identifier — lowercase letters, digits and hyphens; checked for uniqueness live |
| Name | Optional display name (derived from profile if left empty) |
| URL | The URL loaded on startup |
| Icon | Opens a searchable icon picker showing all icons available in the system's GNOME icon theme |
| Width / Height | Initial window size (optional) |
| User-Agent | Choose from presets or leave empty for the default Electron UA |
| Internal domains | Comma-separated list of extra domains that open inside the app window (e.g. OAuth redirects) |
| Cross-Origin Isolation | Enables `SharedArrayBuffer` — required for multi-threaded WASM |

New apps are saved as `build.private.<profile>.json` and are gitignored automatically.

### Side menu

The menu (top right) offers:

- **Light / Dark mode** toggle — preference is saved across sessions
- **Visibility filter** — All Apps / Embedded Apps / User Apps
- **Hide uninstalled** — suppress apps that haven't been installed yet

## Included app configs

| Config | App |
|---|---|
| `build.claude.json` | Claude (Anthropic) |
| `build.whatsapp.json` | WhatsApp Web |
| `build.google-docs.json` | Google Docs |
| `build.google-spreadsheets.json` | Google Spreadsheets |
| `build.google-gemini.json` | Google Gemini |
| `build.google-earth.json` | Google Earth |
| `build.openai.json` | ChatGPT / OpenAI |
| `build.teams.json` | Microsoft Teams |
| `build.outlook.json` | Microsoft Outlook |

## Installation

The quickest way to get started is the install script:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/db0x/wrapweb/main/install.sh)
```

The script:
- checks for **Node.js ≥ 18** — if missing, offers to install it automatically via [nvm](https://github.com/nvm-sh/nvm)
- checks for optional dependencies (FUSE, python3-gi, aspell) and prints install hints if any are absent
- clones the repository to `~/.local/share/wrapweb` (or a custom path passed as the first argument)
- runs `npm install`
- creates a `wrapweb` launcher entry in the application menu

Re-running the script on an existing installation does a `git pull` and reinstalls dependencies.

### Manual setup

```bash
git clone https://github.com/db0x/wrapweb.git
cd wrapweb
npm install
npm start
```

## Requirements

- **Node.js ≥ 18**
- **Linux** (GNOME/Wayland recommended — see note above)
- **FUSE** — required to run AppImages (`sudo apt install fuse` or `fuse3`)
- **python3-gi** — GTK bindings used by the Manager to resolve and enumerate system icon theme icons (`sudo apt install python3-gi`)
- **gtk-update-icon-cache** and **update-desktop-database** — called after installing an app; usually already present via `libgtk-3-bin` and `desktop-file-utils`
- **aspell** — spell-check suggestions in text fields (optional; `sudo apt install aspell-de` for German, etc.)

## Libraries

| Library | Used for |
|---|---|
| [Electron](https://www.electronjs.org/) | App shell, renderer, IPC |
| [electron-builder](https://www.electron.build/) | AppImage packaging |
| [OverlayScrollbars](https://github.com/KingSora/OverlayScrollbars) | Native-style overlay scrollbars in the Manager |

## Building AppImages via CLI

The Manager handles build and install for most cases. For scripted or headless workflows, the CLI scripts remain available:

```bash
npm run build                        # build all configs
npm run build -- whatsapp            # build a single app
npm run build -- private.myapp

npm run install-app -- whatsapp      # (re-)install launcher entry without rebuilding
npm run install-app                  # all configs
```

Output lands in `dist/` as a self-contained AppImage.

## Manual config (advanced)

Apps can also be configured by placing a JSON file in the project root. This is useful for bulk setup, version-controlled shared configs, or options not yet exposed in the Manager UI.

For apps you don't want to commit, use `build.private.<name>.json` — it is gitignored automatically.

### Config reference

| Field | Type | Description |
|---|---|---|
| `profile` | string | **Required.** Unique identifier — used for the session, userData path, and app IDs |
| `url` | string | **Required.** URL to load on startup |
| `name` | string | Human-readable display name (default: derived from `profile`) |
| `icon` | string | Icon name resolved from the system icon theme |
| `userAgent` | string | Override the user-agent string |
| `geometry.width/height` | number | Initial window size (default: 1280 × 1024) |
| `geometry.x/y` | number | Initial window position — _deprecated will be removed with remove of x11 in Gnome_ |
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
