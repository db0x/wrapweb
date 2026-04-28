const { app, BrowserWindow, Menu, ipcMain } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')
const { spawnSync } = require('node:child_process')
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
        const built = fs.existsSync(path.join(__dirname, 'dist', `wrapweb.${cfg.profile}`))
        const desktopFile = path.join(os.homedir(), '.local', 'share', 'applications', `wrapweb-${cfg.profile}.desktop`)
        let iconValue = null
        if (fs.existsSync(desktopFile)) {
          const m = fs.readFileSync(desktopFile, 'utf8').match(/^Icon=(.+)$/m)
          if (m) iconValue = m[1].trim()
        }
        const appImagePath = path.join(__dirname, 'dist', `wrapweb.${cfg.profile}`)
        const profilePath  = path.join(app.getPath('appData'), 'wrapweb', cfg.profile)
        return { profile: cfg.profile, name: cfg.name, url: cfg.url, built, isPrivate: f.startsWith('build.private.'), iconValue, appImagePath, profilePath }
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
    const r = resolveIconsByGtk(['weather-clear-symbolic', 'weather-clear-night-symbolic', 'dialog-information-symbolic'])
    return { sun: r['weather-clear-symbolic'], moon: r['weather-clear-night-symbolic'], info: r['dialog-information-symbolic'] }
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
  const lines = (r.stdout || '').trim().split('\n')
  return Object.fromEntries(names.map((name, i) => [name, lines[i] || null]))
}

function openManager() {
  const win = new BrowserWindow({
    width: 960,
    height: 640,
    resizable: false,
    title: 'wrapweb',
    webPreferences: {
      preload: path.join(__dirname, 'src', 'manager-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  win.loadFile(path.join(__dirname, 'src', 'manager.html'))
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
