const { defineConfig } = require('@playwright/test')

module.exports = defineConfig({
  testDir:    './tests',
  timeout:     60_000,
  expect:    { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  retries:    process.env.CI ? 1 : 0,
  workers:    1,
  reporter:   process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : [['list'],   ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results/',
})
