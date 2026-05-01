import { OverlayScrollbars } from '../../node_modules/overlayscrollbars/overlayscrollbars.mjs'

function toDisplayName(profile) {
  return profile
    .replace(/^private\./, '')
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

const dark = localStorage.getItem('dark') === '1'
if (dark) document.body.classList.add('dark')

const [apps, version, uiIcons, i18n, uaPresets] = await Promise.all([
  window.managerAPI.getApps(),
  window.managerAPI.getVersion(),
  window.managerAPI.getUiIcons(),
  window.managerAPI.getI18n(),
  window.managerAPI.getUaPresets(),
])

const tr = (key, params = {}) =>
  (i18n[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ''))


const s = k => uiIcons[k] ? `file://${uiIcons[k]}` : null

const sunSrc          = s('sun')
const moonSrc         = s('moon')
const infoSrc         = s('info')
const buildSrc        = s('build')
const installSrc      = s('install')
const deleteSrc       = s('delete')
const menuSrc         = s('menu')
const filterAllSrc     = s('filterAll')
const filterPublicSrc  = s('filterPublic')
const filterPrivateSrc = s('filterPrivate')
const hideFilterSrc    = s('hideFilter')
const appDefaultSrc    = s('appDefault') ?? '../../assets/wrapweb.svg'

// ── Hamburger button ──────────────────────────────────────────

const menuBtn  = document.getElementById('menu-btn')
const menuIcon = document.getElementById('menu-icon')
if (menuSrc) menuIcon.src = menuSrc
else menuBtn.style.display = 'none'

// ── Side drawer ───────────────────────────────────────────────

const backdrop = document.createElement('div')
backdrop.className = 'drawer-backdrop'
document.body.appendChild(backdrop)

const drawer = document.createElement('div')
drawer.className = 'drawer'
drawer.innerHTML = `
  <div class="drawer-section-label">${i18n.drawerAppearance}</div>
  <button class="menu-item" id="menu-darkmode">
    <img id="menu-darkmode-icon" src="" alt="">
    <span id="menu-darkmode-label"></span>
  </button>
  <hr class="drawer-divider">
  <div class="drawer-section-label">${i18n.drawerVisibility}</div>
  <button class="menu-item" data-filter="all">
    ${filterAllSrc    ? `<img src="${filterAllSrc}"    alt="">` : ''}
    <span>${i18n.drawerAllApps}</span>
  </button>
  <button class="menu-item" data-filter="public">
    ${filterPublicSrc ? `<img src="${filterPublicSrc}" alt="">` : ''}
    <span>${i18n.drawerEmbeddedApps}</span>
  </button>
  <button class="menu-item" data-filter="private">
    ${filterPrivateSrc ? `<img src="${filterPrivateSrc}" alt="">` : ''}
    <span>${i18n.drawerUserApps}</span>
  </button>
  <button class="menu-item menu-toggle" id="menu-hide-uninstalled">
    <span class="toggle-switch"></span>
    <span>${i18n.drawerHideUninstalled}</span>
  </button>
  <hr class="drawer-divider">
  <button class="menu-item" id="menu-profiles">
    <span>${i18n.drawerProfiles}</span>
  </button>
  <div class="drawer-version">v${version}</div>
`
document.body.appendChild(drawer)

function openDrawer()  { drawer.classList.add('open'); backdrop.classList.add('open') }
function closeDrawer() { drawer.classList.remove('open'); backdrop.classList.remove('open') }

menuBtn.addEventListener('click', () =>
  drawer.classList.contains('open') ? closeDrawer() : openDrawer()
)
backdrop.addEventListener('click', closeDrawer)
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer() })

// ── Dark mode (in drawer) ─────────────────────────────────────

function applyDarkmodeMenuItem() {
  const isDark = document.body.classList.contains('dark')
  const icon = document.getElementById('menu-darkmode-icon')
  const label = document.getElementById('menu-darkmode-label')
  icon.src = isDark ? (sunSrc ?? '') : (moonSrc ?? '')
  icon.style.display = (sunSrc || moonSrc) ? '' : 'none'
  label.textContent = isDark ? i18n.drawerLightMode : i18n.drawerDarkMode
}

applyDarkmodeMenuItem()

document.getElementById('menu-darkmode').addEventListener('click', () => {
  document.body.classList.toggle('dark')
  localStorage.setItem('dark', document.body.classList.contains('dark') ? '1' : '0')
  applyDarkmodeMenuItem()
})

