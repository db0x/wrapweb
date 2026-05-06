const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execSync } = require('node:child_process')

const PROJECT_ROOT = path.resolve(__dirname, '..')

function toDisplayName(profile) {
  return profile.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function installIcon() {
  const src = path.join(PROJECT_ROOT, 'assets', 'wrapweb.svg')
  if (!fs.existsSync(src)) return

  const iconDir = path.join(os.homedir(), '.local', 'share', 'icons', 'hicolor', 'scalable', 'apps')
  const dest = path.join(iconDir, 'wrapweb.svg')

  fs.mkdirSync(iconDir, { recursive: true })
  fs.copyFileSync(src, dest)
  console.log(`  Icon installed: ${dest}`)

  try {
    const hicolorDir = path.join(os.homedir(), '.local', 'share', 'icons', 'hicolor')
    execSync(`gtk-update-icon-cache -f -t "${hicolorDir}"`, { stdio: 'ignore' })
  } catch {
    // non-fatal
  }
}

function escapeDesktop(s) {
  return String(s).replace(/\\/g, '\\\\')
}

function resolveIconToHicolor(iconName, desktopName) {
  if (!iconName || iconName === 'wrapweb') return iconName

  const hicolorDir = path.join(os.homedir(), '.local', 'share', 'icons', 'hicolor', 'scalable', 'apps')
  const destName = desktopName  // e.g. 'wrapweb-teams'
  const destSvg  = path.join(hicolorDir, `${destName}.svg`)
  const destPng  = path.join(hicolorDir, `${destName}.png`)

  // Already installed under this name
  if (fs.existsSync(destSvg) || fs.existsSync(destPng)) return destName

  // Search icon themes for a matching file (apps/ subdir first, then root of icons dirs)
  const searchDirs = [
    path.join(os.homedir(), '.local', 'share', 'icons'),
    '/usr/local/share/icons',
    '/usr/share/icons',
  ]
  const exts = ['svg', 'png']
  const candidates = []
  for (const base of searchDirs) {
    for (const ext of exts) {
      // Standard theme path: <theme>/<size>/apps/<name>.<ext>
      candidates.push({ cmd: `find "${base}" -name "${iconName}.${ext}" -path "*/apps/*" 2>/dev/null | head -1` })
      // Non-standard: directly in icons root, e.g. ~/.local/share/icons/<name>.<ext>
      const rootFile = path.join(base, `${iconName}.${ext}`)
      if (fs.existsSync(rootFile)) candidates.unshift({ file: rootFile, ext })
    }
  }
  for (const c of candidates) {
    try {
      const found = c.file ?? execSync(c.cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
      if (!found) continue
      const ext = c.ext ?? (found.endsWith('.svg') ? 'svg' : 'png')
      fs.mkdirSync(hicolorDir, { recursive: true })
      const dest = ext === 'svg' ? destSvg : destPng
      fs.copyFileSync(found, dest)
      console.log(`  Icon copied to hicolor: ${dest}`)
      try {
        const hicolor = path.join(os.homedir(), '.local', 'share', 'icons', 'hicolor')
        execSync(`gtk-update-icon-cache -f -t "${hicolor}"`, { stdio: 'ignore' })
      } catch { /* non-fatal */ }
      return destName
    } catch { /* non-fatal */ }
  }
  return iconName  // fallback: use original name unchanged
}

function installDesktop(app) {
  const desktopName = `wrapweb-${app.profile}`
  const desktopsDir = path.join(os.homedir(), '.local', 'share', 'applications')
  const desktopFile = path.join(desktopsDir, `${desktopName}.desktop`)

  const appImagePath = path.resolve('dist', `wrapweb-${app.profile}`)
  const displayName = escapeDesktop(app.name || toDisplayName(app.profile))
  const icon = resolveIconToHicolor(app.icon || 'wrapweb', desktopName)
  const mimeTypes = app.mimeTypes?.length ? app.mimeTypes.join(';') + ';' : null

  const lines = [
    '[Desktop Entry]',
    'Version=1.0',
    `Name=${displayName}`,
    `Comment=${displayName}`,
    `Exec=${appImagePath} --no-sandbox %u`,
    'Terminal=false',
    'Type=Application',
    `Icon=${icon}`,
    `StartupWMClass=${desktopName}`,
  ]
  if (mimeTypes) lines.push(`MimeType=${mimeTypes}`)
  lines.push('')

  fs.mkdirSync(desktopsDir, { recursive: true })
  fs.writeFileSync(desktopFile, lines.join('\n'), 'utf8')
  console.log(`  Installed: ${desktopFile}`)

  try {
    execSync(`update-desktop-database "${desktopsDir}"`, { stdio: 'ignore' })
  } catch {
    // non-fatal
  }
}

module.exports = { toDisplayName, installDesktop, installIcon }
