const { test, expect } = require('./fixtures')

// ── Badge rendering ───────────────────────────────────────────────────────────

test('mail handler badge is shown on card with mimeTypes', async ({ managerPage }) => {
  const card = managerPage.locator('.card', { hasText: 'Test Mail App' })
  await expect(card.locator('[data-role="mail-handler-badge"]')).toBeVisible()
})

test('mail handler badge is absent on card without mimeTypes', async ({ managerPage }) => {
  const card = managerPage.locator('.card', { hasText: 'Test User App' })
  await expect(card.locator('[data-role="mail-handler-badge"]')).not.toBeAttached()
})

// ── Edit dialog state ─────────────────────────────────────────────────────────

test('edit dialog: mail-handler toggle is active for mail handler app', async ({ managerPage }) => {
  const card = managerPage.locator('.card', { hasText: 'Test Mail App' })
  await card.hover()
  await card.locator('[data-action="edit"]').click()
  await expect(managerPage.locator('#edit-mail-handler')).toHaveClass(/active/)
  await managerPage.keyboard.press('Escape')
})

test('edit dialog: mail-handler toggle is inactive for non-mail-handler app', async ({ managerPage }) => {
  const card = managerPage.locator('.card', { hasText: 'Test User App' })
  await card.hover()
  await card.locator('[data-action="edit"]').click()
  await expect(managerPage.locator('#edit-mail-handler')).not.toHaveClass(/active/)
  await managerPage.keyboard.press('Escape')
})

test('edit dialog: plugin-field is visible when mail-handler toggle is active', async ({ managerPage }) => {
  const card = managerPage.locator('.card', { hasText: 'Test Mail App' })
  await card.hover()
  await card.locator('[data-action="edit"]').click()
  await expect(managerPage.locator('#edit-plugin-field')).toBeVisible()
  await managerPage.keyboard.press('Escape')
})

test('edit dialog: plugin-field is hidden when mail-handler toggle is inactive', async ({ managerPage }) => {
  const card = managerPage.locator('.card', { hasText: 'Test User App' })
  await card.hover()
  await card.locator('[data-action="edit"]').click()
  await expect(managerPage.locator('#edit-plugin-field')).not.toBeVisible()
  await managerPage.keyboard.press('Escape')
})

test('edit dialog: clicking mail-handler toggle shows plugin-field', async ({ managerPage }) => {
  const card = managerPage.locator('.card', { hasText: 'Test User App' })
  await card.hover()
  await card.locator('[data-action="edit"]').click()
  await expect(managerPage.locator('#edit-plugin-field')).not.toBeVisible()
  await managerPage.click('#edit-mail-handler')
  await expect(managerPage.locator('#edit-plugin-field')).toBeVisible()
  await managerPage.keyboard.press('Escape')
})

test('edit dialog: clicking mail-handler toggle again hides plugin-field', async ({ managerPage }) => {
  const card = managerPage.locator('.card', { hasText: 'Test Mail App' })
  await card.hover()
  await card.locator('[data-action="edit"]').click()
  await expect(managerPage.locator('#edit-plugin-field')).toBeVisible()
  await managerPage.click('#edit-mail-handler')
  await expect(managerPage.locator('#edit-plugin-field')).not.toBeVisible()
  await managerPage.keyboard.press('Escape')
})

// ── Create dialog state ───────────────────────────────────────────────────────

test('create dialog: plugin-field is hidden by default', async ({ managerPage }) => {
  await managerPage.click('.card-add')
  await expect(managerPage.locator('#create-plugin-field')).not.toBeVisible()
  await managerPage.keyboard.press('Escape')
})

test('create dialog: plugin-field becomes visible when mail-handler toggle is clicked', async ({ managerPage }) => {
  await managerPage.click('.card-add')
  await managerPage.click('#create-mail-handler')
  await expect(managerPage.locator('#create-plugin-field')).toBeVisible()
  await managerPage.keyboard.press('Escape')
})

test('create dialog: plugin-field hides again when mail-handler toggle is clicked off', async ({ managerPage }) => {
  await managerPage.click('.card-add')
  await managerPage.click('#create-mail-handler')
  await expect(managerPage.locator('#create-plugin-field')).toBeVisible()
  await managerPage.click('#create-mail-handler')
  await expect(managerPage.locator('#create-plugin-field')).not.toBeVisible()
  await managerPage.keyboard.press('Escape')
})

// ── Badge update after edit ───────────────────────────────────────────────────

test('mail handler badge is removed after toggling handler off and saving', async ({ managerPage }) => {
  const card = managerPage.locator('.card', { hasText: 'Test Mail App' })
  await expect(card.locator('[data-role="mail-handler-badge"]')).toBeAttached()

  await card.hover()
  await card.locator('[data-action="edit"]').click()
  await managerPage.click('#edit-mail-handler')
  await expect(managerPage.locator('#edit-save')).toBeEnabled()
  await managerPage.click('#edit-save')
  await expect(managerPage.locator('#edit-save')).not.toBeVisible()

  await expect(card.locator('[data-role="mail-handler-badge"]')).not.toBeAttached()
})

test('mail handler badge appears after toggling handler on and saving', async ({ managerPage }) => {
  const card = managerPage.locator('.card', { hasText: 'Test User App' })
  await expect(card.locator('[data-role="mail-handler-badge"]')).not.toBeAttached()

  await card.hover()
  await card.locator('[data-action="edit"]').click()
  await managerPage.click('#edit-mail-handler')
  await expect(managerPage.locator('#edit-save')).toBeEnabled()
  await managerPage.click('#edit-save')
  await expect(managerPage.locator('#edit-save')).not.toBeVisible()

  await expect(card.locator('[data-role="mail-handler-badge"]')).toBeAttached()
})
