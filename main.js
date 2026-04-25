const { app, BrowserWindow } = require('electron')
const path = require('node:path')
const pkg = require(app.getAppPath() + '/package.json')
const { createWindow } = require('./src/window')

const { profile } = pkg

console.log(' profile: ' + profile)
console.log(' pwa: '     + pkg.url)

app.setAppUserModelId(pkg.appId)
app.setName(`wrapweb-${profile}`)
app.commandLine.appendSwitch('wm-class',          `wrapweb-${profile}`)
app.commandLine.appendSwitch('ozone-platform-hint', 'wayland')
app.commandLine.appendSwitch('use-gl',             'angle')
app.commandLine.appendSwitch('disable-vulkan')
app.commandLine.appendSwitch('disable-features',  'Vulkan,UseSkiaRenderer')
app.commandLine.appendSwitch('enable-features',   'WebRTCPipeWireCapturer')
app.commandLine.appendSwitch('enable-webrtc-pipewire-capturer')
app.setPath('userData', path.join(app.getPath('appData'), 'wrapweb', profile))

app.whenReady().then(() => {
  createWindow(pkg)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(pkg)
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
