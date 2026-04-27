#!/usr/bin/env node
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execSync } = require('node:child_process')

function toDisplayName(profile) {
  return profile.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
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
  const displayName = app.name || toDisplayName(app.profile)
  const icon = app.icon || app.profile

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

const configs = fs
  .readdirSync('.')
  .filter(f => /^build\..+\.json$/.test(f))
  .sort()

const profile = process.argv[2]

if (profile) {
  const configFile = `build.${profile}.json`
  if (!fs.existsSync(configFile)) {
    const available = configs.map(f => f.replace(/^build\.(.+)\.json$/, '$1')).join(', ')
    console.error(`Config not found: ${configFile}\nAvailable: ${available}`)
    process.exit(1)
  }
  installDesktop(JSON.parse(fs.readFileSync(configFile, 'utf8')))
} else {
  if (configs.length === 0) {
    console.error('No build.*.json configs found.')
    process.exit(1)
  }
  for (const configFile of configs) {
    const label = configFile.replace(/^build\.(.+)\.json$/, '$1')
    console.log(`\n=== Installing ${label} ===`)
    installDesktop(JSON.parse(fs.readFileSync(configFile, 'utf8')))
  }
}
