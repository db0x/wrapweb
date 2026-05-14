const { test, expect } = require('./fixtures')

// Filter button visibility and layout
// ------------------------------------
// The Microsoft and Google filter buttons must always show a text label,
// even when no icon is resolved from the system GTK theme (standard fixture).
// When an icon is available (electronAppWithFilterIcons fixture), they also show an image.

// Setup:    Manager open without any system icon resolution (WRAPWEB_TEST=1, no custom icons).
// Action:   Open the drawer.
// Expected: Microsoft filter button is present and visible even without an icon.
test('microsoft filter button is always visible even without icons', async ({ managerPage }) => {
  await managerPage.click('#menu-btn')
  await expect(managerPage.locator('[data-filter="microsoft"]')).toBeVisible()
})

// Setup:    Manager open without any system icon resolution.
// Action:   Open the drawer.
// Expected: Google filter button is present and visible even without an icon.
test('google filter button is always visible even without icons', async ({ managerPage }) => {
  await managerPage.click('#menu-btn')
  await expect(managerPage.locator('[data-filter="google"]')).toBeVisible()
})

// Setup:    Manager open; Microsoft filter button has no icon resolved.
// Action:   Open the drawer.
// Expected: The button's text label reads "Microsoft Apps" (not empty, not placeholder).
test('microsoft filter button always shows text label', async ({ managerPage }) => {
  await managerPage.click('#menu-btn')
  await expect(managerPage.locator('[data-filter="microsoft"] span')).toHaveText('Microsoft Apps')
})

// Setup:    Manager open; Google filter button has no icon resolved.
// Action:   Open the drawer.
// Expected: The button's text label reads "Google Apps".
test('google filter button always shows text label', async ({ managerPage }) => {
  await managerPage.click('#menu-btn')
  await expect(managerPage.locator('[data-filter="google"] span')).toHaveText('Google Apps')
})

// Setup:    Manager launched with WRAPWEB_TEST_FILTER_ICONS pointing to a valid SVG file,
//           so both filter buttons receive a resolved icon path.
// Action:   Open the drawer.
// Expected: Microsoft filter button shows both an <img> element and the "Microsoft Apps" text label.
test('microsoft filter button shows text label with icon when icon is available', async ({ managerPageWithFilterIcons }) => {
  await managerPageWithFilterIcons.click('#menu-btn')
  const btn = managerPageWithFilterIcons.locator('[data-filter="microsoft"]')
  await expect(btn.locator('img')).toBeVisible()
  await expect(btn.locator('span')).toHaveText('Microsoft Apps')
})

// Setup:    Manager launched with WRAPWEB_TEST_FILTER_ICONS pointing to a valid SVG file.
// Action:   Open the drawer.
// Expected: Google filter button shows both an <img> element and the "Google Apps" text label.
test('google filter button shows text label with icon when icon is available', async ({ managerPageWithFilterIcons }) => {
  await managerPageWithFilterIcons.click('#menu-btn')
  const btn = managerPageWithFilterIcons.locator('[data-filter="google"]')
  await expect(btn.locator('img')).toBeVisible()
  await expect(btn.locator('span')).toHaveText('Google Apps')
})

// Category filtering
// ------------------

// Setup:    Manager open with cards for microsoft, google, and uncategorized apps.
// Action:   Open the drawer and click the Microsoft filter.
// Expected: Only microsoft-category cards are visible; google and uncategorized cards are hidden.
test('microsoft filter shows only microsoft-category cards', async ({ managerPage }) => {
  await managerPage.click('#menu-btn')
  await managerPage.click('[data-filter="microsoft"]')

  await expect(managerPage.locator('.card[data-category="microsoft"]').first()).toBeVisible()
  await expect(managerPage.locator('.card[data-category="google"]').first()).not.toBeVisible()
  await expect(managerPage.locator('.card[data-category=""]').first()).not.toBeVisible()
})

// Setup:    Manager open with cards for microsoft, google, and uncategorized apps.
// Action:   Open the drawer and click the Google filter.
// Expected: Only google-category cards are visible; microsoft and uncategorized cards are hidden.
test('google filter shows only google-category cards', async ({ managerPage }) => {
  await managerPage.click('#menu-btn')
  await managerPage.click('[data-filter="google"]')

  await expect(managerPage.locator('.card[data-category="google"]').first()).toBeVisible()
  await expect(managerPage.locator('.card[data-category="microsoft"]').first()).not.toBeVisible()
  await expect(managerPage.locator('.card[data-category=""]').first()).not.toBeVisible()
})

// Setup:    Manager open; add-card button is visible in the "all" view.
// Action:   Switch to the Microsoft filter.
// Expected: The add-card button is hidden (creating apps is only allowed in the "all" view).
test('microsoft filter hides the add-card', async ({ managerPage }) => {
  await managerPage.click('#menu-btn')
  await managerPage.click('[data-filter="microsoft"]')
  await expect(managerPage.locator('.card-add')).not.toBeVisible()
})

// Setup:    Manager open; add-card button is visible in the "all" view.
// Action:   Switch to the Google filter.
// Expected: The add-card button is hidden.
test('google filter hides the add-card', async ({ managerPage }) => {
  await managerPage.click('#menu-btn')
  await managerPage.click('[data-filter="google"]')
  await expect(managerPage.locator('.card-add')).not.toBeVisible()
})

// Setup:    Manager open; Microsoft filter is active (hiding other cards).
// Action:   Open the drawer again and click the "All Apps" filter.
// Expected: All category cards (microsoft, google, uncategorized) and the add-card button
//           are visible again, confirming the filter is fully reset.
test('"all" filter restores all cards after category filter', async ({ managerPage }) => {
  await managerPage.click('#menu-btn')
  await managerPage.click('[data-filter="microsoft"]')
  await managerPage.click('#menu-btn')
  await managerPage.click('[data-filter="all"]')

  await expect(managerPage.locator('.card[data-category="microsoft"]').first()).toBeVisible()
  await expect(managerPage.locator('.card[data-category="google"]').first()).toBeVisible()
  await expect(managerPage.locator('.card-add')).toBeVisible()
})
