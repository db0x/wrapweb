const { BrowserWindow, shell, ipcMain } = require('electron')
const path = require('node:path')
const { createSession } = require('./session')
const { showContextMenu } = require('./context-menu')

function createWindow(pkg) {
  const customSession = createSession(pkg.profile)

  const mainWindow = new BrowserWindow({
    width:  pkg.geometry?.width  ?? 1280,
    height: pkg.geometry?.height ?? 1024,
    x:      pkg.geometry?.x      ?? NaN,
    y:      pkg.geometry?.y      ?? NaN,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      session: customSession,
      ...(pkg.crossOriginIsolation && { enableBlinkFeatures: 'SharedArrayBuffer' }),
    },
  })

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
      // External URLs: open in system browser
      shell.openExternal(url)
      return { action: 'deny' }
    } catch (err) {
      return { action: 'deny' }
    }
  })

  mainWindow.webContents.on('context-menu', (_event, params) => {
    showContextMenu(mainWindow, customSession, params)
  })

  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.type === 'keyDown' && input.key === 'F12')
      mainWindow.webContents.toggleDevTools()
  })

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      window.addEventListener('wheel', (e) => {
        if (e.ctrlKey) window.electronAPI.adjustZoom(e.deltaY < 0 ? 1 : -1);
      }, { passive: true });
    `)
  })

  return mainWindow
}

module.exports = { createWindow }
