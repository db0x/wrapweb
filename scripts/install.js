#!/usr/bin/env node
const fs = require('node:fs')
const { installDesktop, installIcon } = require('./lib')

const configs = fs
  .readdirSync('.')
  .filter(f => /^build\..+\.json$/.test(f))
  .sort()

const profile = process.argv[2]

installIcon()

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