// ── Filter ────────────────────────────────────────────────────

let currentFilter    = localStorage.getItem('filter') ?? 'all'
let hideUninstalled  = localStorage.getItem('hideUninstalled') === '1'

function applyVisibility() {
  document.querySelectorAll('.card[data-private]').forEach(card => {
    const isPrivate   = card.dataset.private    === 'true'
    const isInstalled = card.dataset.installed  === 'true'
    const passesFilter =
      currentFilter === 'all' ||
      (currentFilter === 'public'  && !isPrivate) ||
      (currentFilter === 'private' &&  isPrivate)
    const passesInstalled = !hideUninstalled || isInstalled
    card.style.display = (passesFilter && passesInstalled) ? '' : 'none'
  })
  const addCardEl = document.querySelector('.card-add')
  if (addCardEl) addCardEl.style.display = currentFilter === 'public' ? 'none' : ''
}

function applyFilter(filter) {
  currentFilter = filter
  localStorage.setItem('filter', filter)
  drawer.querySelectorAll('[data-filter]').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.filter === filter)
  )
  applyVisibility()
}

drawer.querySelectorAll('[data-filter]').forEach(btn => {
  btn.addEventListener('click', () => { applyFilter(btn.dataset.filter); closeDrawer() })
})

const hideUninstalledBtn = document.getElementById('menu-hide-uninstalled')
hideUninstalledBtn.classList.toggle('active', hideUninstalled)
hideUninstalledBtn.addEventListener('click', () => {
  hideUninstalled = !hideUninstalled
  localStorage.setItem('hideUninstalled', hideUninstalled ? '1' : '0')
  hideUninstalledBtn.classList.toggle('active', hideUninstalled)
  applyVisibility()
})

// ── Confirm dialog ────────────────────────────────────────────

const confirmOverlay = document.createElement('div')
confirmOverlay.className = 'confirm-overlay hidden'
confirmOverlay.innerHTML = `
  <div class="confirm-dialog">
    <div id="confirm-message"></div>
    <div id="confirm-toggle-row" style="display:none">
      <button type="button" class="dialog-field-toggle" id="confirm-toggle-btn">
        <span class="toggle-switch"></span>
        <span id="confirm-toggle-label"></span>
      </button>
    </div>
    <div class="confirm-actions">
      <button class="btn-cancel" id="confirm-cancel">${i18n.confirmCancel}</button>
      <button class="btn-confirm-delete" id="confirm-ok">${i18n.confirmDelete}</button>
    </div>
  </div>
`
document.body.appendChild(confirmOverlay)

document.getElementById('confirm-toggle-btn').addEventListener('click', e =>
  e.currentTarget.classList.toggle('active')
)

function showConfirm(message, options = {}) {
  return new Promise(resolve => {
    document.getElementById('confirm-message').innerHTML = message
    const toggleRow = document.getElementById('confirm-toggle-row')
    const toggleBtn = document.getElementById('confirm-toggle-btn')
    if (options.toggle) {
      document.getElementById('confirm-toggle-label').textContent = options.toggle.label
      toggleBtn.classList.toggle('active', options.toggle.defaultOn ?? false)
      toggleRow.style.display = ''
    } else {
      toggleRow.style.display = 'none'
      toggleBtn.classList.remove('active')
    }
    confirmOverlay.classList.remove('hidden')
    const ok     = document.getElementById('confirm-ok')
    const cancel = document.getElementById('confirm-cancel')
    const cleanup = result => {
      confirmOverlay.classList.add('hidden')
      ok.replaceWith(ok.cloneNode(true))
      cancel.replaceWith(cancel.cloneNode(true))
      resolve({ confirmed: result, deleteConfig: toggleBtn.classList.contains('active') })
    }
    document.getElementById('confirm-ok').addEventListener('click',    () => cleanup(true))
    document.getElementById('confirm-cancel').addEventListener('click', () => cleanup(false))
    confirmOverlay.addEventListener('click', e => { if (e.target === confirmOverlay) cleanup(false) }, { once: true })
  })
}

// ── Profiles dialog ───────────────────────────────────────────

