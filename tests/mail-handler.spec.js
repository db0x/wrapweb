const { test, expect } = require('./fixtures')

// ── Badge rendering ───────────────────────────────────────────────────────────

// Setup:    Manager open; test-mail-app config has mimeTypes: ['x-scheme-handler/mailto'].
// Action:   (none — reads card state)
// Expected: The mail-handler badge is present on the card for "Test Mail App".
test('mail handler badge is shown on card with mimeTypes', async ({ managerPage }) => {
  const card = managerPage.locator('.card', { hasText: 'Test Mail App' })
  await expect(card.locator('[data-role="mail-handler-badge"]')).toBeVisible()
})

// Setup:    Manager open; test-user-app config has no mimeTypes field.
// Action:   (none — reads card state)
// Expected: No mail-handler badge is attached to the card for "Test User App".
test('mail handler badge is absent on card without mimeTypes', async ({ managerPage }) => {
  const card = managerPage.locator('.card', { hasText: 'Test User App' })
  await expect(card.locator('[data-role="mail-handler-badge"]')).not.toBeAttached()
})

// ── Edit dialog state ─────────────────────────────────────────────────────────

// Setup:    Edit dialog opened for "Test Mail App" (has mimeTypes set).
// Action:   (none — reads toggle state)
// Expected: The mail-handler toggle is active because the app has x-scheme-handler/mailto.
test('edit dialog: mail-handler toggle is active for mail handler app', async ({ managerPage }) => {
  const card = managerPage.locator('.card', { hasText: 'Test Mail App' })
  await card.hover()
  await card.locator('[data-action="edit"]').click()
  await expect(managerPage.locator('#edit-mail-handler')).toHaveClass(/active/)
  await managerPage.keyboard.press('Escape')
})

// Setup:    Edit dialog opened for "Test User App" (no mimeTypes field).
// Action:   (none — reads toggle state)
// Expected: The mail-handler toggle is inactive because the app has no MIME type configured.
test('edit dialog: mail-handler toggle is inactive for non-mail-handler app', async ({ managerPage }) => {
  const card = managerPage.locator('.card', { hasText: 'Test User App' })
  await card.hover()
  await card.locator('[data-action="edit"]').click()
  await expect(managerPage.locator('#edit-mail-handler')).not.toHaveClass(/active/)
  await managerPage.keyboard.press('Escape')
})

// Setup:    Edit dialog opened for "Test Mail App"; mail-handler toggle is active.
// Action:   (none — reads plugin field visibility)
// Expected: The plugin select field is visible because mail-handler is active.
test('edit dialog: plugin-field is visible when mail-handler toggle is active', async ({ managerPage }) => {
  const card = managerPage.locator('.card', { hasText: 'Test Mail App' })
  await card.hover()
  await card.locator('[data-action="edit"]').click()
  await expect(managerPage.locator('#edit-plugin-field')).toBeVisible()
  await managerPage.keyboard.press('Escape')
})

// Setup:    Edit dialog opened for "Test User App"; mail-handler toggle is inactive.
// Action:   (none — reads plugin field visibility)
// Expected: The plugin select field is hidden because mail-handler is inactive.
test('edit dialog: plugin-field is hidden when mail-handler toggle is inactive', async ({ managerPage }) => {
  const card = managerPage.locator('.card', { hasText: 'Test User App' })
  await card.hover()
  await card.locator('[data-action="edit"]').click()
  await expect(managerPage.locator('#edit-plugin-field')).not.toBeVisible()
  await managerPage.keyboard.press('Escape')
})

// Setup:    Edit dialog opened for "Test User App"; mail-handler toggle is inactive,
//           plugin field is hidden.
// Action:   Click the mail-handler toggle to activate it.
// Expected: The plugin select field becomes visible.
test('edit dialog: clicking mail-handler toggle shows plugin-field', async ({ managerPage }) => {
  const card = managerPage.locator('.card', { hasText: 'Test User App' })
  await card.hover()
  await card.locator('[data-action="edit"]').click()
  await expect(managerPage.locator('#edit-plugin-field')).not.toBeVisible()
  await managerPage.click('#edit-mail-handler')
  await expect(managerPage.locator('#edit-plugin-field')).toBeVisible()
  await managerPage.keyboard.press('Escape')
})

// Setup:    Edit dialog opened for "Test Mail App"; mail-handler toggle is active,
//           plugin field is visible.
// Action:   Click the mail-handler toggle to deactivate it.
// Expected: The plugin select field is hidden again.
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

// Setup:    Create dialog just opened.
// Action:   (none — reads plugin field visibility)
// Expected: Plugin field is hidden by default (mail-handler toggle is off).
test('create dialog: plugin-field is hidden by default', async ({ managerPage }) => {
  await managerPage.click('.card-add')
  await expect(managerPage.locator('#create-plugin-field')).not.toBeVisible()
  await managerPage.keyboard.press('Escape')
})

// Setup:    Create dialog open; mail-handler toggle is inactive.
// Action:   Click the mail-handler toggle.
// Expected: The plugin select field becomes visible.
test('create dialog: plugin-field becomes visible when mail-handler toggle is clicked', async ({ managerPage }) => {
  await managerPage.click('.card-add')
  await managerPage.click('#create-mail-handler')
  await expect(managerPage.locator('#create-plugin-field')).toBeVisible()
  await managerPage.keyboard.press('Escape')
})

// Setup:    Create dialog open; mail-handler toggle was activated (plugin field visible).
// Action:   Click the mail-handler toggle a second time to deactivate it.
// Expected: The plugin select field is hidden again.
test('create dialog: plugin-field hides again when mail-handler toggle is clicked off', async ({ managerPage }) => {
  await managerPage.click('.card-add')
  await managerPage.click('#create-mail-handler')
  await expect(managerPage.locator('#create-plugin-field')).toBeVisible()
  await managerPage.click('#create-mail-handler')
  await expect(managerPage.locator('#create-plugin-field')).not.toBeVisible()
  await managerPage.keyboard.press('Escape')
})

// ── Badge update after edit ───────────────────────────────────────────────────

// Setup:    "Test Mail App" has the mail-handler badge visible on its card.
// Action:   Open the edit dialog, deactivate the mail-handler toggle, and save.
// Expected: After saving, the mail-handler badge is no longer attached to the card
//           (the DOM element is removed, not just hidden).
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

// Setup:    "Test User App" has no mail-handler badge on its card.
// Action:   Open the edit dialog, activate the mail-handler toggle, and save.
// Expected: After saving, the mail-handler badge is present on the card.
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
