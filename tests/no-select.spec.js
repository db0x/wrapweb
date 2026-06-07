const { test, expect } = require('@playwright/test')
const path = require('node:path')

// Contract test for the no-select plugin's injection target. This is a plain Node assertion
// (no browser) because the regression is about WHICH webContents the plugin injects into, not
// any visible Manager UI. See window.js loadPlugins(): api.webContents is the app's webContents
// — equal to win.webContents normally, but the inset WebContentsView when another plugin (e.g.
// widget) runs the app in VIEW MODE. A plugin that injects into win.webContents instead silently
// hits the empty host/shadow page in view mode, so its effect disappears.

const NO_SELECT = path.join(__dirname, '..', 'webapps', 'plugins', 'no-select', 'no-select.js')

// Minimal webContents stub recording which one received the did-finish-load wiring.
function fakeWebContents(label) {
  return {
    label,
    on(event, cb) { if (event === 'did-finish-load') this._loaded = cb },
    insertCSS() { return Promise.resolve() },
    executeJavaScript() { return Promise.resolve() },
  }
}

// Setup:    The widget plugin runs the app in view mode, so win.webContents (host/shadow page)
//           and api.webContents (the inset app view) are DIFFERENT objects.
// Action:   Attach the no-select plugin with that win + api split.
// Expected: no-select wires did-finish-load onto api.webContents (the app), not win.webContents —
//           otherwise its user-select:none CSS lands on the empty host page and has no effect.
test('no-select injects into api.webContents (the app view), not the host window', () => {
  const noSelect = require(NO_SELECT)
  const hostWc = fakeWebContents('host')
  const appWc  = fakeWebContents('app')
  const win = { webContents: hostWc }
  const api = { webContents: appWc }

  noSelect.attachPlugin(win, api)

  // The app view got the load hook; the host shadow page did not.
  expect(typeof appWc._loaded).toBe('function')
  expect(hostWc._loaded).toBeUndefined()
})

// Setup:    Normal (non-view-mode) app: api.webContents === win.webContents.
// Action:   Attach the no-select plugin.
// Expected: It still wires into that single shared webContents — proving the api.webContents
//           contract is backward-compatible with apps that have no view-mode plugin.
test('no-select still works when api.webContents equals win.webContents', () => {
  const noSelect = require(NO_SELECT)
  const wc = fakeWebContents('shared')
  noSelect.attachPlugin({ webContents: wc }, { webContents: wc })
  expect(typeof wc._loaded).toBe('function')
})