const profilesOverlay = document.createElement('div')
profilesOverlay.className = 'dialog-overlay hidden'
profilesOverlay.innerHTML = `
  <div class="dialog profiles-dialog">
    <div class="dialog-header">
      <span class="dialog-title">${i18n.profilesTitle}</span>
      <button class="dialog-close" id="profiles-dialog-close">✕</button>
    </div>
    <div class="profiles-scroll-wrapper" id="profiles-scroll-wrapper">
      <div id="profiles-list" class="profiles-list">
        <div class="build-spinner" style="margin: 24px auto;"></div>
      </div>
    </div>
  </div>
`
document.body.appendChild(profilesOverlay)

profilesOverlay.addEventListener('click', e => { if (e.target === profilesOverlay) closeProfilesDialog() })
document.getElementById('profiles-dialog-close').addEventListener('click', closeProfilesDialog)

function closeProfilesDialog() { profilesOverlay.classList.add('hidden') }

function fmtBytes(b) {
  if (b >= 1e9) return (b / 1e9).toFixed(1) + ' GB'
  if (b >= 1e6) return (b / 1e6).toFixed(1) + ' MB'
  if (b >= 1e3) return (b / 1e3).toFixed(0) + ' KB'
  return b + ' B'
}

let profilesScrollbarInited = false

async function openProfilesDialog() {
  profilesOverlay.classList.remove('hidden')
  closeDrawer()
  if (!profilesScrollbarInited) {
    OverlayScrollbars(document.getElementById('profiles-scroll-wrapper'), { scrollbars: { autoHide: 'leave', autoHideDelay: 200 } })
    profilesScrollbarInited = true
  }
  const listEl = document.getElementById('profiles-list')
  listEl.innerHTML = '<div class="build-spinner" style="margin: 24px auto;"></div>'

  const sizes = await window.managerAPI.getProfileSizes()
  sizes.sort((a, b) => b.bytes - a.bytes)
  const total = sizes.reduce((s, p) => s + p.bytes, 0)

  const iconByProfile = Object.fromEntries(apps.map(a => [a.profile, a.iconPath]))

  const rows = sizes.map(p => {
    const label    = p.name || p.profile.replace(/^private\./, '').replace(/-/g, ' ')
    const pct      = total > 0 && p.exists ? Math.max(2, Math.round(p.bytes / total * 100)) : 0
    const sizeStr  = p.exists ? fmtBytes(p.bytes) : i18n.profilesEmpty
    const iconPath = iconByProfile[p.profile]
    const iconHtml = iconPath
      ? `<img src="file://${iconPath}" width="24" height="24" class="profile-size-icon" alt="">`
      : `<img src="${appDefaultSrc}" width="24" height="24" class="profile-size-icon" alt="">`
    return `
      <div class="profile-size-row">
        <div class="profile-size-name">${iconHtml}<span>${label}</span></div>
        <div class="profile-size-bar-wrap">
          <div class="profile-size-bar" style="width:${pct}%"></div>
        </div>
        <div class="profile-size-value">${sizeStr}</div>
      </div>`
  }).join('')

  listEl.innerHTML = `
    ${rows}
    <div class="profile-size-total">
      <span>${i18n.profilesTotal}</span>
      <span>${fmtBytes(total)}</span>
    </div>`
}

document.getElementById('menu-profiles').addEventListener('click', openProfilesDialog)

// ── Build overlay ─────────────────────────────────────────────

let isBuildRunning = false

const buildOverlay = document.createElement('div')
buildOverlay.id = 'build-overlay'
buildOverlay.className = 'hidden'
buildOverlay.innerHTML = `
  <div class="build-spinner"></div>
  <span class="build-overlay-label" id="build-overlay-label"></span>
`
document.body.appendChild(buildOverlay)

function showBuildOverlay(name) {
  document.getElementById('build-overlay-label').textContent = tr('buildingApp', { name })
  buildOverlay.classList.remove('hidden')
}

function hideBuildOverlay() {
  buildOverlay.classList.add('hidden')
}

// ── Info dialog ───────────────────────────────────────────────

const overlay = document.createElement('div')
overlay.className = 'dialog-overlay hidden'
overlay.innerHTML = `
  <div class="dialog">
    <div class="dialog-header">
      ${infoSrc ? `<img src="${infoSrc}" alt="">` : ''}
      <span class="dialog-title" id="dialog-title"></span>
      <button class="dialog-close" id="dialog-close">✕</button>
    </div>
    <div class="dialog-fields" id="dialog-fields"></div>
  </div>
`
document.body.appendChild(overlay)

