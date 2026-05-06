const { test, expect } = require('./fixtures')

// --- Filter button visibility and layout ---

test('microsoft filter button is always visible even without icons', async ({ managerPage }) => {
  await managerPage.click('#menu-btn')
  await expect(managerPage.locator('[data-filter="microsoft"]')).toBeVisible()
})

test('google filter button is always visible even without icons', async ({ managerPage }) => {
  await managerPage.click('#menu-btn')
  await expect(managerPage.locator('[data-filter="google"]')).toBeVisible()
})

test('microsoft filter button always shows text label', async ({ managerPage }) => {
  await managerPage.click('#menu-btn')
  await expect(managerPage.locator('[data-filter="microsoft"] span')).toHaveText('Microsoft Apps')
})

test('google filter button always shows text label', async ({ managerPage }) => {
  await managerPage.click('#menu-btn')
  await expect(managerPage.locator('[data-filter="google"] span')).toHaveText('Google Apps')
})

test('microsoft filter button shows text label with icon when icon is available', async ({ managerPageWithFilterIcons }) => {
  await managerPageWithFilterIcons.click('#menu-btn')
  const btn = managerPageWithFilterIcons.locator('[data-filter="microsoft"]')
  await expect(btn.locator('img')).toBeVisible()
  await expect(btn.locator('span')).toHaveText('Microsoft Apps')
})

test('google filter button shows text label with icon when icon is available', async ({ managerPageWithFilterIcons }) => {
  await managerPageWithFilterIcons.click('#menu-btn')
  const btn = managerPageWithFilterIcons.locator('[data-filter="google"]')
  await expect(btn.locator('img')).toBeVisible()
  await expect(btn.locator('span')).toHaveText('Google Apps')
})

// --- Category filtering ---

test('microsoft filter shows only microsoft-category cards', async ({ managerPage }) => {
  await managerPage.click('#menu-btn')
  await managerPage.click('[data-filter="microsoft"]')

  await expect(managerPage.locator('.card[data-category="microsoft"]').first()).toBeVisible()
  await expect(managerPage.locator('.card[data-category="google"]').first()).not.toBeVisible()
  await expect(managerPage.locator('.card[data-category=""]').first()).not.toBeVisible()
})

test('google filter shows only google-category cards', async ({ managerPage }) => {
  await managerPage.click('#menu-btn')
  await managerPage.click('[data-filter="google"]')

  await expect(managerPage.locator('.card[data-category="google"]').first()).toBeVisible()
  await expect(managerPage.locator('.card[data-category="microsoft"]').first()).not.toBeVisible()
  await expect(managerPage.locator('.card[data-category=""]').first()).not.toBeVisible()
})

test('microsoft filter hides the add-card', async ({ managerPage }) => {
  await managerPage.click('#menu-btn')
  await managerPage.click('[data-filter="microsoft"]')
  await expect(managerPage.locator('.card-add')).not.toBeVisible()
})

test('google filter hides the add-card', async ({ managerPage }) => {
  await managerPage.click('#menu-btn')
  await managerPage.click('[data-filter="google"]')
  await expect(managerPage.locator('.card-add')).not.toBeVisible()
})

test('"all" filter restores all cards after category filter', async ({ managerPage }) => {
  await managerPage.click('#menu-btn')
  await managerPage.click('[data-filter="microsoft"]')
  await managerPage.click('#menu-btn')
  await managerPage.click('[data-filter="all"]')

  await expect(managerPage.locator('.card[data-category="microsoft"]').first()).toBeVisible()
  await expect(managerPage.locator('.card[data-category="google"]').first()).toBeVisible()
  await expect(managerPage.locator('.card-add')).toBeVisible()
})
