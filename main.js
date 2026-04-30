const { app, BrowserWindow, Menu, ipcMain } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')
const { spawnSync, spawn } = require('node:child_process')
const pkg = require(app.getAppPath() + '/package.json')

Menu.setApplicationMenu(null)

app.commandLine.appendSwitch('ozone-platform-hint', 'wayland')
app.commandLine.appendSwitch('use-gl',              'angle')
app.commandLine.appendSwitch('disable-vulkan')
app.commandLine.appendSwitch('disable-features',   'Vulkan,UseSkiaRenderer')
app.commandLine.appendSwitch('enable-features',    'WebRTCPipeWireCapturer')
app.commandLine.appendSwitch('enable-webrtc-pipewire-capturer')

const { profile } = pkg

if (profile) {
  app.setAppUserModelId(pkg.appId)
  app.setName(`wrapweb-${profile}`)
  app.commandLine.appendSwitch('wm-class', `wrapweb-${profile}`)
  app.setPath('userData', path.join(app.getPath('appData'), 'wrapweb', profile))

  const { createWindow } = require('./src/window')
  app.whenReady().then(() => {
    createWindow(pkg)
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow(pkg)
    })
  })
} else {
  ipcMain.handle('manager:apps', () => {
    const configs = fs.readdirSync(__dirname)
      .filter(f => /^build\..+\.json$/.test(f))
      .sort()
      .map(f => {
        const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8'))
        const configLabel = f.replace(/^build\.(.+)\.json$/, '$1')
        const built = fs.existsSync(path.join(__dirname, 'dist', `wrapweb.${cfg.profile}`))
        const desktopFile = path.join(os.homedir(), '.local', 'share', 'applications', `wrapweb-${cfg.profile}.desktop`)
        const installed = fs.existsSync(desktopFile)
        let iconValue = cfg.icon || null
        if (installed) {
          const m = fs.readFileSync(desktopFile, 'utf8').match(/^Icon=(.+)$/m)
          if (m) iconValue = m[1].trim()
        }
        const appImagePath = path.join(__dirname, 'dist', `wrapweb.${cfg.profile}`)
        const profilePath  = path.join(app.getPath('appData'), 'wrapweb', cfg.profile)
        return { profile: cfg.profile, configLabel, name: cfg.name, url: cfg.url, built, installed, isPrivate: f.startsWith('build.private.'), iconValue, appImagePath, profilePath }
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
        iconPath = path.isAbsolute(iconValue) && fs.existsSync(iconValue)
          ? iconValue
          : resolved[iconValue] || null
      }
      return { ...c, iconPath }
    })
  })

  ipcMain.handle('manager:version', () => pkg.version)

  ipcMain.handle('manager:ui-icons', () => {
    const r = resolveIconsByGtk([
      'weather-clear-symbolic', 'weather-clear-night-symbolic',
      'dialog-information-symbolic', 'system-run-symbolic',
      'system-software-install-symbolic', 'edit-delete-symbolic',
      'application-default-icon', 'open-menu-symbolic',
      'view-app-grid-symbolic', 'applications-internet-symbolic',
      'avatar-default-symbolic', 'view-filter-symbolic',
    ])
    return {
      sun: r['weather-clear-symbolic'], moon: r['weather-clear-night-symbolic'],
      info: r['dialog-information-symbolic'], build: r['system-run-symbolic'],
      install: r['system-software-install-symbolic'], delete: r['edit-delete-symbolic'],
      appDefault: r['application-default-icon'], menu: r['open-menu-symbolic'],
      filterAll: r['view-app-grid-symbolic'], filterPublic: r['applications-internet-symbolic'],
      filterPrivate: r['avatar-default-symbolic'], hideFilter: r['view-filter-symbolic'],
    }
  })

  ipcMain.handle('manager:launch', (event, profile) => {
    const appImagePath = path.join(__dirname, 'dist', `wrapweb.${profile}`)
    if (!fs.existsSync(appImagePath)) return { success: false }
    const child = spawn(appImagePath, ['--no-sandbox'], { detached: true, stdio: 'ignore' })
    child.unref()
    return { success: true }
  })

  ipcMain.handle('manager:delete', (event, profile) => {
    const desktopFile  = path.join(os.homedir(), '.local', 'share', 'applications', `wrapweb-${profile}.desktop`)
    const appImageFile = path.join(__dirname, 'dist', `wrapweb.${profile}`)
    try {
      if (fs.existsSync(desktopFile))  fs.rmSync(desktopFile)
      if (fs.existsSync(appImageFile)) fs.rmSync(appImageFile)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('manager:install', (event, configLabel) => {
    return new Promise((resolve) => {
      const child = spawn('node', [path.join(__dirname, 'scripts', 'install.js'), configLabel], { cwd: __dirname })
      let stdout = '', stderr = ''
      child.stdout?.on('data', d => { stdout += d.toString() })
      child.stderr?.on('data', d => { stderr += d.toString() })
      child.on('close', code => resolve({ success: code === 0, stdout, stderr }))
      child.on('error', err => resolve({ success: false, stdout, stderr: err.message }))
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

function openManager() {
  const win = new BrowserWindow({
    width: 780,
    height: 640,
    resizable: false,
    title: 'wrapweb',
    webPreferences: {
      preload: path.join(__dirname, 'src', 'manager', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  win.loadFile(path.join(__dirname, 'src', 'manager', 'index.html'))
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