overlay.addEventListener('click', e => { if (e.target === overlay) closeDialog() })
document.getElementById('dialog-close').addEventListener('click', closeDialog)
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDialog() })

function closeDialog() { overlay.classList.add('hidden') }

function openDialog(app, name) {
  document.getElementById('dialog-title').textContent = name
  const fieldsEl = document.getElementById('dialog-fields')

  const field = (label, value) => `
    <div class="dialog-field">
      <label>${label}</label>
      <div class="value">${value}</div>
    </div>`

  const pathField = (label, value) => `
    <div class="dialog-field">
      <label>${label}</label>
      <div class="dialog-field-path">
        <div class="value">${value}</div>
        <button class="btn-reveal" data-reveal="${value}" title="${i18n.infoReveal}">…</button>
      </div>
    </div>`

  const rows = []
  rows.push(field(i18n.infoUrl, app.url))
  rows.push(field(i18n.infoProfile, app.profile))
  if (app.icon)       rows.push(field(i18n.infoIcon, app.icon))
  if (app.geometry) {
    const w = app.geometry.width  ? `${app.geometry.width} px`  : '—'
    const h = app.geometry.height ? `${app.geometry.height} px` : '—'
    rows.push(field(i18n.infoGeometry, `${w} × ${h}`))
  }
  if (app.userAgent)  rows.push(field(i18n.infoUserAgent, app.userAgent))
  if (app.internalDomains) {
    const domains = Array.isArray(app.internalDomains)
      ? app.internalDomains.join(', ')
      : app.internalDomains
    rows.push(field(i18n.infoDomains, domains))
  }
  if (app.crossOriginIsolation) rows.push(field(i18n.infoCoi, i18n.infoCoiYes))
  if (app.built) {
    rows.push(pathField(i18n.infoAppImage,   app.appImagePath))
    rows.push(pathField(i18n.infoProfileDir, app.profilePath))
  }

  fieldsEl.innerHTML = rows.join('')
  fieldsEl.querySelectorAll('[data-reveal]').forEach(btn =>
    btn.addEventListener('click', () => window.managerAPI.revealPath(btn.dataset.reveal))
  )
  overlay.classList.remove('hidden')
}

// ── App cards ─────────────────────────────────────────────────

const grid = document.getElementById('grid')

