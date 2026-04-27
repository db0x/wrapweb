#!/usr/bin/env node
const { build } = require('electron-builder')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execSync } = require('node:child_process')

const APP_ID_BASE = 'de.db0x.wrapweb'

function expandConfig(app) {
  const appId = `${APP_ID_BASE}.${app.profile}`
  const productName = `wrapweb.${app.profile}`
  return {
    appId,
    productName,
    artifactName: productName,
    linux: {
      target: ['AppImage'],
      executableArgs: ['--no-sandbox'],
    },
    extraMetadata: {
      name: `wrapweb-${app.profile}`,
      appId,
      profile: app.profile,
      url: app.url,
      ...(app.userAgent           && { userAgent: app.userAgent }),
      ...(app.geometry            && { geometry:  app.geometry  }),
      ...(app.internalDomains     && { internalDomains: app.internalDomains }),
      ...(app.crossOriginIsolation && { crossOriginIsolation: true }),
    },
  }
}

const configs = fs
  .readdirSync('.')
  .filter(f => /^build\..+\.json$/.test(f))
  .sort()

function toDisplayName(profile) {
  return profile.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function installDesktop(app) {
  const desktopName = `wrapweb-${app.profile}`
  const desktopsDir = path.join(os.homedir(), '.local', 'share', 'applications')
  const desktopFile = path.join(desktopsDir, `${desktopName}.desktop`)

  if (fs.existsSync(desktopFile)) {
    console.log(`  Desktop entry already exists, skipping: ${desktopFile}`)
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
    // non-fatal, desktop will still appear after next login
  }
}

async function buildOne(configFile) {
  const app = JSON.parse(fs.readFileSync(configFile, 'utf8'))
  const label = configFile.replace(/^build\.(.+)\.json$/, '$1')
  console.log(`\n=== Building ${label} ===`)
  await build({ config: expandConfig(app), projectDir: process.cwd() })
  installDesktop(app)
}

async function main() {
  const profile = process.argv[2]

  if (profile) {
    const configFile = `build.${profile}.json`
    if (!fs.existsSync(configFile)) {
      const available = configs.map(f => f.replace(/^build\.(.+)\.json$/, '$1')).join(', ')
      console.error(`Config not found: ${configFile}\nAvailable: ${available}`)
      process.exit(1)
    }
    await buildOne(configFile)
  } else {
    if (configs.length === 0) {
      console.error('No build.*.json configs found.')
      process.exit(1)
    }
    for (const configFile of configs) {
      await buildOne(configFile)
    }
  }
}

main().catch(err => { console.error(err); process.exit(1) })
