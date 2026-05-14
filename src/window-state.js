const fs = require('node:fs')
const path = require('node:path')
const { app } = require('electron')

function statePath() {
  return path.join(app.getPath('userData'), 'window-state.json')
}

function load() {
  try {
    return JSON.parse(fs.readFileSync(statePath(), 'utf8'))
  } catch {
    return null
  }
}

// Only persist size when the window is in a normal (restored) state — saving
// while maximized would store the screen dimensions as the "normal" size.
function save(win) {
  if (win.isMaximized() || win.isMinimized() || win.isDestroyed()) return
  const [width, height] = win.getSize()
  try {
    fs.writeFileSync(statePath(), JSON.stringify({ width, height }))
  } catch {}
}

module.exports = { load, save }