function createCard(app) {
  const hostname = (() => { try { return new URL(app.url).hostname } catch { return app.url } })()
  const name = app.name || toDisplayName(app.profile)

  const card = document.createElement('div')
  card.className = 'card'
  card.dataset.private   = app.isPrivate  ? 'true' : 'false'
  card.dataset.installed = app.installed  ? 'true' : 'false'
  card.dataset.sortname  = name.toLowerCase()
  const iconSrc = app.iconPath ? `file://${app.iconPath}` : appDefaultSrc

  card.innerHTML = `
    <img src="${iconSrc}" alt="${name}" class="${app.built && app.installed ? 'launchable' : 'unavailable'}">
    <span class="name">${name}</span>
    <span class="url">${hostname}</span>
    <div class="badges">
      <span class="badge ${app.built ? 'built' : 'not-built'}" data-role="build-badge">${app.built ? i18n.badgeBuilt : i18n.badgeNotBuilt}</span>
      ${app.installed ? `<span class="badge installed" data-role="install-badge">${i18n.badgeInstalled}</span>` : ''}
      ${app.isPrivate ? `<span class="badge private">${i18n.badgeUser}</span>` : ''}
    </div>
    <div class="card-toolbar">
      ${infoSrc    ? `<button class="toolbar-btn" data-action="info"    title="${i18n.btnInfo}"><img src="${infoSrc}"    alt="${i18n.btnInfo}"></button>`    : ''}
      ${buildSrc   ? `<button class="toolbar-btn" data-action="build"   title="${app.built ? i18n.btnRebuild : i18n.btnBuild}"><img src="${buildSrc}"   alt="Build"></button>`   : ''}
      ${installSrc ? `<button class="toolbar-btn" data-action="install" title="${i18n.btnInstall}" ${app.built && !app.installed ? '' : 'disabled'}><img src="${installSrc}" alt="${i18n.btnInstall}"></button>` : ''}
      ${deleteSrc  ? `<button class="toolbar-btn danger" data-action="delete" title="${i18n.btnDelete}" ${app.built ? '' : 'disabled'}><img src="${deleteSrc}"  alt="${i18n.btnDelete}"></button>` : ''}
    </div>
  `

  const iconEl = card.querySelector('img')
  iconEl.addEventListener('click', () => {
    if (app.built && app.installed) window.managerAPI.launchApp(app.profile)
  })

  card.querySelector('[data-action="info"]')?.addEventListener('click', () => openDialog(app, name))

  card.querySelector('[data-action="delete"]')?.addEventListener('click', async () => {
    const { confirmed, deleteConfig } = await showConfirm(
      tr('confirmDeleteMsg', { name }),
      app.isPrivate ? { toggle: { label: i18n.confirmDeleteConfig } } : {}
    )
    if (!confirmed) return
    const btn = card.querySelector('[data-action="delete"]')
    btn.disabled = true
    btn.classList.add('loading')
    const result = await window.managerAPI.deleteApp({ profile: app.profile, configLabel: app.configLabel, deleteConfig })
    btn.classList.remove('loading')
    if (result.success) {
      if (deleteConfig) {
        card.remove()
      } else {
        app.built = false
        app.installed = false
        card.dataset.installed = 'false'
        card.querySelector('[data-role="build-badge"]').textContent = i18n.badgeNotBuilt
        card.querySelector('[data-role="build-badge"]').classList.replace('built', 'not-built')
        card.querySelector('[data-action="build"]').title = i18n.btnBuild
        card.querySelector('[data-action="install"]')?.setAttribute('disabled', '')
        card.querySelector('[data-role="install-badge"]')?.remove()
        iconEl.classList.replace('launchable', 'unavailable')
      }
    } else {
      btn.disabled = false
    }
  })

  card.querySelector('[data-action="install"]')?.addEventListener('click', async () => {
    const btn = card.querySelector('[data-action="install"]')
    btn.disabled = true
    btn.classList.add('loading')
    const result = await window.managerAPI.installApp(app.configLabel)
    btn.classList.remove('loading')
    if (result.success) {
      app.installed = true
      card.dataset.installed = 'true'
      iconEl.classList.replace('unavailable', 'launchable')
      const buildBadge = card.querySelector('[data-role="build-badge"]')
      const installBadge = document.createElement('span')
      installBadge.className = 'badge installed'
      installBadge.dataset.role = 'install-badge'
      installBadge.textContent = i18n.badgeInstalled
      buildBadge.insertAdjacentElement('afterend', installBadge)
    } else {
      btn.disabled = false
    }
  })

  card.querySelector('[data-action="build"]')?.addEventListener('click', async () => {
    if (isBuildRunning) return
    isBuildRunning = true
    showBuildOverlay(name)
    const btn   = card.querySelector('[data-action="build"]')
    const badge = card.querySelector('[data-role="build-badge"]')
    btn.disabled = true
    btn.classList.add('loading')
    const result = await window.managerAPI.buildApp(app.configLabel)
    btn.disabled = false
    btn.classList.remove('loading')
    isBuildRunning = false
    hideBuildOverlay()
    if (result.success) {
      app.built = true
      badge.textContent = i18n.badgeBuilt
      badge.classList.replace('not-built', 'built')
      btn.title = i18n.btnRebuild
      const installBtn = card.querySelector('[data-action="install"]')
      if (installBtn && !app.installed) installBtn.disabled = false
      const deleteBtn = card.querySelector('[data-action="delete"]')
      if (deleteBtn) deleteBtn.disabled = false
    }
  })

  return card
}

function insertCard(card) {
  const sortname = card.dataset.sortname
  const existing = [...grid.querySelectorAll('.card[data-sortname]')]
  const before = existing.find(c => c.dataset.sortname > sortname)
  grid.insertBefore(card, before ?? addCard)
}

for (const app of apps) {
  grid.appendChild(createCard(app))
}

const addCard = document.createElement('div')
addCard.className = 'card card-add'
addCard.innerHTML = `<span class="plus">+</span>`
grid.appendChild(addCard)

// ── Create App Dialog ─────────────────────────────────────────

