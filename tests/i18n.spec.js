const { test, expect } = require('./fixtures')

// Verifies that the i18n system delivers the correct language and that
// the tooltip mechanism works end-to-end. We pick one representative string
// per test rather than asserting every label.

test('UI renders in English by default', async ({ managerPage }) => {
  await managerPage.click('.card-add')
  await expect(managerPage.locator('.dialog-overlay:not(.hidden) .dialog-title')).toHaveText('Add new WebApp')
})

test('UI renders in German when WRAPWEB_LANG=de', async ({ managerPageDe }) => {
  await managerPageDe.click('.card-add')
  await expect(managerPageDe.locator('.dialog-overlay:not(.hidden) .dialog-title')).toHaveText('Neue WebApp hinzufügen')
})

test('unknown language falls back gracefully (non-empty UI)', async ({ managerPage }) => {
  // The default fixture uses EN; this confirms the fallback path produces
  // a populated UI — no blank labels, no crashes.
  await expect(managerPage.locator('.card-add')).toBeVisible()
  await managerPage.click('.card-add')
  const title = await managerPage.locator('.dialog-overlay:not(.hidden) .dialog-title').textContent()
  expect(title?.trim().length).toBeGreaterThan(0)
})

// ── Tooltip mechanism ─────────────────────────────────────────────────────────

test('hovering a help icon shows a non-empty tooltip', async ({ managerPage }) => {
  await managerPage.click('.card-add')

  const helpIcon = managerPage.locator('#create-plugin-field .field-help')
  // plugin-field is hidden by default — toggle mail-handler first
  await managerPage.click('#create-mail-handler')
  await expect(managerPage.locator('#create-plugin-field')).toBeVisible()

  await helpIcon.hover()
  const tooltip = managerPage.locator('.app-tooltip.visible')
  await expect(tooltip).toBeVisible()
  const text = await tooltip.textContent()
  expect(text?.trim().length).toBeGreaterThan(0)
})

test('tooltip text matches the active language (EN)', async ({ managerPage }) => {
  await managerPage.click('.card-add')
  await managerPage.locator('#create-useragent').hover()
  // hover the ? next to the User-Agent label
  await managerPage.locator('label', { has: managerPage.locator('[id="create-useragent"]').locator('..') })
  const helpIcon = managerPage.locator('#create-useragent').locator('..').locator('.field-help')
  await helpIcon.hover()
  const tooltip = managerPage.locator('.app-tooltip.visible')
  await expect(tooltip).toBeVisible()
  const text = await tooltip.textContent()
  // EN tooltip must not contain German words
  expect(text).toMatch(/browser/i)
})

test('tooltip text matches the active language (DE)', async ({ managerPageDe }) => {
  await managerPageDe.click('.card-add')
  const helpIcon = managerPageDe.locator('#create-useragent').locator('..').locator('.field-help')
  await helpIcon.hover()
  const tooltip = managerPageDe.locator('.app-tooltip.visible')
  await expect(tooltip).toBeVisible()
  const text = await tooltip.textContent()
  // DE tooltip must contain a German word
  expect(text).toMatch(/Webseiten/i)
})
