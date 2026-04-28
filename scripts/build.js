#!/usr/bin/env node
const { build } = require('electron-builder')
const fs = require('node:fs')
const { installDesktop, installIcon } = require('./lib')

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

async function buildOne(configFile) {
  const app = JSON.parse(fs.readFileSync(configFile, 'utf8'))
  const label = configFile.replace(/^build\.(.+)\.json$/, '$1')
  console.log(`\n=== Building ${label} ===`)
  await build({ config: expandConfig(app), projectDir: process.cwd() })
  installIcon()
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
