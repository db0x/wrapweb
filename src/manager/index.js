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

const [apps, version, uiIcons] = await Promise.all([
  window.managerAPI.getApps(),
  window.managerAPI.getVersion(),
  window.managerAPI.getUiIcons(),
])

document.getElementById('version').textContent = `v${version}`

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
  <div class="drawer-section-label">Darstellung</div>
  <button class="menu-item" id="menu-darkmode">
    <img id="menu-darkmode-icon" src="" alt="">
    <span id="menu-darkmode-label"></span>
  </button>
  <hr class="drawer-divider">
  <div class="drawer-section-label">Sichtbarkeit</div>
  <button class="menu-item" data-filter="all">
    ${filterAllSrc    ? `<img src="${filterAllSrc}"    alt="">` : ''}
    <span>Alle Apps</span>
  </button>
  <button class="menu-item" data-filter="public">
    ${filterPublicSrc ? `<img src="${filterPublicSrc}" alt="">` : ''}
    <span>Embedded Apps</span>
  </button>
  <button class="menu-item" data-filter="private">
    ${filterPrivateSrc ? `<img src="${filterPrivateSrc}" alt="">` : ''}
    <span>Benutzer Apps</span>
  </button>
  <button class="menu-item menu-toggle" id="menu-hide-uninstalled">
    <span class="toggle-switch"></span>
    <span>Nicht installierte ausblenden</span>
  </button>
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
  label.textContent = isDark ? 'Light Mode' : 'Dark Mode'
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
    <div class="confirm-actions">
      <button class="btn-cancel" id="confirm-cancel">Abbrechen</button>
      <button class="btn-confirm-delete" id="confirm-ok">Löschen</button>
    </div>
  </div>
`
document.body.appendChild(confirmOverlay)

function showConfirm(message) {
  return new Promise(resolve => {
    document.getElementById('confirm-message').innerHTML = message
    confirmOverlay.classList.remove('hidden')
    const ok     = document.getElementById('confirm-ok')
    const cancel = document.getElementById('confirm-cancel')
    const cleanup = result => {
      confirmOverlay.classList.add('hidden')
      ok.replaceWith(ok.cloneNode(true))
      cancel.replaceWith(cancel.cloneNode(true))
      resolve(result)
    }
    document.getElementById('confirm-ok').addEventListener('click',    () => cleanup(true))
    document.getElementById('confirm-cancel').addEventListener('click', () => cleanup(false))
    confirmOverlay.addEventListener('click', e => { if (e.target === confirmOverlay) cleanup(false) }, { once: true })
  })
}

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
  document.getElementById('build-overlay-label').textContent = `Baut ${name} …`
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
  if (!app.built) {
    fieldsEl.innerHTML = `<p style="font-size:13px; color: var(--card-url);">App ist nicht gebaut.</p>`
  } else {
    fieldsEl.innerHTML = [
      { label: 'App-Image',    value: app.appImagePath },
      { label: 'Profil-Ordner', value: app.profilePath },
    ].map(f => `
      <div class="dialog-field">
        <label>${f.label}</label>
        <div class="value">${f.value}</div>
      </div>
    `).join('')
  }
  overlay.classList.remove('hidden')
}

// ── App cards ─────────────────────────────────────────────────

for (const app of apps) {
  const hostname = (() => { try { return new URL(app.url).hostname } catch { return app.url } })()
  const name = app.name || toDisplayName(app.profile)

  const card = document.createElement('div')
  card.className = 'card'
  card.dataset.private    = app.isPrivate   ? 'true' : 'false'
  card.dataset.installed  = app.installed   ? 'true' : 'false'
  const iconSrc = app.iconPath ? `file://${app.iconPath}` : appDefaultSrc

  card.innerHTML = `
    <img src="${iconSrc}" alt="${name}" class="${app.built && app.installed ? 'launchable' : 'unavailable'}">
    <span class="name">${name}</span>
    <span class="url">${hostname}</span>
    <div class="badges">
      <span class="badge ${app.built ? 'built' : 'not-built'}" data-role="build-badge">${app.built ? 'Gebaut' : 'Nicht gebaut'}</span>
      ${app.installed ? '<span class="badge installed" data-role="install-badge">Installiert</span>' : ''}
      ${app.isPrivate ? '<span class="badge private">Benutzer</span>' : ''}
    </div>
    <div class="card-toolbar">
      ${infoSrc    ? `<button class="toolbar-btn" data-action="info"    title="Informationen"><img src="${infoSrc}"    alt="Info"></button>`    : ''}
      ${buildSrc   ? `<button class="toolbar-btn" data-action="build"   title="${app.built ? 'Neu bauen' : 'Bauen'}"><img src="${buildSrc}"   alt="Build"></button>`   : ''}
      ${installSrc ? `<button class="toolbar-btn" data-action="install" title="Installieren" ${app.built && !app.installed ? '' : 'disabled'}><img src="${installSrc}" alt="Install"></button>` : ''}
      ${deleteSrc  ? `<button class="toolbar-btn danger" data-action="delete" title="Löschen" ${app.built ? '' : 'disabled'}><img src="${deleteSrc}"  alt="Löschen"></button>` : ''}
    </div>
  `

  const iconEl = card.querySelector('img')
  iconEl.addEventListener('click', () => {
    if (app.built && app.installed) window.managerAPI.launchApp(app.profile)
  })

  card.querySelector('[data-action="info"]')?.addEventListener('click', () => openDialog(app, name))

  card.querySelector('[data-action="delete"]')?.addEventListener('click', async () => {
    const confirmed = await showConfirm(`
      <p>App-Image und Desktop-Eintrag für <strong>${name}</strong> wirklich löschen?</p>
      <p>Das Profil-Verzeichnis bleibt erhalten.</p>
    `)
    if (!confirmed) return
    const btn = card.querySelector('[data-action="delete"]')
    btn.disabled = true
    btn.classList.add('loading')
    const result = await window.managerAPI.deleteApp(app.profile)
    btn.classList.remove('loading')
    if (result.success) {
      app.built = false
      app.installed = false
      card.dataset.installed = 'false'
      card.querySelector('[data-role="build-badge"]').textContent = 'Nicht gebaut'
      card.querySelector('[data-role="build-badge"]').classList.replace('built', 'not-built')
      card.querySelector('[data-action="build"]').title = 'Bauen'
      card.querySelector('[data-action="install"]')?.setAttribute('disabled', '')
      card.querySelector('[data-role="install-badge"]')?.remove()
      iconEl.classList.replace('launchable', 'unavailable')
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
      installBadge.textContent = 'Installiert'
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
      badge.textContent = 'Gebaut'
      badge.classList.replace('not-built', 'built')
      btn.title = 'Neu bauen'
      const installBtn = card.querySelector('[data-action="install"]')
      if (installBtn && !app.installed) installBtn.disabled = false
      const deleteBtn = card.querySelector('[data-action="delete"]')
      if (deleteBtn) deleteBtn.disabled = false
    }
  })

  document.getElementById('grid').appendChild(card)
}

const addCard = document.createElement('div')
addCard.className = 'card card-add'
addCard.innerHTML = `<span class="plus">+</span>`
document.getElementById('grid').appendChild(addCard)

// apply saved filter after all cards are in the DOM
applyFilter(currentFilter)

OverlayScrollbars(document.getElementById('grid-wrapper'), { scrollbars: { autoHide: 'leave', autoHideDelay: 200 } })