const createOverlay = document.createElement('div')
createOverlay.className = 'dialog-overlay hidden'
createOverlay.innerHTML = `
  <div class="dialog">
    <div class="dialog-header">
      <span class="dialog-title">${i18n.createTitle}</span>
      <button class="dialog-close" id="create-close">✕</button>
    </div>
    <div class="dialog-fields">
      <div class="dialog-field">
        <label>${i18n.createProfile} *</label>
        <input type="text" id="create-profile" placeholder="meine-app" autocomplete="off" spellcheck="false">
        <span class="field-hint" id="create-profile-hint"></span>
      </div>
      <div class="dialog-field">
        <label>${i18n.createName}</label>
        <input type="text" id="create-name" placeholder="Meine App">
      </div>
      <div class="dialog-field">
        <label>${i18n.createUrl} *</label>
        <input type="text" id="create-url" placeholder="https://app.example.com" autocomplete="off" spellcheck="false">
        <span class="field-hint" id="create-url-hint"></span>
      </div>
      <div class="dialog-field">
        <label>${i18n.createIcon}</label>
        <div class="icon-picker-row">
          <img id="create-icon-preview" src="${appDefaultSrc}" alt="" class="icon-field-preview">
          <button type="button" id="create-icon-btn" class="icon-picker-btn">
            <span id="create-icon-name" class="icon-picker-placeholder">${i18n.createIconChoose}</span>
          </button>
          <button type="button" id="create-icon-clear" class="icon-clear-btn" style="display:none">✕</button>
        </div>
      </div>
      <hr class="dialog-section-divider">
      <div class="dialog-section-label">${i18n.createAdvanced}</div>
      <div class="dialog-field dialog-field-row">
        <div class="dialog-field">
          <label>${i18n.createWidth}</label>
          <input type="number" id="create-width" placeholder="1280">
          <span class="field-hint" id="create-width-hint"></span>
        </div>
        <div class="dialog-field">
          <label>${i18n.createHeight}</label>
          <input type="number" id="create-height" placeholder="1024">
          <span class="field-hint" id="create-height-hint"></span>
        </div>
      </div>
      <div class="dialog-field">
        <label>${i18n.createUAgent}</label>
        <select id="create-useragent">
          <option value="">${i18n.createUaDefault}</option>
        </select>
      </div>
      <div class="dialog-field">
        <label>${i18n.createDomains}</label>
        <input type="text" id="create-domains" placeholder="accounts.google.com, github.com" autocomplete="off" spellcheck="false">
      </div>
      <button type="button" class="dialog-field-toggle" id="create-coi">
        <span class="toggle-switch"></span>
        <span>${i18n.createCoi}</span>
      </button>
    </div>
    <div class="confirm-actions">
      <button class="btn-cancel" id="create-cancel">${i18n.createCancel}</button>
      <button class="btn-save" id="create-save" disabled>${i18n.createSave}</button>
    </div>
  </div>
`
document.body.appendChild(createOverlay)

const uaSelect = document.getElementById('create-useragent')
for (const { label, value } of uaPresets) {
  const opt = document.createElement('option')
  opt.value = value
  opt.textContent = label
  uaSelect.appendChild(opt)
}

let profileValid = false
let urlValid     = false
let widthValid   = true
let heightValid  = true
let profileCheckTimer = null

const createProfileInput = document.getElementById('create-profile')
const createProfileHint  = document.getElementById('create-profile-hint')
const createUrlInput     = document.getElementById('create-url')
const createUrlHint      = document.getElementById('create-url-hint')
const createSaveBtn      = document.getElementById('create-save')

function updateCreateSaveBtn() {
  createSaveBtn.disabled = !(profileValid && urlValid && widthValid && heightValid)
}

function validateDimension(inputEl, hintEl, min, max, flagSetter) {
  const val = inputEl.value.trim()
  if (!val) {
    inputEl.className = ''
    hintEl.textContent = ''
    flagSetter(true)
    updateCreateSaveBtn()
    return
  }
  const n = Number(val)
  if (!Number.isInteger(n) || n < min || n > max) {
    inputEl.className = 'invalid'
    hintEl.textContent = tr('validDimRange', { min, max })
    hintEl.className = 'field-hint error'
    flagSetter(false)
  } else {
    inputEl.className = 'valid'
    hintEl.textContent = ''
    hintEl.className = 'field-hint'
    flagSetter(true)
  }
  updateCreateSaveBtn()
}

