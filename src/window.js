const { BrowserWindow, shell, ipcMain, dialog, app } = require('electron')
const path   = require('node:path')
const fs     = require('node:fs')
const crypto = require('node:crypto')
const https  = require('node:https')
const { spawn, spawnSync } = require('node:child_process')
const { createSession } = require('./session')
const { showContextMenu } = require('./context-menu')
const windowState = require('./window-state')

const ROUTING_FILE = path.join(app.getPath('appData'), 'wrapweb', 'plugins', 'routing', 'routing.json')

// In-memory cache: origin → { result: 'safe'|'unsafe', expiresAt }
// Avoids repeated API calls for the same domain during a browsing session.
const safeBrowsingCache = new Map()

// Tracks which profile is running in each BrowserWindow's webContents so the
// safe-browsing:check handler can apply per-app exclusions without needing a preload change.
const windowProfiles = new Map()  // webContentsId → profile

function safeBrowsingConfigPath() {
  const testDir = process.env.WRAPWEB_TEST_DATA_DIR
  return testDir
    ? path.join(testDir, 'safe-browsing.json')
    : path.join(app.getPath('appData'), 'wrapweb', 'safe-browsing.json')
}

function httpsPost(url, body) {
  return new Promise((resolve, reject) => {
    const { hostname, pathname, search } = new URL(url)
    const req = https.request({
      hostname, path: pathname + search, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

ipcMain.handle('safe-browsing:check', async (event, url) => {
  let origin
  try { origin = new URL(url).origin } catch { return 'unknown' }

  const cached = safeBrowsingCache.get(origin)
  if (cached && Date.now() < cached.expiresAt) return cached.result

  const config = (() => {
    try { return JSON.parse(fs.readFileSync(safeBrowsingConfigPath(), 'utf8')) } catch { return {} }
  })()
  if (!config.apiKey || !config.enabled) return 'unknown'

  // Skip check for apps that have opted out (e.g. Outlook, Teams with built-in protection).
  const profile = windowProfiles.get(event.sender.id)
  if (profile && Array.isArray(config.excludedProfiles) && config.excludedProfiles.includes(profile)) {
    return 'unknown'
  }

  // Only the origin is hashed — path and query never leave the device.
  const fullHash  = crypto.createHash('sha256').update(origin).digest()
  const prefixB64 = fullHash.slice(0, 4).toString('base64')

  const body = JSON.stringify({
    client:     { clientId: 'wrapweb', clientVersion: '1.0' },
    threatInfo: {
      threatTypes:      ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
      platformTypes:    ['ANY_PLATFORM'],
      threatEntryTypes: ['URL'],
      threatEntries:    [{ hash: prefixB64 }],
    },
  })

  try {
    const data   = await httpsPost(`https://safebrowsing.googleapis.com/v4/fullHashes:find?key=${config.apiKey}`, body)
    const json   = JSON.parse(data)
    const myHash = fullHash.toString('base64')
    const unsafe = json.matches?.some(m => m.threat?.hash === myHash) ?? false
    const result = unsafe ? 'unsafe' : 'safe'
    // Google recommends caching safe lookups ≥5 min; keep unsafe results longer.
    safeBrowsingCache.set(origin, { result, expiresAt: Date.now() + (unsafe ? 30 : 5) * 60_000 })
    return result
  } catch {
    return 'unknown'
  }
})

function loadRouting() {
  try { return JSON.parse(fs.readFileSync(ROUTING_FILE, 'utf8')) } catch { return {} }
}

// Read once at module load — these are our own assets, always present.
function readSvgDataUrl(assetName) {
  try {
    const b64 = fs.readFileSync(path.join(__dirname, '..', 'assets', assetName)).toString('base64')
    return `data:image/svg+xml;base64,${b64}`
  } catch { return null }
}
const safeIconDataUrl   = readSvgDataUrl('safe-browsing.svg')
const unsafeIconDataUrl = readSvgDataUrl('security-low.svg')

// Read once — both files are stable for the module's lifetime.
const tooltipScript = fs.readFileSync(path.join(__dirname, 'tooltip-script.js'), 'utf8')
const tooltipCss    = fs.readFileSync(path.join(__dirname, 'tooltip.css'),        'utf8')

// Looks up a PNG icon file by name in standard hicolor theme locations.
// nativeImage.createFromPath() on Linux silently fails on SVG, so only PNG is used.
function resolveIconPath(iconName) {
  if (!iconName) return null
  const iconBases = [
    path.join(app.getPath('home'), '.local', 'share', 'icons', 'hicolor'),
    '/usr/share/icons/hicolor',
  ]
  for (const base of iconBases) {
    for (const size of ['48x48', '32x32', '64x64', '256x256', '128x128']) {
      const p = path.join(base, size, 'apps', `${iconName}.png`)
      if (fs.existsSync(p)) return p
    }
  }
  const pixmap = `/usr/share/pixmaps/${iconName}.png`
  if (fs.existsSync(pixmap)) return pixmap
  return null
}

// Resolves the PNG icon path for the default handler of a given MIME/scheme type.
// Lazily called — xdg-mime is a subprocess and the result never changes at runtime.
function resolveHandlerIconPath(mimeType) {
  try {
    const r = spawnSync('xdg-mime', ['query', 'default', mimeType], { encoding: 'utf8', timeout: 500 })
    if (!r.stdout) return null
    const desktop = r.stdout.trim()
    const appDirs = [
      path.join(app.getPath('home'), '.local', 'share', 'applications'),
      '/usr/share/applications',
      '/usr/local/share/applications',
    ]
    let iconName = desktop.replace(/\.desktop$/, '')
    for (const dir of appDirs) {
      try {
        const match = fs.readFileSync(path.join(dir, desktop), 'utf8').match(/^Icon=(.+)$/m)
        if (match) { iconName = match[1].trim(); break }
      } catch {}
    }
    return resolveIconPath(iconName)
  } catch {}
  return null
}

let _browserIconPath
function getDefaultBrowserIconPath() {
  if (_browserIconPath !== undefined) return _browserIconPath
  return (_browserIconPath = resolveHandlerIconPath('x-scheme-handler/https'))
}

let _mailIconPath
function getDefaultMailIconPath() {
  if (_mailIconPath !== undefined) return _mailIconPath
  return (_mailIconPath = resolveHandlerIconPath('x-scheme-handler/mailto'))
}

// Some apps (e.g. Google) wrap external links as redirect URLs with the real
// target in a `?url=` parameter. Unwrap so routing matches the actual hostname.
function unwrapUrl(url) {
  try {
    const wrapped = new URL(url).searchParams.get('url')
    if (wrapped) { try { new URL(wrapped); return wrapped } catch {} }
  } catch {}
  return url
}

function resolveRoute(url, currentProfile) {
  const resolved = unwrapUrl(url)
  let targetHost, targetPath
  try { ({ hostname: targetHost, pathname: targetPath } = new URL(resolved)) } catch { return null }
  const routing = loadRouting()
  // Sort longer keys first so path-specific entries (e.g. docs.google.com/spreadsheets)
  // take priority over hostname-only entries (e.g. docs.google.com).
  const entry = Object.entries(routing)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([key]) => {
      const slash = key.indexOf('/')
      if (slash !== -1) {
        const keyHost = key.slice(0, slash)
        const keyPath = '/' + key.slice(slash + 1)
        return (targetHost === keyHost || targetHost.endsWith('.' + keyHost)) &&
               targetPath.startsWith(keyPath)
      }
      return targetHost === key || targetHost.endsWith('.' + key)
    })
  if (!entry) return null
  const [, target] = entry
  const appImagePath = typeof target === 'string' ? target : target.path
  const name         = typeof target === 'string' ? null  : target.name
  const icon         = typeof target === 'string' ? null  : (target.icon ?? null)
  const matchedProfile = path.basename(appImagePath).replace(/^wrapweb-/, '')
  if (matchedProfile === currentProfile || !fs.existsSync(appImagePath)) return null
  return { appImagePath, name, icon }
}

function routeExternalUrl(url, currentProfile) {
  const route = resolveRoute(url, currentProfile)
  if (!route) return false
  spawn(route.appImagePath, ['--no-sandbox', url], { detached: true, stdio: 'ignore' }).unref()
  return true
}

function createWindow(pkg) {
  const customSession = createSession(pkg.profile, { fileSystem: !!pkg.fileHandler })

  const saved = !pkg.geometry ? windowState.load() : null

  const mainWindow = new BrowserWindow({
    width:  pkg.geometry?.width  ?? saved?.width  ?? 1280,
    height: pkg.geometry?.height ?? saved?.height ?? 1024,
    x:      pkg.geometry?.x,
    y:      pkg.geometry?.y,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      session: customSession,
      ...(pkg.crossOriginIsolation && { enableBlinkFeatures: 'SharedArrayBuffer' }),
      ...(pkg.fileHandler && { additionalArguments: ['--wrapweb-file-handler'] }),
    },
  })

  if (!pkg.geometry) mainWindow.on('close', () => windowState.save(mainWindow))

  // Register profile for safe-browsing:check exclusion lookups; clean up on close.
  // webContentsId is captured now — webContents is already destroyed when 'closed' fires.
  const webContentsId = mainWindow.webContents.id
  windowProfiles.set(webContentsId, pkg.profile)
  mainWindow.on('closed', () => windowProfiles.delete(webContentsId))

  if (pkg.userAgent) mainWindow.webContents.setUserAgent(pkg.userAgent)
  mainWindow.loadURL(pkg.url)

  ipcMain.on('adjust-zoom', (event, delta) => {
    const wc = event.sender
    const current = wc.getZoomFactor()
    wc.setZoomFactor(delta > 0
      ? Math.min(current + 0.1, 3.0)
      : Math.max(current - 0.1, 0.5)
    )
  })

  const appOrigin = new URL(pkg.url).origin
  const internalDomains = pkg.internalDomains ?
    (Array.isArray(pkg.internalDomains) ? pkg.internalDomains : [pkg.internalDomains]) :
    []

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const targetUrl = new URL(url)
      // Allow same-origin URLs (OAuth redirects, etc.)
      if (targetUrl.origin === appOrigin) {
        return { action: 'allow' }
      }
      // Allow whitelisted internal domains (e.g., accounts.google.com)
      if (internalDomains.some(domain =>
        targetUrl.hostname === domain || targetUrl.hostname.endsWith('.' + domain)
      )) {
        return { action: 'allow' }
      }
      // External URLs: route to another wrapweb app or open in system browser
      if (!routeExternalUrl(url, pkg.profile)) shell.openExternal(url)
      return { action: 'deny' }
    } catch (err) {
      return { action: 'deny' }
    }
  })

  customSession.on('will-download', (_event, item) => {
    if (item.getSavePath()) return  // already handled by context-menu Save As

    // Electron requires a synchronous save path — use a temp file and move it
    // to the user-chosen location afterwards.
    const filename = item.getFilename()
    const tmpPath  = path.join(app.getPath('temp'), `wrapweb-${Date.now()}-${filename}`)
    item.setSavePath(tmpPath)

    // Register the done listener BEFORE opening the dialog to avoid a race
    // condition where small files finish downloading while the dialog is still open.
    // Both the dialog result and the download completion write to shared state;
    // whichever arrives last triggers the actual file move.
    let chosenPath  = null  // set by dialog once user confirms
    let doneState   = null  // set by download once it finishes

    const tryMove = () => {
      if (doneState !== 'completed' || chosenPath === null) return
      try {
        fs.renameSync(tmpPath, chosenPath)
      } catch {
        try { fs.copyFileSync(tmpPath, chosenPath); fs.rmSync(tmpPath) } catch {}
      }
    }

    item.once('done', (_e, state) => {
      doneState = state
      tryMove()
    })

    const defaultPath = path.join(app.getPath('downloads'), filename)
    dialog.showSaveDialog(mainWindow, { defaultPath }).then(({ canceled, filePath }) => {
      if (!canceled && filePath) {
        chosenPath = filePath
        tryMove()
      } else {
        item.cancel()
        try { fs.rmSync(tmpPath, { force: true }) } catch {}
      }
    })
  })

  if (pkg.fileHandler) {
    // draw.io detects window.electron and switches to a custom IPC protocol
    // (rendererReq/mainResp) instead of the browser File System Access API.
    // We mirror the draw.io-desktop protocol so Save/Save As work natively.
    const onRendererReq = async (event, args) => {
      if (event.sender !== mainWindow.webContents) return
      try {
        let ret = null
        switch (args.action) {
          case 'showSaveDialog': {
            const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
              defaultPath: args.defaultPath,
              filters:     args.filters || [],
            })
            ret = canceled ? null : { path: filePath }
            break
          }
          case 'saveFile':
            fs.writeFileSync(args.fileObject.path, args.data, 'utf8')
            ret = fs.statSync(args.fileObject.path)
            break
          case 'loadFile':
            ret = fs.readFileSync(args.fileObject.path, 'utf8')
            break
        }
        event.reply('mainResp', { success: true, data: ret, reqId: args.reqId })
      } catch (e) {
        event.reply('mainResp', { error: true, msg: e.message, reqId: args.reqId })
      }
    }
    ipcMain.on('rendererReq', onRendererReq)
    mainWindow.on('closed', () => ipcMain.removeListener('rendererReq', onRendererReq))
  }

  mainWindow.webContents.on('context-menu', (_event, params) => {
    showContextMenu(mainWindow, customSession, params, {
      resolveRoute: (url) => { const r = resolveRoute(url, pkg.profile); return r ? { ...r, url: unwrapUrl(url) } : null },
      openInBrowser: (url) => shell.openExternal(url),
      browserIconPath: getDefaultBrowserIconPath(),
    })
  })

  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.type === 'keyDown' && input.key === 'F12')
      mainWindow.webContents.toggleDevTools()
  })

  const toDataUrl = p => { try { return p ? `data:image/png;base64,${fs.readFileSync(p).toString('base64')}` : null } catch { return null } }
  const browserIconDataUrl = toDataUrl(getDefaultBrowserIconPath())
  const mailIconDataUrl    = toDataUrl(getDefaultMailIconPath())

  // Pre-compute route entries with icons so the tooltip can show the target app's icon.
  // Sorted longest-prefix-first so path-specific entries win over hostname-only entries.
  const routeEntries = Object.entries(loadRouting())
    .reduce((acc, [key, target]) => {
      const appImagePath   = typeof target === 'string' ? target : target.path
      const name           = typeof target === 'string' ? null   : (target.name ?? null)
      const iconName       = typeof target === 'string' ? null   : (target.icon ?? null)
      const matchedProfile = path.basename(appImagePath).replace(/^wrapweb-/, '')
      if (matchedProfile === pkg.profile || !fs.existsSync(appImagePath)) return acc
      const slash  = key.indexOf('/')
      const host   = slash !== -1 ? key.slice(0, slash) : key
      const prefix = slash !== -1 ? '/' + key.slice(slash + 1) : '/'
      // Fall back to the installed wrapweb icon (wrapweb-<profile>) when the build-config icon
      // name doesn't resolve — installed AppImages always register their icon under this name.
      const iconDataUrl = toDataUrl(resolveIconPath(iconName) ?? resolveIconPath(`wrapweb-${matchedProfile}`))
      acc.push({ host, prefix, iconDataUrl, name: name || matchedProfile })
      return acc
    }, [])
    .sort((a, b) => b.prefix.length - a.prefix.length)

  // Builds the tooltip injection script for the main frame.
  // The tooltip DOM always lives in the main frame so position:fixed anchors to the main window bottom —
  // even when the hovered link is inside a same-origin iframe.
  function buildTooltipScript() {
    // Mirrors i18n.js keys mailtoCompose (de/en) — window.js cannot import the ES module.
    const mailtoLabel = app.getPreferredSystemLanguages()[0]?.startsWith('de')
      ? 'Mail an {addr} verfassen'
      : 'Compose mail to {addr}'
    const vars = [
      `const browserIconUrl  = ${JSON.stringify(browserIconDataUrl)};`,
      `const mailIconUrl     = ${JSON.stringify(mailIconDataUrl)};`,
      `const safeSrc         = ${JSON.stringify(safeIconDataUrl)};`,
      `const unsafeSrc       = ${JSON.stringify(unsafeIconDataUrl)};`,
      `const appOrigin       = ${JSON.stringify(appOrigin)};`,
      `const internalDomains = ${JSON.stringify(internalDomains)};`,
      `const routeEntries    = ${JSON.stringify(routeEntries)};`,
      `const mailtoLabel     = ${JSON.stringify(mailtoLabel)};`,
    ].join('\n')
    return `(() => {\n${vars}\n${tooltipScript}\n})()`
  }

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.insertCSS(`
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.4); border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,0.7); }
      ::-webkit-scrollbar-corner { background: transparent; }
      ${tooltipCss}
    `)
    mainWindow.webContents.executeJavaScript(`
      window.addEventListener('wheel', (e) => {
        if (e.ctrlKey) window.electronAPI.adjustZoom(e.deltaY < 0 ? 1 : -1);
      }, { passive: true });
      ${buildTooltipScript()}
    `)
  })

  return mainWindow
}

module.exports = { createWindow }
