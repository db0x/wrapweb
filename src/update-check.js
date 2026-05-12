const fs   = require('node:fs')
const path = require('node:path')
const { app } = require('electron')

const REMOTE_URL = 'https://raw.githubusercontent.com/db0x/wrapweb/main/package.json'
const CACHE_TTL  = 24 * 60 * 60 * 1000

function semverLt(a, b) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return true
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return false
  }
  return false
}

async function checkForUpdate(currentVersion) {
  if (process.env.WRAPWEB_TEST) return null

  const cacheFile = path.join(app.getPath('appData'), 'wrapweb', 'update-check.json')

  try {
    const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
    if (Date.now() - cache.checkedAt < CACHE_TTL) {
      return cache.latestVersion && semverLt(currentVersion, cache.latestVersion)
        ? cache.latestVersion : null
    }
  } catch {}

  try {
    const res = await fetch(REMOTE_URL, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const latestVersion = (await res.json()).version ?? null
    try {
      fs.mkdirSync(path.dirname(cacheFile), { recursive: true })
      fs.writeFileSync(cacheFile, JSON.stringify({ checkedAt: Date.now(), latestVersion }), 'utf8')
    } catch {}
    return latestVersion && semverLt(currentVersion, latestVersion) ? latestVersion : null
  } catch {}

  return null
}

module.exports = { checkForUpdate }
