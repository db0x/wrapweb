// Handles rclone-based file synchronisation for app windows configured with
// rcloneFileHandler. Uploads local files to Google Drive, detects conflicts,
// and syncs changes back to disk when the window closes.

const { app, ipcMain } = require('electron')
const path   = require('node:path')
const fs     = require('node:fs')
const os     = require('node:os')
const crypto = require('node:crypto')
const { spawn } = require('node:child_process')

const pkg     = require(app.getAppPath() + '/package.json')
const APP_ROOT = app.getAppPath()

// Mustache-style substitution for data: URL HTML pages.
// Same {{key}} syntax as applyTemplate in the manager, but runs in Node.js (no DOM).
function fillHtml(html, vars) {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}

// Read templates once at module load — only needed when rclone file handling is active.
const rcloneConflictTemplate = fs.readFileSync(path.join(__dirname, 'rclone-conflict.html'), 'utf8')
const rcloneLoadingTemplate  = fs.readFileSync(path.join(__dirname, 'rclone-loading.html'),  'utf8')

function fmtBytes(b) {
  if (b >= 1e9) return (b / 1e9).toFixed(1) + ' GB'
  if (b >= 1e6) return (b / 1e6).toFixed(1) + ' MB'
  if (b >= 1e3) return (b / 1e3).toFixed(0) + ' KB'
  return b + ' B'
}

// Reads the installed app icon and returns a base64 data URL for inline embedding.
// Prefers SVG over PNG; returns null if neither exists.
function appIconDataUrl() {
  const desktopName = `wrapweb-${pkg.profile}`
  const hicolor     = path.join(os.homedir(), '.local', 'share', 'icons', 'hicolor')
  const svgPath     = path.join(hicolor, 'scalable', 'apps', `${desktopName}.svg`)
  const pngPath     = path.join(hicolor, '48x48',    'apps', `${desktopName}.png`)
  if (fs.existsSync(svgPath)) return `data:image/svg+xml;base64,${fs.readFileSync(svgPath).toString('base64')}`
  if (fs.existsSync(pngPath)) return `data:image/png;base64,${fs.readFileSync(pngPath).toString('base64')}`
  return null
}

// Builds a self-contained confirm page with a local-vs-Drive comparison table.
// localStat is an fs.Stats object; existing is an rclone lsjson entry.
function buildConfirmPage(filename, existing, localStat, de) {
  const appIconUrl  = appIconDataUrl()
  const wrapwebSvg  = path.join(APP_ROOT, 'assets', 'wrapweb.svg')
  const wrapwebIcon = fs.existsSync(wrapwebSvg)
    ? `data:image/svg+xml;base64,${fs.readFileSync(wrapwebSvg).toString('base64')}`
    : null
  const rcloneSvg  = path.join(APP_ROOT, 'assets', 'rclone.svg')
  const rcloneIcon = fs.existsSync(rcloneSvg)
    ? `data:image/svg+xml;base64,${fs.readFileSync(rcloneSvg).toString('base64')}`
    : null

  const html = fillHtml(rcloneConflictTemplate, {
    title:      de ? 'Datei überschreiben?' : 'Overwrite file?',
    btnOpen:    de ? 'Bestehende öffnen'    : 'Open existing',
    btnOver:    de ? 'Überschreiben'        : 'Overwrite',
    labelLocal: de ? 'Lokal'                : 'Local',
    labelDrive: 'Google Drive',
    labelMod:   de ? 'Geändert'             : 'Modified',
    labelSize:  de ? 'Größe'                : 'Size',
    localMod:   localStat.mtime.toLocaleString(),
    localSize:  fmtBytes(localStat.size),
    remMod:     new Date(existing.ModTime).toLocaleString(),
    remSize:    fmtBytes(existing.Size),
    filename,
    wrapwebIconHtml: wrapwebIcon ? `<img src="${wrapwebIcon}" alt="wrapweb">` : '',
    rcloneIconHtml:  rcloneIcon  ? `<span class="header-rclone-badge"><img src="${rcloneIcon}" alt=""></span>` : '',
    appIconHtml:     appIconUrl  ? `<img class="file-icon" src="${appIconUrl}" alt="">` : '',
  })
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
}

// Builds a data: URL loading page shown while the rclone upload or sync runs.
// Ubuntu is a system font on Ubuntu Linux and picked up by Chromium without a network request.
function buildRcloneLoadingPage(text) {
  const lang = app.getLocale().split('-')[0].toLowerCase()
  if (!text) text = lang === 'de' ? 'Wird hochgeladen …' : 'Uploading …'
  return `data:text/html;charset=utf-8,${encodeURIComponent(fillHtml(rcloneLoadingTemplate, { text }))}`
}

// Computes the MD5 hash of a local file.
function localMd5(filePath) {
  return crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('hex')
}

// Fetches the MD5 hash of a single remote rclone path via `rclone md5sum`.
// Returns null if the remote doesn't support MD5 or the call fails.
// Uses spawn (not spawnSync) to avoid blocking the main process.
function remoteMd5(remotePath) {
  return new Promise(resolve => {
    const child = spawn('rclone', ['md5sum', remotePath])
    let out = ''
    child.stdout?.on('data', d => { out += d.toString() })
    child.on('close', code => {
      if (code !== 0) { resolve(null); return }
      const match = out.trim().match(/^([0-9a-f]{32})/)
      resolve(match ? match[1] : null)
    })
    child.on('error', () => resolve(null))
  })
}

