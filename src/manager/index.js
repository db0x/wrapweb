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

const sunSrc     = uiIcons.sun     ? `file://${uiIcons.sun}`     : null
const moonSrc    = uiIcons.moon    ? `file://${uiIcons.moon}`    : null
const infoSrc    = uiIcons.info    ? `file://${uiIcons.info}`    : null
const buildSrc   = uiIcons.build   ? `file://${uiIcons.build}`   : null
const installSrc = uiIcons.install ? `file://${uiIcons.install}` : null
const deleteSrc  = uiIcons.delete  ? `file://${uiIcons.delete}`  : null

// ── Theme toggle ──────────────────────────────────────────────

function applyThemeIcon() {
  const isDark = document.body.classList.contains('dark')
  const src = isDark ? sunSrc : moonSrc
  const btn = document.getElementById('theme-toggle')
  const img = document.getElementById('theme-icon')
  if (src) {
    img.src = src
    btn.style.display = ''
  } else {
    btn.style.display = 'none'
  }
}

applyThemeIcon()

document.getElementById('theme-toggle').addEventListener('click', () => {
  document.body.classList.toggle('dark')
  localStorage.setItem('dark', document.body.classList.contains('dark') ? '1' : '0')
  applyThemeIcon()
})

// ── Confirm dialog ───────────────────────────────────────────

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
    const cleanup = (result) => {
      confirmOverlay.classList.add('hidden')
      ok.replaceWith(ok.cloneNode(true))
      cancel.replaceWith(cancel.cloneNode(true))
      resolve(result)
    }
    document.getElementById('confirm-ok').addEventListener('click',     () => cleanup(true))
    document.getElementById('confirm-cancel').addEventListener('click',  () => cleanup(false))
    confirmOverlay.addEventListener('click', e => { if (e.target === confirmOverlay) cleanup(false) }, { once: true })
  })
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

function closeDialog() {
  overlay.classList.add('hidden')
}

function openDialog(app, name) {
  document.getElementById('dialog-title').textContent = name

  const fieldsEl = document.getElementById('dialog-fields')

  if (!app.built) {
    fieldsEl.innerHTML = `<p style="font-size:13px; color: var(--card-url);">App ist nicht gebaut.</p>`
  } else {
    const fields = [
      { label: 'App-Image', value: app.appImagePath },
      { label: 'Profil-Ordner', value: app.profilePath },
    ]
    fieldsEl.innerHTML = fields.map(f => `
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
  const iconSrc = app.iconPath ? `file://${app.iconPath}` : '../../assets/wrapweb.svg'

  card.innerHTML = `
    <img src="${iconSrc}" alt="${name}" class="${app.built && app.installed ? 'launchable' : 'unavailable'}">
    <span class="name">${name}</span>
    <span class="url">${hostname}</span>
    <div class="badges">
      <span class="badge ${app.built ? 'built' : 'not-built'}" data-role="build-badge">${app.built ? 'Gebaut' : 'Nicht gebaut'}</span>
      ${app.isPrivate ? '<span class="badge private">Privat</span>' : ''}
    </div>
    <div class="card-toolbar">
      ${infoSrc  ? `<button class="toolbar-btn" data-action="info"  title="Informationen"><img src="${infoSrc}"  alt="Info"></button>`  : ''}
      ${buildSrc   ? `<button class="toolbar-btn" data-action="build"   title="${app.built ? 'Neu bauen' : 'Bauen'}"><img src="${buildSrc}"   alt="Build"></button>`   : ''}
      ${installSrc ? `<button class="toolbar-btn" data-action="install" title="Installieren" ${app.built && !app.installed ? '' : 'disabled'}><img src="${installSrc}" alt="Install"></button>` : ''}
      ${deleteSrc  ? `<button class="toolbar-btn danger" data-action="delete" title="Löschen" ${app.built ? '' : 'disabled'}><img src="${deleteSrc}" alt="Löschen"></button>` : ''}
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
      const badge = card.querySelector('[data-role="build-badge"]')
      badge.textContent = 'Nicht gebaut'
      badge.classList.replace('built', 'not-built')
      card.querySelector('[data-action="build"]').title = 'Bauen'
      const installBtn = card.querySelector('[data-action="install"]')
      if (installBtn) installBtn.disabled = true
      iconEl.classList.replace('launchable', 'unavailable')
    } else {
      btn.disabled = false
    }
  })

  card.querySelector('[data-action="install"]')?.addEventListener('click', async () => {
    const btn = card.querySelector('[data-action="install"]')
    btn.disabled = true
    btn.classList.add('loading')
    const result = await window.managerAPI.installApp(app.profile)
    btn.classList.remove('loading')
    if (result.success) {
      app.installed = true
      btn.disabled = true
      iconEl.classList.replace('unavailable', 'launchable')
    } else {
      btn.disabled = false
    }
  })

  card.querySelector('[data-action="build"]')?.addEventListener('click', async () => {
    const btn  = card.querySelector('[data-action="build"]')
    const badge = card.querySelector('[data-role="build-badge"]')

    btn.disabled = true
    btn.classList.add('loading')

    const result = await window.managerAPI.buildApp(app.profile)

    btn.disabled = false
    btn.classList.remove('loading')

    if (result.success) {
      app.built = true
      badge.textContent = 'Gebaut'
      badge.classList.replace('not-built', 'built')
      btn.title = 'Neu bauen'
      const installBtn = card.querySelector('[data-action="install"]')
      if (installBtn && !app.installed) installBtn.disabled = false
    }
  })

  document.getElementById('grid').appendChild(card)
}

const addCard = document.createElement('div')
addCard.className = 'card card-add'
addCard.innerHTML = `<span class="plus">+</span>`
document.getElementById('grid').appendChild(addCard)
