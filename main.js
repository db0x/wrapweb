const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')
const zlib = require('node:zlib')
const { spawnSync, spawn } = require('node:child_process')
const pkg = require(app.getAppPath() + '/package.json')
const { checkForUpdate } = require('./src/update-check')
const CONFIGS_DIR = path.join(__dirname, 'webapps')

Menu.setApplicationMenu(null)

function semverLt(a, b) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) < (pb[i] || 0)) return true
    if ((pa[i] || 0) > (pb[i] || 0)) return false
  }
  return false
}

if (!process.env.WRAPWEB_TEST) {
  app.commandLine.appendSwitch('ozone-platform-hint', 'wayland')
  app.commandLine.appendSwitch('use-gl',              'angle')
  app.commandLine.appendSwitch('disable-vulkan')
  app.commandLine.appendSwitch('disable-features',   'Vulkan,UseSkiaRenderer')
  app.commandLine.appendSwitch('enable-features',    'WebRTCPipeWireCapturer')
  app.commandLine.appendSwitch('enable-webrtc-pipewire-capturer')
}

const { profile } = pkg

if (profile) {
  app.setAppUserModelId(pkg.appId)
  app.setName(`wrapweb-${profile}`)
  app.commandLine.appendSwitch('wm-class', `wrapweb-${profile}`)
  app.setPath('userData', path.join(app.getPath('appData'), 'wrapweb', profile))

  function parseMailtoFields(raw) {
    try {
      const m = new URL(raw)
      return {
        to:      decodeURIComponent(m.pathname || ''),
        subject: m.searchParams.get('subject') || '',
        body:    m.searchParams.get('body')    || '',
        cc:      m.searchParams.get('cc')      || '',
        bcc:     m.searchParams.get('bcc')     || '',
      }
    } catch { return null }
  }

  function extractXmlFromDrawioSvg(content) {
    const match = content.match(/\bcontent="([^"]*)"/)
    if (!match) return null
    return match[1]
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  }

  function extractXmlFromDrawioPng(buf) {
    let off = 8
    while (off + 12 <= buf.length) {
      const len  = buf.readUInt32BE(off)
      const type = buf.slice(off + 4, off + 8).toString('ascii')
      const data = buf.slice(off + 8, off + 8 + len)
      if (type === 'tEXt') {
        const ni = data.indexOf(0)
        if (ni > 0 && data.slice(0, ni).toString('ascii') === 'mxfile')
          try { return decodeURIComponent(data.slice(ni + 1).toString('utf8')) } catch { return null }
      } else if (type === 'zTXt') {
        const ni = data.indexOf(0)
        if (ni > 0 && data.slice(0, ni).toString('ascii') === 'mxfile') {
          try { return decodeURIComponent(zlib.inflateSync(data.slice(ni + 2)).toString('utf8')) } catch { return null }
        }
      } else if (type === 'IEND') break
      off += 12 + len
    }
    return null
  }

  function resolveFileUrl(raw) {
    if (!raw || !pkg.fileHandler) return null
    try {
      const filePath = raw.startsWith('file://') ? new URL(raw).pathname : raw
      if (!path.isAbsolute(filePath)) return null
      const title = encodeURIComponent(path.basename(filePath))
      let xml
      if (filePath.endsWith('.drawio.svg')) {
        xml = extractXmlFromDrawioSvg(fs.readFileSync(filePath, 'utf8'))
      } else if (filePath.endsWith('.drawio.png')) {
        xml = extractXmlFromDrawioPng(fs.readFileSync(filePath))
      } else {
        xml = fs.readFileSync(filePath, 'utf8')
      }
      if (!xml) return null
      return `${pkg.url}/?title=${title}#R${encodeURIComponent(xml)}`
    } catch { return null }
  }

  function resolveUrl(raw) {
    if (!raw) return null
    if (raw.startsWith('file:') || path.isAbsolute(raw)) return null  // handled by resolveFileUrl
    if (raw.startsWith('mailto:')) {
      if (pkg.mailtoJs) return null  // handled via JS injection; load default URL
      if (pkg.mailtoTemplate) {
        try {
          const fields = parseMailtoFields(raw)
          const map = pkg.mailtoParamMap || {}
          const params = new URLSearchParams()
          if (fields.to) params.set('to', fields.to)
          const m = new URL(raw)
          for (const [k, v] of m.searchParams) params.set(map[k] ?? k, v)
          const sep = (pkg.mailtoTemplate.includes('?') || pkg.mailtoTemplate.includes('#')) ? '&' : '?'
          return `${pkg.mailtoTemplate}${sep}${params.toString()}`
        } catch { return null }
      }
      return null  // no handler configured — load default URL rather than a mailto: URL Electron can't render
    }
    return raw
  }

  function resolveMailtoJs(raw) {
    if (!raw || !raw.startsWith('mailto:') || !pkg.mailtoJs) return null
    const fields = parseMailtoFields(raw)
    if (!fields) return null
    return pkg.mailtoJs.replace(/\{(\w+)\}/g, (_, k) => fields[k] ?? '')
  }

  function typeMailtoFields(win, fields) {
    if (!fields || (!fields.to && !fields.subject)) return
    let attempts = 0
    function poll() {
      if (++attempts > 40 || win.isDestroyed()) return
      win.webContents.executeJavaScript('document.activeElement.className')
        .then(async cls => {
          if (typeof cls === 'string' && cls.includes('tt-input')) {
            if (fields.to) {
              for (const char of fields.to)
                win.webContents.sendInputEvent({ type: 'char', keyCode: char })
              win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Return' })
              win.webContents.sendInputEvent({ type: 'keyUp',   keyCode: 'Return' })
              await new Promise(r => setTimeout(r, 300))
            }
            if (fields.subject) {
              const ok = await win.webContents.executeJavaScript(
                `var s=document.querySelector('input[name="subject"]');s?(s.focus(),true):false`
              )
              if (ok) {
                await new Promise(r => setTimeout(r, 100))
                for (const char of fields.subject)
                  win.webContents.sendInputEvent({ type: 'char', keyCode: char })
              }
            }
          } else {
            setTimeout(poll, 300)
          }
        })
        .catch(() => setTimeout(poll, 300))
    }
    setTimeout(poll, 300)
  }

  const rawArg   = process.argv.slice(1).find(a => /^(https?:|mailto:|file:)/.test(a) ||
    (pkg.fileHandler && path.isAbsolute(a) && fs.existsSync(a)))
  const urlArg   = resolveUrl(rawArg) ?? resolveFileUrl(rawArg)
  const jsArg    = resolveMailtoJs(rawArg)
  const jsFields = (rawArg?.startsWith('mailto:') && pkg.mailtoJs) ? parseMailtoFields(rawArg) : null

  if (pkg.singleInstance) {
    const gotLock = app.requestSingleInstanceLock()
    if (!gotLock) { app.quit(); return }
    app.on('second-instance', (event, argv) => {
      const raw2     = argv.slice(1).find(a => /^(https?:|mailto:|file:)/.test(a) ||
        (pkg.fileHandler && path.isAbsolute(a) && fs.existsSync(a)))
      const url      = resolveUrl(raw2) ?? resolveFileUrl(raw2)
      const js       = resolveMailtoJs(raw2)
      const js2Fields = (raw2?.startsWith('mailto:') && pkg.mailtoJs) ? parseMailtoFields(raw2) : null
      const win      = BrowserWindow.getAllWindows()[0]
      if (win) {
        if (url) win.webContents.loadURL(url)
        if (js) {
          win.webContents.executeJavaScript(js).catch(() => {})
          if (js2Fields) typeMailtoFields(win, js2Fields)
        }
        if (win.isMinimized()) win.restore()
        win.focus()
      }
    })
  }

  const { createWindow } = require('./src/window')
  app.whenReady().then(() => {
    const win = createWindow(urlArg ? { ...pkg, url: urlArg } : pkg)
    if (jsArg) {
      win.webContents.once('did-finish-load', () => {
        win.webContents.executeJavaScript(jsArg).catch(() => {})
        if (jsFields) typeMailtoFields(win, jsFields)
      })
    }
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow(pkg)
    })
  })
} else {
  ipcMain.handle('manager:apps', () => {
    const defaultMailDesktop = (() => {
      try {
        const r = spawnSync('xdg-mime', ['query', 'default', 'x-scheme-handler/mailto'], { encoding: 'utf8', timeout: 2000 })
        return r.stdout.trim() || null
      } catch { return null }
    })()

    const configs = fs.readdirSync(CONFIGS_DIR)
      .filter(f => /^build\..+\.json$/.test(f))
      .map(f => {
        const cfg = JSON.parse(fs.readFileSync(path.join(CONFIGS_DIR, f), 'utf8'))
        const configLabel = f.replace(/^build\.(.+)\.json$/, '$1')
        const built = fs.existsSync(path.join(__dirname, 'dist', `wrapweb-${cfg.profile}`))
        const desktopFile = path.join(os.homedir(), '.local', 'share', 'applications', `wrapweb-${cfg.profile}.desktop`)
        const installed = fs.existsSync(desktopFile)
        let iconValue = cfg.icon || null
        if (installed) {
          const m = fs.readFileSync(desktopFile, 'utf8').match(/^Icon=(.+)$/m)
          if (m) iconValue = m[1].trim()
        }
        const appImagePath = path.join(__dirname, 'dist', `wrapweb-${cfg.profile}`)
        const profilePath  = path.join(app.getPath('appData'), 'wrapweb', cfg.profile)
        const isDefaultMailHandler = defaultMailDesktop === `wrapweb-${cfg.profile}.desktop`
        let builtVersion = null
        if (built) {
          try { builtVersion = fs.readFileSync(path.join(__dirname, 'dist', `wrapweb-${cfg.profile}.version`), 'utf8').trim() } catch {}
        }
        const minVer = pkg.minAppImageVersion ?? pkg.version
        const needsRebuild = built && (
          process.env.WRAPWEB_TEST
            ? builtVersion !== null && semverLt(builtVersion, minVer)
            : semverLt(builtVersion ?? '0.0.0', minVer)
        )
        return { profile: cfg.profile, configLabel, name: cfg.name, url: cfg.url, built, installed, isPrivate: f.startsWith('build.private.'), iconValue, appImagePath, profilePath, icon: cfg.icon || null, geometry: cfg.geometry || null, userAgent: cfg.userAgent || null, crossOriginIsolation: cfg.crossOriginIsolation || false, singleInstance: cfg.singleInstance || false, internalDomains: cfg.internalDomains || null, mimeTypes: cfg.mimeTypes || null, mailtoJs: cfg.mailtoJs || null, isDefaultMailHandler, category: cfg.category || null, builtVersion, needsRebuild }
      })

    configs.sort((a, b) => {
      const nameA = (a.name || a.profile.replace(/^private\./, '').replace(/-/g, ' ')).toLowerCase()
      const nameB = (b.name || b.profile.replace(/^private\./, '').replace(/-/g, ' ')).toLowerCase()
      return nameA.localeCompare(nameB)
    })

    // Separate absolute paths from theme names — batch-resolve theme names via GTK
    const themeNames = [...new Set(configs
      .map(c => c.iconValue)
      .filter(v => v && v !== 'wrapweb' && !path.isAbsolute(v))
    )]
    const resolved = resolveIconsByGtk(themeNames)

    return configs.map(({ iconValue, ...c }) => {
      let iconPath = null
      if (iconValue && iconValue !== 'wrapweb') {
        if (path.isAbsolute(iconValue) && fs.existsSync(iconValue)) {
          iconPath = iconValue
        } else {
          const bundled = path.join(__dirname, 'assets', 'webapps', `${iconValue}.svg`)
          iconPath = resolved[iconValue] || (fs.existsSync(bundled) ? bundled : null)
        }
      }
      return { ...c, iconPath }
    })
  })

  ipcMain.handle('manager:version',    () => pkg.version)
  ipcMain.handle('manager:i18n',       () => t())
  ipcMain.handle('manager:ua-presets', () => pkg.uaPresets ?? [])

  ipcMain.handle('manager:ui-icons', () => {
    if (process.env.WRAPWEB_TEST) {
      const fi = process.env.WRAPWEB_TEST_FILTER_ICONS || null
      return fi ? { filterMicrosoft: fi, filterGoogle: fi } : {}
    }
    const r = resolveIconsByGtk([
      'weather-clear-symbolic', 'weather-clear-night-symbolic',
      'dialog-information-symbolic', 'system-run-symbolic',
      'system-software-install-symbolic', 'edit-delete-symbolic',
      'application-default-icon', 'open-menu-symbolic',
      'view-app-grid-symbolic', 'applications-internet-symbolic',
      'avatar-default-symbolic', 'view-filter-symbolic',
      'document-edit-symbolic', 'github',
      'view-group', 'update-notifier',
    ])
    return {
      sun: r['weather-clear-symbolic'], moon: r['weather-clear-night-symbolic'],
      info: r['dialog-information-symbolic'], build: r['system-run-symbolic'],
      install: r['system-software-install-symbolic'], delete: r['edit-delete-symbolic'],
      appDefault: r['application-default-icon'], menu: r['open-menu-symbolic'],
      filterAll: r['view-app-grid-symbolic'], filterPublic: r['applications-internet-symbolic'],
      filterPrivate: r['avatar-default-symbolic'], hideFilter: r['view-filter-symbolic'],
      edit: r['document-edit-symbolic'], github: r['github'],
      filterMicrosoft: r['view-group'], filterGoogle: r['view-group'],
      updateNotifier: r['update-notifier'],
    }
  })

  ipcMain.handle('manager:launch', (event, profile) => {
    const appImagePath = path.join(__dirname, 'dist', `wrapweb-${profile}`)
    if (!fs.existsSync(appImagePath)) return { success: false }
    const child = spawn(appImagePath, ['--no-sandbox'], { detached: true, stdio: 'ignore' })
    child.unref()
    return { success: true }
  })

  ipcMain.handle('manager:delete', (event, { profile, configLabel, deleteConfig, deleteProfileData }) => {
    const desktopFile  = path.join(os.homedir(), '.local', 'share', 'applications', `wrapweb-${profile}.desktop`)
    const appImageFile = path.join(__dirname, 'dist', `wrapweb-${profile}`)
    const configFile   = configLabel ? path.join(CONFIGS_DIR, `build.${configLabel}.json`) : null
    const profileDir   = path.join(app.getPath('appData'), 'wrapweb', profile)
    try {
      if (fs.existsSync(desktopFile))                                    fs.rmSync(desktopFile)
      if (fs.existsSync(appImageFile))                                   fs.rmSync(appImageFile)
      if (deleteConfig     && configFile && fs.existsSync(configFile))   fs.rmSync(configFile)
      if (deleteProfileData && fs.existsSync(profileDir))                fs.rmSync(profileDir, { recursive: true })
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('manager:install', (event, configLabel, setAsMailHandler) => {
    return new Promise((resolve) => {
      const child = spawn('node', [path.join(__dirname, 'scripts', 'install.js'), configLabel], { cwd: __dirname })
      let stdout = '', stderr = ''
      child.stdout?.on('data', d => { stdout += d.toString() })
      child.stderr?.on('data', d => { stderr += d.toString() })
      child.on('close', code => {
        if (code === 0 && setAsMailHandler) {
          const desktopName = `wrapweb-${configLabel.replace(/^private\./, '')}.desktop`
          spawnSync('xdg-mime', ['default', desktopName, 'x-scheme-handler/mailto'], { timeout: 2000 })
        }
        resolve({ success: code === 0, stdout, stderr })
      })
      child.on('error', err => resolve({ success: false, stdout, stderr: err.message }))
    })
  })

  ipcMain.handle('manager:reveal-path', (event, targetPath) => {
    const isDir = fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()
    isDir ? shell.openPath(targetPath) : shell.showItemInFolder(targetPath)
  })

  ipcMain.handle('manager:check-profile', (event, profile) => {
    return [`build.private.${profile}.json`, `build.${profile}.json`]
      .some(f => fs.existsSync(path.join(CONFIGS_DIR, f)))
  })

  function buildAppCfg({ profile, name, url, icon, width, height, userAgent, internalDomains, crossOriginIsolation, singleInstance, mailHandler, mailtoJs }) {
    const cfg = { profile, url }
    if (name)  cfg.name = name
    if (icon)  cfg.icon = icon
    const w = parseInt(width), h = parseInt(height)
    if (w > 0 || h > 0) {
      cfg.geometry = {}
      if (w > 0) cfg.geometry.width  = w
      if (h > 0) cfg.geometry.height = h
    }
    if (userAgent) cfg.userAgent = userAgent
    if (crossOriginIsolation) cfg.crossOriginIsolation = true
    if (singleInstance) cfg.singleInstance = true
    if (internalDomains) {
      const domains = internalDomains.split(',').map(d => d.trim()).filter(Boolean)
      if (domains.length === 1) cfg.internalDomains = domains[0]
      else if (domains.length > 1) cfg.internalDomains = domains
    }
    if (mailHandler) cfg.mimeTypes = ['x-scheme-handler/mailto']
    if (mailHandler && mailtoJs) cfg.mailtoJs = mailtoJs
    return cfg
  }

  ipcMain.handle('manager:plugins', () => {
    const pluginsDir = path.join(CONFIGS_DIR, 'plugins')
    if (!fs.existsSync(pluginsDir)) return []
    const entries = []
    for (const entry of fs.readdirSync(pluginsDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.js')) {
        entries.push({ file: `plugins/${entry.name}`, label: entry.name.replace(/\.js$/, ''), category: null })
      } else if (entry.isDirectory()) {
        const subDir = path.join(pluginsDir, entry.name)
        for (const sub of fs.readdirSync(subDir, { withFileTypes: true })) {
          if (sub.isFile() && sub.name.endsWith('.js'))
            entries.push({ file: `plugins/${entry.name}/${sub.name}`, label: sub.name.replace(/\.js$/, ''), category: entry.name })
        }
      }
    }
    return entries
  })

  ipcMain.handle('manager:create-app', (event, data) => {
    const filePath = path.join(CONFIGS_DIR, `build.private.${data.profile}.json`)
    if (fs.existsSync(filePath)) return { success: false, error: 'exists' }
    const cfg = buildAppCfg(data)
    try {
      fs.writeFileSync(filePath, JSON.stringify(cfg, null, 4), 'utf8')
    } catch (err) {
      return { success: false, error: err.message }
    }
    let iconPath = null
    if (data.icon) {
      const resolved = resolveIconsByGtk([data.icon])
      iconPath = resolved[data.icon] || null
    }
    const w = parseInt(data.width), h = parseInt(data.height)
    return {
      success: true,
      app: {
        profile:             data.profile,
        configLabel:         `private.${data.profile}`,
        name:                data.name || null,
        url:                 data.url,
        built: false, installed: false, isPrivate: true,
        iconPath,
        icon:                data.icon || null,
        geometry:            (w > 0 || h > 0) ? cfg.geometry : null,
        userAgent:           data.userAgent || null,
        crossOriginIsolation: data.crossOriginIsolation || false,
        singleInstance:      data.singleInstance || false,
        internalDomains:     data.internalDomains ? cfg.internalDomains : null,
        mimeTypes:           cfg.mimeTypes || null,
        mailtoJs:            cfg.mailtoJs  || null,
      }
    }
  })

  ipcMain.handle('manager:update-app', (event, data) => {
    const filePath = path.join(CONFIGS_DIR, `build.private.${data.profile}.json`)
    if (!fs.existsSync(filePath)) return { success: false, error: 'not found' }
    const cfg = buildAppCfg(data)
    try {
      fs.writeFileSync(filePath, JSON.stringify(cfg, null, 4), 'utf8')
    } catch (err) {
      return { success: false, error: err.message }
    }
    let iconPath = null
    if (data.icon) {
      const resolved = resolveIconsByGtk([data.icon])
      iconPath = resolved[data.icon] || null
    }
    const w = parseInt(data.width), h = parseInt(data.height)
    return {
      success: true,
      app: {
        name:                data.name || null,
        url:                 data.url,
        icon:                data.icon || null,
        iconPath,
        geometry:            (w > 0 || h > 0) ? cfg.geometry : null,
        userAgent:           data.userAgent || null,
        crossOriginIsolation: data.crossOriginIsolation || false,
        singleInstance:      data.singleInstance || false,
        internalDomains:     data.internalDomains ? cfg.internalDomains : null,
        mimeTypes:           cfg.mimeTypes || null,
        mailtoJs:            cfg.mailtoJs  || null,
      }
    }
  })

  ipcMain.handle('manager:all-icons', () => {
    const script = `
import gi, sys
gi.require_version('Gtk', '3.0')
from gi.repository import Gtk
theme = Gtk.IconTheme.get_default()
for name in sorted(theme.list_icons(None)):
    info = theme.lookup_icon(name, 48, 0)
    if info:
        fn = info.get_filename()
        if fn:
            sys.stdout.write(name + '\\t' + fn + '\\n')
`
    const r = spawnSync('python3', ['-c', script], { encoding: 'utf8', timeout: 15000, maxBuffer: 32 * 1024 * 1024 })
    if (r.error || r.status !== 0) return []
    return (r.stdout || '').trim().split('\n').filter(Boolean).map(line => {
      const tab = line.indexOf('\t')
      if (tab === -1) return null
      return { name: line.slice(0, tab), path: line.slice(tab + 1) }
    }).filter(Boolean)
  })

  ipcMain.handle('manager:check-update', () => checkForUpdate(pkg.version))

  ipcMain.handle('manager:open-external', (event, url) => {
    const allowed = /^https:\/\/github\.com\//
    if (allowed.test(url)) shell.openExternal(url)
  })

  ipcMain.handle('manager:delete-profile-data', (event, profile) => {
    const dir = path.join(app.getPath('appData'), 'wrapweb', profile)
    try {
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true })
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('manager:profile-sizes', () => {
    const configs = fs.readdirSync(CONFIGS_DIR)
      .filter(f => /^build\..+\.json$/.test(f))
      .map(f => {
        const cfg = JSON.parse(fs.readFileSync(path.join(CONFIGS_DIR, f), 'utf8'))
        return { profile: cfg.profile, name: cfg.name || null }
      })
    return configs.map(({ profile, name }) => {
      const dir = path.join(app.getPath('appData'), 'wrapweb', profile)
      if (!fs.existsSync(dir)) return { profile, name, bytes: 0, exists: false }
      const r = spawnSync('du', ['-sb', dir], { encoding: 'utf8' })
      const bytes = r.status === 0 ? parseInt((r.stdout || '').split('\t')[0]) || 0 : 0
      return { profile, name, bytes, exists: true }
    })
  })

  ipcMain.handle('manager:build', (event, configLabel) => {
    return new Promise((resolve) => {
      const child = spawn('node', [path.join(__dirname, 'scripts', 'build.js'), configLabel], { cwd: __dirname })
      let stdout = '', stderr = ''
      child.stdout?.on('data', d => { stdout += d.toString() })
      child.stderr?.on('data', d => { stderr += d.toString() })
      child.on('close', code => resolve({ success: code === 0, stdout, stderr }))
      child.on('error', err => resolve({ success: false, stdout, stderr: err.message }))
    })
  })

  app.whenReady().then(() => {
    openManager()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) openManager()
    })
  })
}

function resolveIconsByGtk(names) {
  if (names.length === 0) return {}
  const script = `
import gi, sys
gi.require_version('Gtk', '3.0')
from gi.repository import Gtk
theme = Gtk.IconTheme.get_default()
for name in sys.argv[1:]:
    info = theme.lookup_icon(name, 64, 0)
    print(info.get_filename() if info else '')
`
  const r = spawnSync('python3', ['-c', script, ...names], { encoding: 'utf8', timeout: 3000 })
  if (r.error || r.status !== 0) return {}
  const lines = (r.stdout || '').split('\n')
  return Object.fromEntries(names.map((name, i) => [name, lines[i] || null]))
}

const { t } = require('./src/i18n')

const managerStatePath = path.join(app.getPath('appData'), 'wrapweb', 'manager-state.json')

function loadManagerBounds() {
  try {
    const { width, height } = JSON.parse(fs.readFileSync(managerStatePath, 'utf8'))
    if (width > 0 && height > 0) return { width, height }
  } catch {}
  return null
}

function saveManagerBounds(win) {
  try {
    const { width, height } = win.getBounds()
    fs.mkdirSync(path.dirname(managerStatePath), { recursive: true })
    fs.writeFileSync(managerStatePath, JSON.stringify({ width, height }), 'utf8')
  } catch {}
}

function openManager() {
  const saved = loadManagerBounds()
  const win = new BrowserWindow({
    width:  saved?.width  ?? 780,
    height: saved?.height ?? 820,
    minWidth: 400,
    minHeight: 400,
    title: 'wrapweb',
    webPreferences: {
      preload: path.join(__dirname, 'src', 'manager', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  win.on('close', () => saveManagerBounds(win))
  win.webContents.on('context-menu', (_event, params) => {
    const i18n = t()
    if (params.isEditable) {
      Menu.buildFromTemplate([
        { role: 'cut',   label: i18n.cut   },
        { role: 'copy',  label: i18n.copy  },
        { role: 'paste', label: i18n.paste },
      ]).popup({ window: win })
    } else if (params.selectionText) {
      Menu.buildFromTemplate([
        { role: 'copy', label: i18n.copy },
      ]).popup({ window: win })
    }
  })

  win.loadFile(path.join(__dirname, 'src', 'manager', 'manager.html'))
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
