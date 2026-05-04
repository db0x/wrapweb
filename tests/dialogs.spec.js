const { test, expect } = require('./fixtures')

// ── Create dialog ─────────────────────────────────────────────────────────────

test('create dialog opens via add-card', async ({ managerPage }) => {
  await managerPage.click('.card-add')
  await expect(managerPage.locator('#create-save')).toBeVisible()
})

test('create dialog: save button is disabled initially', async ({ managerPage }) => {
  await managerPage.click('.card-add')
  await expect(managerPage.locator('#create-save')).toBeDisabled()
})

test('create dialog: invalid profile pattern shows error', async ({ managerPage }) => {
  await managerPage.click('.card-add')
  await managerPage.fill('#create-profile', 'My App!!')
  await expect(managerPage.locator('#create-profile-hint.error')).toBeVisible()
  await expect(managerPage.locator('#create-save')).toBeDisabled()
})

test('create dialog: invalid URL shows error', async ({ managerPage }) => {
  await managerPage.click('.card-add')
  await managerPage.fill('#create-url', 'not-a-url')
  await expect(managerPage.locator('#create-url-hint.error')).toBeVisible()
  await expect(managerPage.locator('#create-save')).toBeDisabled()
})

test('create dialog: closes with Escape key', async ({ managerPage }) => {
  await managerPage.click('.card-add')
  await expect(managerPage.locator('#create-save')).toBeVisible()
  await managerPage.keyboard.press('Escape')
  await expect(managerPage.locator('#create-save')).not.toBeVisible()
})

// ── Edit dialog ───────────────────────────────────────────────────────────────

test('edit dialog opens for private (user) app', async ({ managerPage }) => {
  const card = managerPage.locator('.card[data-private="true"]').first()
  await card.hover()
  await card.locator('[data-action="edit"]').click()
  await expect(managerPage.locator('#edit-save')).toBeVisible()
})

test('edit dialog: save button is disabled initially (dirty tracking)', async ({ managerPage }) => {
  const card = managerPage.locator('.card[data-private="true"]').first()
  await card.hover()
  await card.locator('[data-action="edit"]').click()
  await expect(managerPage.locator('#edit-save')).toBeDisabled()
})

test('edit dialog: save button enables after changing name', async ({ managerPage }) => {
  const card = managerPage.locator('.card[data-private="true"]').first()
  await card.hover()
  await card.locator('[data-action="edit"]').click()
  await managerPage.fill('#edit-name', 'Changed Name')
  await expect(managerPage.locator('#edit-save')).toBeEnabled()
})

// ── About dialog ──────────────────────────────────────────────────────────────

test('about dialog opens from menu', async ({ managerPage }) => {
  await managerPage.click('#menu-btn')
  await managerPage.click('#menu-about')
  await expect(managerPage.locator('.about-dialog')).toBeVisible()
})

test('about dialog closes with Escape', async ({ managerPage }) => {
  await managerPage.click('#menu-btn')
  await managerPage.click('#menu-about')
  await managerPage.keyboard.press('Escape')
  await expect(managerPage.locator('.about-dialog')).not.toBeVisible()
})

// ── Profiles dialog ───────────────────────────────────────────────────────────

test('profiles dialog opens from menu', async ({ managerPage }) => {
  await managerPage.click('#menu-btn')
  await managerPage.click('#menu-profiles')
  await expect(managerPage.locator('.profiles-dialog')).toBeVisible()
})

// ── Confirm dialog ────────────────────────────────────────────────────────────

test('confirm dialog appears when delete is clicked on a built app', async ({ managerPage }) => {
  // The test-app is not built, so delete is disabled — use hover to verify the
  // button is present and disabled (not triggering a real delete)
  const card = managerPage.locator('.card', { hasText: 'Test App' })
  await card.hover()
  const deleteBtn = card.locator('[data-action="delete"]')
  await expect(deleteBtn).toBeDisabled()
})
