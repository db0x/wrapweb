const { test, expect } = require('./fixtures')
const fs   = require('node:fs')
const path = require('node:path')

// Routing-URLs field in the create/edit dialogs. The shared matcher is unit-tested in
// routing-match.spec.js; these tests cover the UI wiring: adding chips, the overlap
// block, format validation, and round-tripping the value into the private config.
//
// All fixture apps use example.com / mail.example.com, so any example.com pattern
// overlaps an existing claim while a unique host does not.

const WEBAPPS_DIR = path.join(__dirname, '..', 'webapps')

// Setup:    Create dialog open; routing-URL input empty. A fixture app (Test Google App)
//           declares the routing URL routing-claim.example.net/app.
// Action:   Add a unique routing URL, then one overlapping a base URL, then one overlapping
//           another app's routing URL.
// Expected: Unique is added; the base-overlapping one is ALSO added (a routing URL may
//           overlap a base URL); the routing-overlapping one is rejected (routing↔routing
//           must stay unambiguous).
test('create dialog: routing URL may overlap a base but not another routing URL', async ({ managerPage }) => {
  await managerPage.click('.card-add')

  await managerPage.fill('#create-routing-input', 'unique-routing-host.test/app')
  await managerPage.click('#create-routing-add')
  await expect(managerPage.locator('#create-routing-list .domain-item')).toHaveCount(1)
  await expect(managerPage.locator('#create-routing-hint.error')).not.toBeVisible()

  // example.com is the base URL of several fixture apps — routing↔base is allowed.
  await managerPage.fill('#create-routing-input', 'https://example.com')
  await managerPage.click('#create-routing-add')
  await expect(managerPage.locator('#create-routing-list .domain-item')).toHaveCount(2)
  await expect(managerPage.locator('#create-routing-hint.error')).not.toBeVisible()

  // routing-claim.example.net/app is another app's routing URL — routing↔routing is blocked.
  await managerPage.fill('#create-routing-input', 'routing-claim.example.net/app')
  await managerPage.click('#create-routing-add')
  await expect(managerPage.locator('#create-routing-hint.error')).toBeVisible()
  await expect(managerPage.locator('#create-routing-list .domain-item')).toHaveCount(2)
})

// Setup:    Create dialog open; URL field empty.
// Action:   Type a base URL that overlaps a fixture app's base URL, then a unique one.
// Expected: The overlapping base URL is flagged and blocks save (base↔base forbidden);
//           a unique base URL validates cleanly.
test('create dialog: base URL blocks overlap with another base URL', async ({ managerPage }) => {
  await managerPage.click('.card-add')

  await managerPage.fill('#create-url', 'https://example.com')
  await expect(managerPage.locator('#create-url-hint.error')).toBeVisible()
  await expect(managerPage.locator('#create-save')).toBeDisabled()

  await managerPage.fill('#create-url', 'https://unique-base.example.org')
  await expect(managerPage.locator('#create-url.valid')).toBeVisible()
})

// Setup:    Create dialog open.
// Action:   Add a malformed routing URL (contains a space).
// Expected: Rejected with the invalid-format hint before any IPC round-trip; no chip added.
test('create dialog: malformed routing URL is rejected', async ({ managerPage }) => {
  await managerPage.click('.card-add')
  await managerPage.fill('#create-routing-input', 'not a url')
  await managerPage.click('#create-routing-add')
  await expect(managerPage.locator('#create-routing-hint.error')).toBeVisible()
  await expect(managerPage.locator('#create-routing-list .domain-item')).toHaveCount(0)
})

// Setup:    Edit dialog open for a private app (test-user-app), no field changed yet.
// Action:   Add a unique routing URL.
// Expected: Save enables (form is now dirty) and the chip is shown.
test('edit dialog: adding a routing URL marks the form dirty', async ({ managerPage }) => {
  const card = managerPage.locator('.card[data-private="true"]').first()
  await card.hover()
  await card.locator('[data-action="edit"]').click()
  await expect(managerPage.locator('#edit-save')).toBeDisabled()

  await managerPage.fill('#edit-routing-input', 'edit-routing-host.test/x')
  await managerPage.click('#edit-routing-add')
  await expect(managerPage.locator('#edit-routing-list .domain-item')).toHaveCount(1)
  await expect(managerPage.locator('#edit-save')).toBeEnabled()
})

// Setup:    Edit dialog open for the private test-user-app (not built → no rebuild prompt).
// Action:   Add a routing URL and save.
// Expected: The written build.private.test-user-app.json contains the URL in routingUrls,
//           proving the value round-trips through buildAppCfg instead of being dropped.
test('edit dialog: routing URL persists to the private config', async ({ managerPage }) => {
  const card = managerPage.locator('.card[data-private="true"][data-profile="test-user-app"]')
  await card.hover()
  await card.locator('[data-action="edit"]').click()

  await managerPage.fill('#edit-routing-input', 'persisted-host.test/path')
  await managerPage.click('#edit-routing-add')
  await managerPage.click('#edit-save')

  // Wait until the config file reflects the new routingUrls entry.
  const cfgPath = path.join(WEBAPPS_DIR, 'build.private.test-user-app.json')
  await expect.poll(() => {
    try {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
      return cfg.routingUrls ?? []
    } catch { return [] }
  }).toContain('persisted-host.test/path')
})
