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

function installDesktop(app) {
  const desktopName = `wrapweb-${app.profile}`
  const desktopsDir = path.join(os.homedir(), '.local', 'share', 'applications')
  const desktopFile = path.join(desktopsDir, `${desktopName}.desktop`)

  if (fs.existsSync(desktopFile)) {
    console.log(`  Already installed, skipping: ${desktopFile}`)
    return
  }

  const appImagePath = path.resolve('dist', `wrapweb.${app.profile}`)
  const displayName = escapeDesktop(app.name || toDisplayName(app.profile))
  const icon = app.icon || 'wrapweb'

  const content = [
    '[Desktop Entry]',
    'Version=1.0',
    `Name=${displayName}`,
    `Comment=${displayName}`,
    `Exec=${appImagePath} --no-sandbox`,
    'Terminal=false',
    'Type=Application',
    `Icon=${icon}`,
    `StartupWMClass=${desktopName}`,
    '',
  ].join('\n')

  fs.mkdirSync(desktopsDir, { recursive: true })
  fs.writeFileSync(desktopFile, content, 'utf8')
  console.log(`  Installed: ${desktopFile}`)

  try {
    execSync(`update-desktop-database "${desktopsDir}"`, { stdio: 'ignore' })
  } catch {
    // non-fatal
  }
}

module.exports = { toDisplayName, installDesktop, installIcon }
