// "About" panel for an app window, toggled with F12 (Shift+F12 stays DevTools).
//
// Rendered as an overlay INJECTED INTO THE PAGE (like the link tooltip), not as a separate
// window: on Wayland a child window can't be reliably centered or shown modal over the parent,
// whereas an in-page overlay is always centered in the window and visually "part of the app".
// It styles itself after the rclone confirm dialog (gradient header + wrapweb badge, white
// card, backdrop). Self-contained: the script closes the panel by removing its own DOM, so no
// IPC/preload is involved. First iteration: read-only facts + a close button.

const { app } = require('electron')
const path = require('node:path')
const fs   = require('node:fs')
const os   = require('node:os')

const pkg      = require(app.getAppPath() + '/package.json')
const APP_ROOT = app.getAppPath()

// Reads an SVG asset as a base64 data URL for inline embedding; null if missing.
function svgDataUrl(absPath) {
  try { return `data:image/svg+xml;base64,${fs.readFileSync(absPath).toString('base64')}` } catch { return null }
}

// The installed per-app icon (svg preferred, png fallback) — same lookup the rclone dialog uses.
function appIconDataUrl() {
  const hicolor = path.join(os.homedir(), '.local', 'share', 'icons', 'hicolor')
  const svg = path.join(hicolor, 'scalable', 'apps', `wrapweb-${pkg.profile}.svg`)
  const png = path.join(hicolor, '48x48',    'apps', `wrapweb-${pkg.profile}.png`)
  if (fs.existsSync(svg)) return `data:image/svg+xml;base64,${fs.readFileSync(svg).toString('base64')}`
  if (fs.existsSync(png)) return `data:image/png;base64,${fs.readFileSync(png).toString('base64')}`
  return null
}

// Turns a webapps-relative plugin path into { label, icon } for display. Mirrors the manager's
// discovery: label is the filename without ".js" and a leading "private.", icon is the
// sibling plugin.svg (data URL) if the plugin ships one.
function pluginDisplay(rel) {
  const label = path.basename(rel).replace(/\.js$/, '').replace(/^private\./, '')
  const icon  = svgDataUrl(path.join(APP_ROOT, 'webapps', path.dirname(rel), 'plugin.svg'))
  return { label, icon }
}

// Read once — stable for the process lifetime.
const githubIcon = svgDataUrl(path.join(APP_ROOT, 'assets', 'github.svg'))
const safeIcon   = svgDataUrl(path.join(APP_ROOT, 'assets', 'safe-browsing.svg'))
const unsafeIcon = svgDataUrl(path.join(APP_ROOT, 'assets', 'security-low.svg'))