createProfileInput.addEventListener('input', () => {
  const val = createProfileInput.value.trim()
  profileValid = false

  if (!val) {
    createProfileInput.className = ''
    createProfileHint.textContent = ''
    clearTimeout(profileCheckTimer)
    updateCreateSaveBtn()
    return
  }

  if (!/^[a-z0-9-]+$/.test(val)) {
    createProfileInput.className = 'invalid'
    createProfileHint.textContent = i18n.validPattern
    createProfileHint.className = 'field-hint error'
    clearTimeout(profileCheckTimer)
    updateCreateSaveBtn()
    return
  }

  clearTimeout(profileCheckTimer)
  createProfileInput.className = ''
  createProfileHint.textContent = i18n.validChecking
  createProfileHint.className = 'field-hint'

  profileCheckTimer = setTimeout(async () => {
    const exists = await window.managerAPI.checkProfile(val)
    if (createProfileInput.value.trim() !== val) return
    if (exists) {
      createProfileInput.className = 'invalid'
      createProfileHint.textContent = i18n.validExists
      createProfileHint.className = 'field-hint error'
      profileValid = false
    } else {
      createProfileInput.className = 'valid'
      createProfileHint.textContent = tr('validHint', { profile: val })
      createProfileHint.className = 'field-hint'
      profileValid = true
    }
    updateCreateSaveBtn()
  }, 300)
})

createUrlInput.addEventListener('input', () => {
  const val = createUrlInput.value.trim()
  if (!val) {
    urlValid = false
    createUrlInput.className = ''
    createUrlHint.textContent = ''
    createUrlHint.className = 'field-hint'
  } else {
    try {
      new URL(val)
      urlValid = true
      createUrlInput.className = 'valid'
      createUrlHint.textContent = ''
    } catch {
      urlValid = false
      createUrlInput.className = 'invalid'
      createUrlHint.textContent = i18n.validUrl
      createUrlHint.className = 'field-hint error'
    }
  }
  updateCreateSaveBtn()
})

document.getElementById('create-width').addEventListener('input', e =>
  validateDimension(e.target, document.getElementById('create-width-hint'), 400, 7680, v => { widthValid = v })
)

document.getElementById('create-height').addEventListener('input', e =>
  validateDimension(e.target, document.getElementById('create-height-hint'), 300, 4320, v => { heightValid = v })
)

document.getElementById('create-coi').addEventListener('click', e =>
  e.currentTarget.classList.toggle('active')
)

function openCreateDialog() {
  createProfileInput.value = ''
  createProfileInput.className = ''
  createProfileHint.textContent = ''
  createProfileHint.className = 'field-hint'
  document.getElementById('create-name').value = ''
  createUrlInput.value = ''
  createUrlInput.className = ''
  createUrlHint.textContent = ''
  createUrlHint.className = 'field-hint'
  selectedIconName = ''
  document.getElementById('create-icon-preview').src = appDefaultSrc
  document.getElementById('create-icon-name').textContent = i18n.createIconChoose
  document.getElementById('create-icon-name').className = 'icon-picker-placeholder'
  document.getElementById('create-icon-clear').style.display = 'none'
  document.getElementById('create-width').value = ''
  document.getElementById('create-height').value = ''
  document.getElementById('create-useragent').value = ''
  document.getElementById('create-domains').value = ''
  document.getElementById('create-coi').classList.remove('active')
  profileValid = false
  urlValid     = false
  widthValid   = true
  heightValid  = true
  updateCreateSaveBtn()
  createOverlay.classList.remove('hidden')
  createProfileInput.focus()
}

function closeCreateDialog() {
  clearTimeout(profileCheckTimer)
  createOverlay.classList.add('hidden')
}

createOverlay.addEventListener('click', e => { if (e.target === createOverlay) closeCreateDialog() })
document.getElementById('create-close').addEventListener('click', closeCreateDialog)
document.getElementById('create-cancel').addEventListener('click', closeCreateDialog)
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return
  if (iconPickerOverlay && !iconPickerOverlay.classList.contains('hidden')) closeIconPicker()
  else closeCreateDialog()
})

createSaveBtn.addEventListener('click', async () => {
  const profile    = createProfileInput.value.trim()
  const name       = document.getElementById('create-name').value.trim()
  const url        = createUrlInput.value.trim()
  const icon       = selectedIconName
  const width      = document.getElementById('create-width').value.trim()
  const height     = document.getElementById('create-height').value.trim()
  const userAgent  = document.getElementById('create-useragent').value.trim()
  const internalDomains      = document.getElementById('create-domains').value.trim()
  const crossOriginIsolation = document.getElementById('create-coi').classList.contains('active')
  createSaveBtn.disabled = true
  const result = await window.managerAPI.createApp({ profile, name, url, icon, width, height, userAgent, internalDomains, crossOriginIsolation })
  if (result.success) {
    closeCreateDialog()
    insertCard(createCard(result.app))
    applyVisibility()
  } else {
    updateCreateSaveBtn()
  }
})

