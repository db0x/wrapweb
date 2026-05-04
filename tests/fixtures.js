const { test: base, expect } = require('@playwright/test')
const { _electron: electron } = require('@playwright/test')
const path = require('node:path')
const os   = require('node:os')
const fs   = require('node:fs')

const ROOT = path.join(__dirname, '..')

const TEST_CONFIGS = [
  { file: 'build.test-app.json',              content: { profile: 'test-app',      url: 'https://example.com', name: 'Test App'     } },
  { file: 'build.private.test-user-app.json', content: { profile: 'test-user-app', url: 'https://example.com', name: 'Test User App' } },
]

const test = base.extend({
  electronApp: [async ({}, use) => {
    for (const { file, content } of TEST_CONFIGS)
      fs.writeFileSync(path.join(ROOT, file), JSON.stringify(content, null, 4))

    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wrapweb-test-'))
    const app = await electron.launch({
      args: [
        ROOT,
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-features=ShmImageTransportFactory',
        `--user-data-dir=${userDataDir}`,
      ],
      env: { ...process.env, WRAPWEB_TEST: '1' },
    })
    await use(app)
    await app.close()

    for (const { file } of TEST_CONFIGS)
      fs.rmSync(path.join(ROOT, file), { force: true })
    fs.rmSync(userDataDir, { recursive: true, force: true })
  }, { scope: 'test' }],

  // Manager window, ready after IPC data is loaded
  managerPage: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow()
    await page.waitForSelector('.card-add', { timeout: 30_000 })
    await use(page)
  },
})

module.exports = { test, expect }