// Builds the IIFE injected via executeJavaScript. It toggles a single overlay element keyed
// by a fixed id: present → remove (F12 closes), absent → build. All values are JSON-encoded
// into the script so page content can't break the markup.
function buildAboutInjection(info) {
  const de = app.getLocale().split('-')[0].toLowerCase() === 'de'
  // Header name: prefer the human-readable displayName baked in at build time; fall back to
  // the profile (pkg.name is "wrapweb-<profile>", so strip that prefix for older builds).
  const displayName = pkg.displayName || (pkg.name || '').replace(/^wrapweb-/, '') || pkg.profile
  const t = de
    ? { titlePrefix: 'Über ', subtitle: 'wrapweb-AppImage', domain: 'Aktuelle Domain', appName: 'App', plugins: 'Geladene Plugins',
        versions: 'Versionen', wrapwebHint: 'Stand der AppImage-Erstellung',
        electronHint: 'zugrundeliegendes Electron-Framework', chromiumHint: 'Render-Engine / Browser-Kern',
        builtWith: 'Erstellt mit wrapweb', electron: 'Electron', close: 'Schließen',
        sbSafe: 'Google Safe Browsing: keine Bedrohung bekannt', sbUnsafe: 'Google Safe Browsing: als gefährlich gemeldet' }
    : { titlePrefix: 'About ', subtitle: 'wrapweb AppImage', domain: 'Current domain', appName: 'App', plugins: 'Loaded plugins',
        versions: 'Versions', wrapwebHint: 'when this AppImage was built',
        electronHint: 'underlying Electron framework', chromiumHint: 'render engine / browser core',
        builtWith: 'Built with wrapweb', electron: 'Electron', close: 'Close',
        sbSafe: 'Google Safe Browsing: no known threat', sbUnsafe: 'Google Safe Browsing: flagged as dangerous' }

  const data = {
    t,
    displayName,
    domain:   info.domain,
    appName:  pkg.name || pkg.profile,
    plugins:  (pkg.plugins ?? []).map(pluginDisplay),
    // pkg.version is baked into the embedded package.json at build time — i.e. the wrapweb
    // version this AppImage was actually built with.
    version:  pkg.version,
    electron: process.versions.electron,
    chromium: process.versions.chrome,
    appIcon:  appIconDataUrl(),
    githubIcon,
    safeIcon,
    unsafeIcon,
    fullUrl:  info.fullUrl,
  }

  return `(() => {
  const ID = 'wrapweb-about-overlay';
  const existing = document.getElementById(ID);
  if (existing) { existing.remove(); return; }   // F12 again closes it

  const d = ${JSON.stringify(data)};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const css = \`
    /* Card colours follow the OS light/dark preference — there is no cross-process link to
       the manager's theme, so the system setting is the closest honest signal. The blue
       header keeps the wrapweb brand look on both themes. */
    #\${ID}{--wa-card-bg:#fff;--wa-card-fg:#1e1e1e;--wa-label:#888;--wa-div:#e4e4e4;
      position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;
      justify-content:center;background:rgba(0,0,0,0.45);font-family:'Ubuntu',system-ui,sans-serif}
    @media (prefers-color-scheme: dark){
      #\${ID}{--wa-card-bg:#2c2c2c;--wa-card-fg:#f0f0f0;--wa-label:#aaa;--wa-div:#444}
    }
    #\${ID} *{box-sizing:border-box;margin:0;padding:0}
    #\${ID} .wa-card{background:var(--wa-card-bg);color:var(--wa-card-fg);border-radius:12px;
      width:440px;max-width:90vw;box-shadow:0 8px 32px rgba(0,0,0,0.35);overflow:hidden;color-scheme:light dark}
    #\${ID} .wa-header{background:linear-gradient(135deg,#5ab4f0 0%,#1a7bc4 100%);
      padding:12px 20px;display:flex;align-items:center;gap:12px}
    #\${ID} .wa-icon-wrap{position:relative;width:32px;height:32px;flex-shrink:0}
    #\${ID} .wa-icon-wrap>img{width:32px;height:32px;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.25))}
    #\${ID} .wa-htitles{display:flex;flex-direction:column;line-height:1.2}
    #\${ID} .wa-htitle{color:#fff;font-size:15px;font-weight:600}
    #\${ID} .wa-hsub{color:rgba(255,255,255,0.8);font-size:11px}
    #\${ID} .wa-body{padding:18px 24px 20px;display:flex;flex-direction:column;gap:14px}
    #\${ID} .wa-field .wa-label{font-size:11px;font-weight:600;text-transform:uppercase;
      letter-spacing:.05em;color:var(--wa-label)}
    #\${ID} .wa-field .wa-val{font-size:13px;margin-top:2px;word-break:break-all;padding-left:10px}
    #\${ID} .wa-domain{display:flex;align-items:center;gap:6px}
    #\${ID} .wa-domain img{width:15px;height:15px;flex-shrink:0}
    #\${ID} .wa-vers{display:flex;flex-direction:column;gap:6px;margin-top:3px;padding-left:10px}
    #\${ID} .wa-ver{display:flex;flex-direction:column;line-height:1.25}
    #\${ID} .wa-ver-name{font-size:13px}
    #\${ID} .wa-ver-hint{font-size:11px;color:var(--wa-label)}
    #\${ID} .wa-plugins{list-style:none;margin:4px 0 0;padding:0 0 0 10px;display:flex;flex-direction:column;gap:5px}
    #\${ID} .wa-plugins li{display:flex;align-items:center;gap:8px;font-size:13px}
    #\${ID} .wa-plugins img{width:18px;height:18px;flex-shrink:0;object-fit:contain}
    #\${ID} .wa-branding{display:flex;flex-direction:column;align-items:center;gap:6px;margin-top:4px;
      padding-top:12px;border-top:1px solid var(--wa-div)}
    #\${ID} .wa-branding a{display:flex;align-items:center;gap:6px;font-size:12px;
      color:#3584e4;text-decoration:none;cursor:pointer}
    #\${ID} .wa-branding a:hover span{text-decoration:underline}
    #\${ID} .wa-branding img{width:20px;height:20px;flex-shrink:0}
    /* Some host pages append an "external link" glyph to <a> via ::after/::before — suppress
       it inside the overlay so the Electron text link stays icon-free. */
    #\${ID} .wa-branding a::after,#\${ID} .wa-branding a::before{content:none!important;
      display:none!important}
    #\${ID} .wa-actions{display:flex;justify-content:flex-end;margin-top:2px}
    #\${ID} .wa-actions button{padding:7px 18px;border-radius:8px;border:none;cursor:pointer;
      font-size:13px;font-weight:500;font-family:inherit;background:#1a73e8;color:#fff;transition:opacity .15s}
    #\${ID} .wa-actions button:hover{opacity:.85}
  \`;

  // The whole plugins field is omitted when no plugins are loaded — nothing to show.
  const pluginsField = d.plugins.length
    ? '<div class="wa-field"><div class="wa-label">' + esc(d.t.plugins) + '</div>' +
        '<ul class="wa-plugins">' + d.plugins.map(p =>
          '<li>' + (p.icon ? '<img src="' + p.icon + '" alt="">' : '') + '<span>' + esc(p.label) + '</span></li>'
        ).join('') + '</ul>' +
      '</div>'
    : '';

  // Header shows only the app's own icon (no wrapweb badge — wrapweb is credited in the
  // footer branding row instead).
  const headerIcon = d.appIcon ? '<img src="' + d.appIcon + '" alt="">' : '';

  // Versions block: two sub-rows, each with a value and a short explanatory hint —
  // wrapweb (the build that produced this AppImage) and Electron (the underlying framework).
  const versionsField =
    '<div class="wa-field"><div class="wa-label">' + esc(d.t.versions) + '</div>' +
      '<div class="wa-vers">' +
        '<div class="wa-ver"><span class="wa-ver-name">wrapweb ' + esc(d.version) + '</span>' +
          '<span class="wa-ver-hint">' + esc(d.t.wrapwebHint) + '</span></div>' +
        '<div class="wa-ver"><span class="wa-ver-name">Electron ' + esc(d.electron) + '</span>' +
          '<span class="wa-ver-hint">' + esc(d.t.electronHint) + '</span></div>' +
        '<div class="wa-ver"><span class="wa-ver-name">Chromium ' + esc(d.chromium) + '</span>' +
          '<span class="wa-ver-hint">' + esc(d.t.chromiumHint) + '</span></div>' +
      '</div>' +
    '</div>';

  // Footer: two GitHub-style links stacked vertically (wrapweb repo, then Electron site).
  // target="_blank" makes the app's setWindowOpenHandler route them to the system browser
  // (neither same-origin nor internal) — no IPC. The Electron link carries no version now.
  const ghImg = d.githubIcon ? '<img src="' + d.githubIcon + '" alt="">' : '';
  const brandingHtml =
    '<div class="wa-branding">' +
      '<a href="https://github.com/db0x/wrapweb" target="_blank" rel="noreferrer">' + ghImg +
        '<span>' + esc(d.t.builtWith) + '</span></a>' +
      '<a href="https://www.electronjs.org/" target="_blank" rel="noreferrer">' +
        '<span>' + esc(d.t.electron) + '</span></a>' +
    '</div>';

  const ov = document.createElement('div');
  ov.id = ID;
  ov.innerHTML =
    '<style>' + css + '</style>' +
    '<div class="wa-card">' +
      '<div class="wa-header"><div class="wa-icon-wrap">' + headerIcon + '</div>' +
        '<div class="wa-htitles">' +
          '<span class="wa-htitle">' + esc(d.t.titlePrefix) + esc(d.displayName) + '</span>' +
          '<span class="wa-hsub">' + esc(d.t.subtitle) + '</span>' +
        '</div></div>' +
      '<div class="wa-body">' +
        '<div class="wa-field"><div class="wa-label">' + esc(d.t.domain) + '</div>' +
          '<div class="wa-val wa-domain"><img id="wa-sb" alt="" hidden>' +
          '<span>' + esc(d.domain) + '</span></div></div>' +
        '<div class="wa-field"><div class="wa-label">' + esc(d.t.appName) + '</div><div class="wa-val">' + esc(d.appName) + '</div></div>' +
        versionsField +
        pluginsField +
        brandingHtml +
        '<div class="wa-actions"><button id="wa-close">' + esc(d.t.close) + '</button></div>' +
      '</div>' +
    '</div>';

  const close = () => ov.remove();
  ov.addEventListener('click', e => { if (e.target === ov) close(); });   // backdrop click
  ov.querySelector('#wa-close').addEventListener('click', close);
  // Esc closes; capture so the page's own Esc handlers don't swallow it first.
  document.addEventListener('keydown', function onEsc(e){
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc, true); }
  }, true);

  document.body.appendChild(ov);

  // Safe Browsing status next to the domain — only shown when the check returns a definite
  // verdict. 'unknown' (feature disabled, no API key, or app excluded) shows nothing, so the
  // badge appears only when Safe Browsing is actually active. Reuses the same IPC bridge as
  // the link tooltip; async, so it fills in once the overlay is already visible.
  if (window.electronAPI && window.electronAPI.checkSafeBrowsing) {
    window.electronAPI.checkSafeBrowsing(d.fullUrl).then(r => {
      const el = ov.querySelector('#wa-sb');
      if (!el) return;
      if (r === 'safe'   && d.safeIcon)   { el.src = d.safeIcon;   el.title = d.t.sbSafe;   el.hidden = false; }
      if (r === 'unsafe' && d.unsafeIcon) { el.src = d.unsafeIcon; el.title = d.t.sbUnsafe; el.hidden = false; }
    }).catch(() => {});
  }
})();`
}

// Toggles the About overlay in the given window's page. Reads the current URL live so the
// shown domain reflects wherever the user navigated.
function toggleAboutWindow(win) {
  const fullUrl = win.webContents.getURL()
  const info = {
    // protocol + host (e.g. "https://word.cloud.microsoft") — keeps the scheme so http vs
    // https is visible, but drops path/query to stay short.
    domain: (() => {
      try { const u = new URL(fullUrl); return `${u.protocol}//${u.host}` }
      catch { return fullUrl }
    })(),
    // Full URL for the Safe Browsing lookup (the handler hashes only the origin anyway).
    fullUrl,
  }
  win.webContents.executeJavaScript(buildAboutInjection(info)).catch(() => {})
}

module.exports = { toggleAboutWindow }