addCard.addEventListener('click', openCreateDialog)

// ── Icon Picker ───────────────────────────────────────────────

let selectedIconName = ''
let allIconsCache    = null
let iconPickerOverlay = null

const createIconBtn   = document.getElementById('create-icon-btn')
const createIconClear = document.getElementById('create-icon-clear')
const createIconPreview = document.getElementById('create-icon-preview')
const createIconNameEl  = document.getElementById('create-icon-name')

createIconBtn.addEventListener('click', openIconPicker)

createIconClear.addEventListener('click', () => {
  selectedIconName = ''
  createIconPreview.src = appDefaultSrc
  createIconNameEl.textContent = i18n.createIconChoose
  createIconNameEl.className = 'icon-picker-placeholder'
  createIconClear.style.display = 'none'
})

async function openIconPicker() {
  if (!iconPickerOverlay) {
    iconPickerOverlay = document.createElement('div')
    iconPickerOverlay.className = 'dialog-overlay icon-picker-overlay hidden'
    iconPickerOverlay.innerHTML = `
      <div class="dialog icon-picker-dialog">
        <div class="dialog-header">
          <span class="dialog-title">${i18n.createIconChoose}</span>
          <button class="dialog-close" id="icon-picker-close">✕</button>
        </div>
        <div class="icon-search-bar">
          <input type="text" id="icon-search" placeholder="${i18n.iconPickerSearch}" autocomplete="off" spellcheck="false">
        </div>
        <div class="icon-picker-scroll-wrapper" id="icon-picker-scroll-wrapper">
          <div class="icon-picker-grid" id="icon-picker-grid"></div>
        </div>
        <div class="icon-picker-loader hidden" id="icon-picker-loader">
          <div class="build-spinner"></div>
        </div>
      </div>
    `
    document.body.appendChild(iconPickerOverlay)
    OverlayScrollbars(document.getElementById('icon-picker-scroll-wrapper'), { scrollbars: { autoHide: 'leave', autoHideDelay: 200 } })
    iconPickerOverlay.addEventListener('click', e => { if (e.target === iconPickerOverlay) closeIconPicker() })
    document.getElementById('icon-picker-close').addEventListener('click', closeIconPicker)
    document.getElementById('icon-search').addEventListener('input', e =>
      filterIconGrid(e.target.value.trim().toLowerCase())
    )
  }

  iconPickerOverlay.classList.remove('hidden')

  if (!allIconsCache) {
    const loader = document.getElementById('icon-picker-loader')
    loader.classList.remove('hidden')
    allIconsCache = await window.managerAPI.getAllIcons()
    renderIconGrid(allIconsCache)
    loader.classList.add('hidden')
  }

  document.getElementById('icon-search').value = ''
  filterIconGrid('')
  document.getElementById('icon-search').focus()
}

function closeIconPicker() {
  iconPickerOverlay?.classList.add('hidden')
}

function renderIconGrid(icons) {
  const grid = document.getElementById('icon-picker-grid')
  const frag = document.createDocumentFragment()
  for (const { name, path } of icons) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'icon-item'
    btn.title = name
    btn.dataset.name = name
    const img = document.createElement('img')
    img.src = `file://${path}`
    img.width = 32
    img.height = 32
    img.alt = ''
    img.loading = 'lazy'
    img.decoding = 'async'
    btn.appendChild(img)
    btn.addEventListener('click', () => selectIcon(name, path))
    frag.appendChild(btn)
  }
  grid.replaceChildren(frag)
}

function filterIconGrid(query) {
  for (const btn of document.getElementById('icon-picker-grid').querySelectorAll('.icon-item')) {
    btn.style.display = !query || btn.dataset.name.includes(query) ? '' : 'none'
  }
}

function selectIcon(name, path) {
  selectedIconName = name
  createIconPreview.src = `file://${path}`
  createIconNameEl.textContent = name
  createIconNameEl.className = ''
  createIconClear.style.display = ''
  closeIconPicker()
}

// apply saved filter after all cards are in the DOM
applyFilter(currentFilter)

OverlayScrollbars(document.getElementById('grid-wrapper'), { scrollbars: { autoHide: 'leave', autoHideDelay: 200 } })