// Polls remoteMd5 until it matches expectedHash or the deadline is reached.
// Used after upload to wait for Drive to finish processing the new file before
// navigating — Drive can lag several seconds between upload and content availability.
async function waitForDriveSync(remotePath, expectedHash, win, de) {
  const processingText = de ? 'Wird verarbeitet …' : 'Processing …'
  if (!win.isDestroyed()) win.webContents.loadURL(buildRcloneLoadingPage(processingText))
  const deadline = Date.now() + 20000
  while (Date.now() < deadline) {
    const remoteHash = await remoteMd5(remotePath)
    if (remoteHash === expectedHash) return
    await new Promise(r => setTimeout(r, 1500))
  }
}

function rcloneList(folder) {
  return new Promise(resolve => {
    const child = spawn('rclone', ['lsjson', folder])
    let out = ''
    child.stdout?.on('data', d => { out += d.toString() })
    child.on('close', code => {
      if (code !== 0) { resolve([]); return }
      try { resolve(JSON.parse(out)) } catch { resolve([]) }
    })
    child.on('error', () => resolve([]))
  })
}

// Registers a one-shot 'close' handler that downloads the Drive file back to the
// original local path before allowing the window to close. Only called when an
// actual upload happened — not when the user chose "open existing" without uploading.
function registerRcloneSyncBack(win, remotePath, localPath, de) {
  if (win.isDestroyed()) return
  const syncText = de ? 'Wird synchronisiert …' : 'Syncing …'
  win.once('close', async (event) => {
    event.preventDefault()
    if (!win.isDestroyed()) win.webContents.loadURL(buildRcloneLoadingPage(syncText))
    await new Promise(resolve => {
      const child = spawn('rclone', ['copyto', remotePath, localPath])
      child.on('close', () => resolve())
      child.on('error', () => resolve())
    })
    win.destroy()
  })
}

// Uploads a local file to the configured rclone Google Drive remote and returns
// the Google Docs edit URL. Checks for an existing Drive file first and asks
// the user whether to overwrite; if declined, opens the existing file directly.
async function resolveRcloneFileUrl(raw, win) {
  if (!raw || !pkg.rcloneFileHandler) return null
  const filePath = raw.startsWith('file://') ? new URL(raw).pathname : raw
  if (!path.isAbsolute(filePath)) return null

  const cfgPath = path.join(app.getPath('appData'), 'wrapweb', 'rclone.json')
  let remote, uploadFolder
  try {
    const cfgJson    = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
    remote           = cfgJson.googleDriveRemote
    // Per-app folder name, defaults to the app profile if not explicitly configured.
    const folderName = cfgJson.uploadFolders?.[pkg.profile] ?? pkg.profile
    uploadFolder     = `${remote}:${folderName}`
  } catch { return null }
  if (!remote) return null

  const filename  = path.basename(filePath)
  const dest      = `${uploadFolder}/${filename}`
  const de        = app.getLocale().split('-')[0].toLowerCase() === 'de'

  // Check whether the file already exists on Drive before uploading.
  const localStat = fs.statSync(filePath)
  const files     = await rcloneList(uploadFolder)
  const existing  = files.find(f => f.Name === filename)

  if (existing) {
    // Fast-path: skip upload entirely when local and Drive file are identical.
    // Size is checked first (free); hashes only compared when sizes match.
    if (existing.Size === localStat.size) {
      const lHash = localMd5(filePath)
      const rHash = await remoteMd5(dest)
      if (lHash && rHash && lHash === rHash) {
        registerRcloneSyncBack(win, dest, filePath, de)
        return `${pkg.rcloneEditUrlBase}/${existing.ID}/edit`
      }
    }

    // Show the HTML confirm page and wait for the user's button click via IPC.
    // Clean up both listeners (IPC + window close) whichever fires first.
    const choice = await new Promise(resolve => {
      const done    = (v) => {
        ipcMain.removeListener('rclone-confirm', onIpc)
        win.removeListener('closed', onClose)
        resolve(v)
      }
      const onIpc   = (_, v) => done(v)
      const onClose = ()     => done(1)   // treat window close as "open existing"
      ipcMain.once('rclone-confirm', onIpc)
      win.once('closed', onClose)
      win.webContents.loadURL(buildConfirmPage(filename, existing, localStat, de))
    })

    // User chose not to overwrite — open the existing Drive file directly.
    if (choice !== 0) return `${pkg.rcloneEditUrlBase}/${existing.ID}/edit`

    // Show loading page while the overwrite upload runs.
    if (!win.isDestroyed()) win.webContents.loadURL(buildRcloneLoadingPage())
  }

  // Upload (overwrite or new file). --no-check-dest bypasses rclone's skip logic so
  // the local file is always transferred, even if rclone considers the remote up to date.
  const uploadOk = await new Promise(resolve => {
    const child = spawn('rclone', ['copyto', '--no-check-dest', filePath, dest])
    child.on('close', code => resolve(code === 0))
    child.on('error', () => resolve(false))
  })
  if (!uploadOk) return null

  // Wait for Drive to finish processing the uploaded file before navigating.
  // Without this, Google Docs may open the previous cached version.
  const uploadedHash = localMd5(filePath)
  await waitForDriveSync(dest, uploadedHash, win, de)

  // Register sync-back: on window close, copy the Drive file back to the local path.
  registerRcloneSyncBack(win, dest, filePath, de)

  // Drive keeps the same ID when overwriting; for new files fetch it from the listing.
  if (existing) return `${pkg.rcloneEditUrlBase}/${existing.ID}/edit`

  const updated = await rcloneList(uploadFolder)
  const id = updated.find(f => f.Name === filename)?.ID
  return id ? `${pkg.rcloneEditUrlBase}/${id}/edit` : null
}

module.exports = { resolveRcloneFileUrl, buildRcloneLoadingPage }
