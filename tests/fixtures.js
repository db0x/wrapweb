const { test: base, expect } = require('@playwright/test')
const { _electron: electron } = require('@playwright/test')
const path = require('node:path')
const os   = require('node:os')
const fs   = require('node:fs')

const ROOT = path.join(__dirname, '..')
const CONFIGS_DIR = path.join(ROOT, 'webapps')
const FAKE_ICON_PATH = path.join(ROOT, 'assets', 'wrapweb.svg')

const TEST_CONFIGS = [
  { file: 'build.test-app.json',              content: { profile: 'test-app',           url: 'https://example.com', name: 'Test App'        } },
  { file: 'build.private.test-user-app.json', content: { profile: 'test-user-app',      url: 'https://example.com', name: 'Test User App'   } },
  { file: 'build.test-ms-app.json',           content: { profile: 'test-ms-app',        url: 'https://example.com', name: 'Test MS App',    category: 'microsoft' } },
  { file: 'build.test-google-app.json',       content: { profile: 'test-google-app',    url: 'https://example.com', name: 'Test Google App', category: 'google'   } },
  { file: 'build.private.test-mail-app.json', content: { profile: 'test-mail-app',      url: 'https://mail.example.com', name: 'Test Mail App', mimeTypes: ['x-scheme-handler/mailto'] } },
]

async function launchApp(extraEnv = {}) {
  for (const { file, content } of TEST_CONFIGS)
    fs.writeFileSync(path.join(CONFIGS_DIR, file), JSON.stringify(content, null, 4))

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wrapweb-test-'))
  const app = await electron.launch({
    args: [ROOT, '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', `--user-data-dir=${userDataDir}`],
    env: { ...process.env, WRAPWEB_TEST: '1', WRAPWEB_LANG: 'en', ELECTRON_RUN_AS_NODE: undefined, ...extraEnv },
  })
  return { app, userDataDir }
}

async function closeApp(app, userDataDir) {
  await app.close()
  for (const { file } of TEST_CONFIGS)
    fs.rmSync(path.join(CONFIGS_DIR, file), { force: true })
  fs.rmSync(userDataDir, { recursive: true, force: true })
}

const test = base.extend({
  electronApp: [async ({}, use) => {
    const { app, userDataDir } = await launchApp()
    await use(app)
    await closeApp(app, userDataDir)
  }, { scope: 'test' }],

  electronAppWithFilterIcons: [async ({}, use) => {
    const { app, userDataDir } = await launchApp({ WRAPWEB_TEST_FILTER_ICONS: FAKE_ICON_PATH })
    await use(app)
    await closeApp(app, userDataDir)
  }, { scope: 'test' }],

  // Manager window, ready after IPC data is loaded
  managerPage: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow()
    await page.waitForSelector('.card-add', { timeout: 30_000 })
    await use(page)
  },

  managerPageWithFilterIcons: async ({ electronAppWithFilterIcons }, use) => {
    const page = await electronAppWithFilterIcons.firstWindow()
    await page.waitForSelector('.card-add', { timeout: 30_000 })
    await use(page)
  },
})

module.exports = { test, expect, FAKE_ICON_PATH }
