const { base, expect } = require('./fixtures')
const { _electron: electron } = require('@playwright/test')
const path = require('node:path')
const os   = require('node:os')
const fs   = require('node:fs')

const ROOT        = path.join(__dirname, '..')
const CONFIGS_DIR = path.join(ROOT, 'webapps')
const DIST_DIR    = path.join(ROOT, 'dist')

const OUTDATED_PROFILE = 'test-rebuild-outdated'
const CURRENT_PROFILE  = 'test-rebuild-current'

function writeConfig(profile) {
  fs.writeFileSync(
    path.join(CONFIGS_DIR, `build.${profile}.json`),
    JSON.stringify({ profile, url: 'https://example.com', name: profile }),
  )
}

function fakeBuilt(profile, version) {
  fs.mkdirSync(DIST_DIR, { recursive: true })
  fs.writeFileSync(path.join(DIST_DIR, `wrapweb-${profile}`), '')
  if (version != null)
    fs.writeFileSync(path.join(DIST_DIR, `wrapweb-${profile}.version`), version)
}

function cleanup(...profiles) {
  for (const p of profiles) {
    fs.rmSync(path.join(CONFIGS_DIR, `build.${p}.json`),      { force: true })
    fs.rmSync(path.join(DIST_DIR,    `wrapweb-${p}`),         { force: true })
    fs.rmSync(path.join(DIST_DIR,    `wrapweb-${p}.version`), { force: true })
  }
}

async function launchManager() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wrapweb-test-'))
  const app = await electron.launch({
    args: [ROOT, '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', `--user-data-dir=${userDataDir}`],
    env: { ...process.env, WRAPWEB_TEST: '1', WRAPWEB_LANG: 'en', ELECTRON_RUN_AS_NODE: undefined },
  })
  const page = await app.firstWindow()
  await page.waitForSelector('.card-add', { timeout: 30_000 })
  return { app, page, userDataDir }
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const test = base.extend({
  pageOutdated: async ({}, use) => {
    writeConfig(OUTDATED_PROFILE)
    fakeBuilt(OUTDATED_PROFILE, '0.0.0')
    const { app, page, userDataDir } = await launchManager()
    await use(page)
    await app.close()
    cleanup(OUTDATED_PROFILE)
    fs.rmSync(userDataDir, { recursive: true, force: true })
  },

  pageCurrent: async ({}, use) => {
    writeConfig(CURRENT_PROFILE)
    fakeBuilt(CURRENT_PROFILE, '99.99.99')
    const { app, page, userDataDir } = await launchManager()
    await use(page)
    await app.close()
    cleanup(CURRENT_PROFILE)
    fs.rmSync(userDataDir, { recursive: true, force: true })
  },
})

// ── Tests ─────────────────────────────────────────────────────────────────────

test('rebuild notice appears when an app has an outdated version', async ({ pageOutdated }) => {
  await expect(pageOutdated.locator('#rebuild-notice-ok')).toBeVisible()
})

test('rebuild notice lists the outdated app', async ({ pageOutdated }) => {
  await expect(pageOutdated.locator('#rebuild-notice-list')).toContainText(OUTDATED_PROFILE)
})

test('rebuild notice "Got it" button dismisses the dialog', async ({ pageOutdated }) => {
  await pageOutdated.click('#rebuild-notice-ok')
  await expect(pageOutdated.locator('#rebuild-notice-ok')).not.toBeVisible()
})

test('outdated badge is shown on the card', async ({ pageOutdated }) => {
  await pageOutdated.click('#rebuild-notice-ok')
  const card = pageOutdated.locator(`.card[data-profile="${OUTDATED_PROFILE}"]`)
  await expect(card.locator('.badge.outdated')).toBeVisible()
})

test('outdated badge is absent when app version is current', async ({ pageCurrent }) => {
  const card = pageCurrent.locator(`.card[data-profile="${CURRENT_PROFILE}"]`)
  await expect(card.locator('.badge.outdated')).not.toBeVisible()
})

test('current-version app is not listed in rebuild notice', async ({ pageCurrent }) => {
  // Dialog may or may not appear (other real AppImages could be outdated),
  // but the current-version profile must never appear in the list.
  const list = pageCurrent.locator('#rebuild-notice-list')
  const isVisible = await pageCurrent.locator('#rebuild-notice-ok').isVisible()
  if (isVisible) {
    await expect(list).not.toContainText(CURRENT_PROFILE)
  }
})

test('"Rebuild all" button is visible in rebuild notice', async ({ pageOutdated }) => {
  await expect(pageOutdated.locator('#rebuild-notice-rebuild-all')).toBeVisible()
})

test('rebuild notice reappears on next launch while app is still outdated', async ({}) => {
  writeConfig(OUTDATED_PROFILE)
  fakeBuilt(OUTDATED_PROFILE, '0.0.0')

  const { app: app1, page: page1, userDataDir: dir1 } = await launchManager()
  await expect(page1.locator('#rebuild-notice-ok')).toBeVisible()
  await page1.click('#rebuild-notice-ok')
  await app1.close()
  fs.rmSync(dir1, { recursive: true, force: true })

  const { app: app2, page: page2, userDataDir: dir2 } = await launchManager()
  await expect(page2.locator('#rebuild-notice-ok')).toBeVisible()
  await app2.close()
  cleanup(OUTDATED_PROFILE)
  fs.rmSync(dir2, { recursive: true, force: true })
})
