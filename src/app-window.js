// Entry point for app-window mode (pkg.profile is set).
// Sets up URL resolution, mailto handling, draw.io file handling, and the single-instance lock,
// then opens the app window once Electron is ready.

const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
const fs   = require('node:fs')
const zlib = require('node:zlib')

const pkg = require(app.getAppPath() + '/package.json')
const { createWindow }              = require('./window')
const { resolveRcloneFileUrl,
        buildRcloneLoadingPage }    = require('./rclone-file-handler')

// Parses a mailto: URI (e.g. "mailto:a@b.com?subject=Hi") into a plain object.
// URL() handles the parsing; the recipient is in the URL pathname, not a query param.
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

// draw.io SVG files embed the diagram XML as HTML-escaped content= attribute value.
function extractXmlFromDrawioSvg(content) {
  const match = content.match(/\bcontent="([^"]*)"/)
  if (!match) return null
  return match[1]
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
}

// draw.io PNG files embed the diagram XML as a PNG tEXt or zTXt chunk with key "mxfile".
// zTXt chunks add zlib compression (2-byte header before the deflate stream).
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

// Converts a command-line URL argument into a loadable URL.
// mailto: is only forwarded if mailtoTemplate is configured; otherwise Electron would
// try to render the raw mailto: URI, which produces a blank page.
function resolveUrl(raw) {
  if (!raw) return null
  if (raw.startsWith('file:') || path.isAbsolute(raw)) return null  // handled by resolveFileUrl
  if (raw.startsWith('mailto:')) {
    if (pkg.mailtoJs) return null  // handled via JS injection; load default URL
    if (pkg.mailtoTemplate) {
      try {
        const fields = parseMailtoFields(raw)
        const map    = pkg.mailtoParamMap || {}
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

// Builds the JS snippet to inject after page load when mailtoJs is configured.
// The template string uses {to}, {subject}, {body} etc. as placeholders.
function resolveMailtoJs(raw) {
  if (!raw || !raw.startsWith('mailto:') || !pkg.mailtoJs) return null
  const fields = parseMailtoFields(raw)
  if (!fields) return null
  return pkg.mailtoJs.replace(/\{(\w+)\}/g, (_, k) => fields[k] ?? '')
}

// Polls until the compose-to input field is focused (detected by CSS class "tt-input"),
// then simulates keyboard input to fill in the recipient and subject.
// Native sendInputEvent is used because executeJavaScript cannot trigger
// the web app's own keydown handlers reliably for token-input widgets.
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

module.exports = function setupAppWindow() {
  // These must run synchronously before app.whenReady() — Electron reads them during startup.
  app.setAppUserModelId(pkg.appId)
  app.setName(`wrapweb-${pkg.profile}`)
  app.commandLine.appendSwitch('wm-class', `wrapweb-${pkg.profile}`)
  app.setPath('userData', path.join(app.getPath('appData'), 'wrapweb', pkg.profile))

  const rawArg   = process.argv.slice(1).find(a => /^(https?:|mailto:|file:)/.test(a) ||
    ((pkg.fileHandler || pkg.rcloneFileHandler) && path.isAbsolute(a) && fs.existsSync(a)))
  const urlArg   = resolveUrl(rawArg) ?? resolveFileUrl(rawArg)
  const jsArg    = resolveMailtoJs(rawArg)
  const jsFields = (rawArg?.startsWith('mailto:') && pkg.mailtoJs) ? parseMailtoFields(rawArg) : null

  // Single-instance lock: if another process already holds it, quit immediately.
  // The second-instance handler lets the existing window handle the new URL argument.
  if (pkg.singleInstance) {
    const gotLock = app.requestSingleInstanceLock()
    if (!gotLock) { app.quit(); return }
    app.on('second-instance', (event, argv) => {
      const raw2      = argv.slice(1).find(a => /^(https?:|mailto:|file:)/.test(a) ||
        ((pkg.fileHandler || pkg.rcloneFileHandler) && path.isAbsolute(a) && fs.existsSync(a)))
      const url       = resolveUrl(raw2) ?? resolveFileUrl(raw2)
      const js        = resolveMailtoJs(raw2)
      const js2Fields = (raw2?.startsWith('mailto:') && pkg.mailtoJs) ? parseMailtoFields(raw2) : null
      const win       = BrowserWindow.getAllWindows()[0]
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

  app.whenReady().then(async () => {
    const useRclone  = pkg.rcloneFileHandler && rawArg && !urlArg
    const initialUrl = useRclone ? buildRcloneLoadingPage() : (urlArg ?? null)
    const win        = createWindow(initialUrl ? { ...pkg, url: initialUrl } : pkg)

    // rclone file handler: window shows a loading page while the upload runs,
    // then navigates to the edit URL (or falls back to the default URL on error).
    if (useRclone) {
      resolveRcloneFileUrl(rawArg, win).then(editUrl => {
        if (!win.isDestroyed()) win.webContents.loadURL(editUrl ?? pkg.url)
      }).catch(() => {
        if (!win.isDestroyed()) win.webContents.loadURL(pkg.url)
      })
    }

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
}
