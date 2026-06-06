// widget plugin (main-process module). Turns the app window into a frameless, transparent,
// rounded "widget": no titlebar/border/buttons, a dark translucent tint, hidden scrollbars, a
// context-menu "Move" mode and "Quit" entry.
//
// Building blocks live as real files, not inline strings:
//   tint.css         — the page tint/rounding, injected via insertCSS (a frameless window can't
//                      load an external stylesheet under strict app CSPs).
//   move-overlay.js  — the move-mode overlay, run in the page via executeJavaScript.
//
// Why windowOptions() and not attachPlugin(): frame/transparent are BrowserWindow CONSTRUCTOR
// options and can't change after the window exists. attachPlugin() runs after creation, so it's
// too late. window.js collects each plugin's optional windowOptions(pkg) BEFORE creating the
// window and merges the result (webPreferences stays owned by window.js).

const fs   = require('node:fs')
const path = require('node:path')

// Corner-radius bounds. Must stay in sync with the slider in config.html (min/max/default).
const DEFAULT_RADIUS = 14
const MIN_RADIUS = 0
const MAX_RADIUS = 24

// Tint = a single CSS colour chosen via the Coloris picker in config.html, stored as a hex
// string (#RRGGBB / #RRGGBBAA). Default #000000a6 = black at ~0.65 alpha, the original look.
const DEFAULT_TINT = '#000000a6'
// Guaranteed-valid CSS the widget falls back to if a stored value can't be parsed.
const FALLBACK_TINT = 'rgba(0, 0, 0, 0.65)'

// Never let the tint reach a fully opaque alpha: a fully opaque root background is promoted by the
// compositor to a solid, rectangular window canvas that ignores the clip-path (same as
// border-radius), squaring off the rounded corners. 0.99 is visually indistinguishable from 1.0
// over the desktop but keeps the layer compositing path — and thus the rounding — alive.
const MAX_TINT_ALPHA = 0.99

// Read the building-block files once at load. tint.css keeps its {{radius}}/{{tint}} placeholders
// unfilled here — both come from per-app config (api.config), known only when attachPlugin runs.
const TINT_CSS_TEMPLATE = fs.readFileSync(path.join(__dirname, 'tint.css'), 'utf8')
const MOVE_SCRIPT       = fs.readFileSync(path.join(__dirname, 'move-overlay.js'), 'utf8')

// Clamp the configured radius to the supported range; fall back to the default for missing or
// non-numeric values (e.g. an AppImage built before the setting existed → no pluginConfig).
function resolveRadius(config) {
  const r = Number(config?.radius)
  if (!Number.isFinite(r)) return DEFAULT_RADIUS
  return Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, Math.round(r)))
}

// Parse a colour string into { r, g, b, a }. Accepts hex (#rgb / #rgba / #rrggbb / #rrggbbaa —
// the Coloris output) and rgb()/rgba() (kept so configs saved before the hex switch still work).
// Returns null when nothing matches.
function parseColor(raw) {
  const s = String(raw).trim()
  let m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(s)
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : parseFloat(m[4]) }
  m = /^#([0-9a-f]{3,8})$/i.exec(s)
  if (m) {
    let h = m[1]
    if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('')  // expand shorthand
    if (h.length === 6 || h.length === 8) {
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
        a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
      }
    }
  }
  return null
}

// Normalise the configured tint into an rgba() string with the alpha capped below fully opaque
// (see MAX_TINT_ALPHA). Falls back to FALLBACK_TINT for missing/malformed values. Capping here —
// not in the stored value — keeps the user's real choice.
function resolveTint(config) {
  const c = parseColor(config?.tint ?? DEFAULT_TINT)
  if (!c) return FALLBACK_TINT
  const r = Math.min(255, c.r), g = Math.min(255, c.g), b = Math.min(255, c.b)
  let a = Number.isFinite(c.a) ? c.a : 1
  a = Math.min(Math.max(a, 0), MAX_TINT_ALPHA)
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`
}

// Whether the widget window can be resized. Default yes — only an explicit false locks the size,
// so older AppImages (no pluginConfig) keep the original resizable behaviour.
function resolveResizable(config) {
  return config?.resizable !== false
}

// move.svg as a data URL — loaded here (FS access) and handed to the page overlay, so no
// file:// path is needed from the page context. null if missing.
const MOVE_ICON = (() => {
  try { return `data:image/svg+xml;base64,${fs.readFileSync(path.join(__dirname, 'move.svg')).toString('base64')}` }
  catch { return null }
})()

// frame:false → no titlebar/border/buttons; transparent + transparent backgroundColor → no
// native window background so the page (and the desktop, where transparent) shows through.
// (Window transparency is Wayland-compositor dependent.) resizable is NOT set here — it's a
// per-app config and applied in attachPlugin via setResizable (defaults to Electron's true).
function windowOptions() {
  return { frame: false, transparent: true, backgroundColor: '#00000000' }
}

// Enters move mode: hands the overlay its parameters via window.__wrapwebWidgetMove, then runs
// move-overlay.js in the page. Two executeJavaScript calls keep the params out of the script
// file; the param assignment is a plain JSON literal, the script file is verbatim.
function enterMoveMode(win, t) {
  const params = { icon: MOVE_ICON, hintText: t.widgetMoveHint, doneText: t.widgetMoveDone }
  win.webContents
    .executeJavaScript(`window.__wrapwebWidgetMove = ${JSON.stringify(params)};`)
    .then(() => win.webContents.executeJavaScript(MOVE_SCRIPT))
    .catch(() => {})
}

// Inject the tint on every load: insertCSS before the first load is lost, and SPA full
// navigations replace the document. did-finish-load covers both initial and later navigations.
// Returns context menu entries (window.js appends them): "Move widget" (enters drag mode, since
// a frameless window can't be dragged by a titlebar) and "Quit" (no window close button exists).
function attachPlugin(win, api) {
  // Bake the per-app radius + tint colour into the CSS once; values can't change without a rebuild.
  const css = TINT_CSS_TEMPLATE
    .replace(/\{\{radius\}\}/g, `${resolveRadius(api.config)}px`)
    .replace(/\{\{tint\}\}/g, resolveTint(api.config))
  win.webContents.on('did-finish-load', () => win.webContents.insertCSS(css).catch(() => {}))

  win.setResizable(resolveResizable(api.config))

  return {
    contextMenuItems: () => {
      const t = api.t()
      return [
        { label: t.widgetMove, click: () => enterMoveMode(win, t) },
        { label: t.widgetQuit.replace('{name}', api.displayName), click: () => api.quit() },
      ]
    },
  }
}

// configurable: declares the plugin has user-facing settings, so the dialog's plugin chip shows
// a configure button. The widget's look (radius, tint, always-on-top, …) will become editable;
// most plugins need no config and simply omit this flag (defaulting to false).
module.exports = { windowOptions, attachPlugin, configurable: true }
