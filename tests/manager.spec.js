const { test, expect } = require('./fixtures')

test('manager window has correct title', async ({ managerPage }) => {
  await expect(managerPage).toHaveTitle('wrapweb')
})

test('app grid is visible', async ({ managerPage }) => {
  await expect(managerPage.locator('#grid')).toBeVisible()
  await expect(managerPage.locator('.card-add')).toBeVisible()
})

test('public test-app card is rendered', async ({ managerPage }) => {
  const card = managerPage.locator('.card', { hasText: 'Test App' })
  await expect(card).toBeVisible()
  await expect(card.locator('.badge.not-built')).toBeVisible()
})

test('private test-user-app card is rendered', async ({ managerPage }) => {
  const card = managerPage.locator('.card', { hasText: 'Test User App' })
  await expect(card).toBeVisible()
  await expect(card.locator('.badge.private')).toBeVisible()
})

test('drawer opens and closes via menu button', async ({ managerPage }) => {
  const drawer = managerPage.locator('.drawer')
  await expect(drawer).not.toHaveClass(/open/)

  await managerPage.click('#menu-btn')
  await expect(drawer).toHaveClass(/open/)

  await managerPage.keyboard.press('Escape')
  await expect(drawer).not.toHaveClass(/open/)
})

test('filter "User Apps" shows only private cards', async ({ managerPage }) => {
  await managerPage.click('#menu-btn')
  await managerPage.click('[data-filter="private"]')

  // Private card must be visible
  const privateCard = managerPage.locator('.card[data-private="true"]')
  await expect(privateCard.first()).toBeVisible()

  // Public card must be hidden
  const publicCard = managerPage.locator('.card[data-private="false"]').first()
  await expect(publicCard).not.toBeVisible()
})

test('filter "Embedded Apps" hides the add-card', async ({ managerPage }) => {
  await managerPage.click('#menu-btn')
  await managerPage.click('[data-filter="public"]')

  await expect(managerPage.locator('.card-add')).not.toBeVisible()
})

test('dark mode toggle adds dark class to body', async ({ managerPage }) => {
  await expect(managerPage.locator('body')).not.toHaveClass(/dark/)

  await managerPage.click('#menu-btn')
  await managerPage.click('#menu-darkmode')

  await expect(managerPage.locator('body')).toHaveClass(/dark/)
})
