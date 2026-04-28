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

const sunSrc  = uiIcons.sun  ? `file://${uiIcons.sun}`  : null
const moonSrc = uiIcons.moon ? `file://${uiIcons.moon}` : null
const infoSrc = uiIcons.info ? `file://${uiIcons.info}` : null

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

  const fields = [
    { label: 'App-Image', value: app.appImagePath },
    { label: 'Profil-Ordner', value: app.profilePath },
  ]

  document.getElementById('dialog-fields').innerHTML = fields.map(f => `
    <div class="dialog-field">
      <label>${f.label}</label>
      <div class="value">${f.value}</div>
    </div>
  `).join('')

  overlay.classList.remove('hidden')
}

// ── App cards ─────────────────────────────────────────────────

for (const app of apps) {
  const hostname = (() => { try { return new URL(app.url).hostname } catch { return app.url } })()
  const name = app.name || toDisplayName(app.profile)

  const card = document.createElement('div')
  card.className = 'card'
  const iconSrc = app.iconPath ? `file://${app.iconPath}` : '../assets/wrapweb.svg'

  card.innerHTML = `
    ${infoSrc ? `<button class="card-info-btn" title="Informationen"><img src="${infoSrc}" alt="Info"></button>` : ''}
    <img src="${iconSrc}" alt="${name}">
    <span class="name">${name}</span>
    <span class="url">${hostname}</span>
    <div class="badges">
      <span class="badge ${app.built ? 'built' : 'not-built'}">${app.built ? 'Gebaut' : 'Nicht gebaut'}</span>
      ${app.isPrivate ? '<span class="badge private">Privat</span>' : ''}
    </div>
  `

  card.querySelector('.card-info-btn')?.addEventListener('click', e => {
    e.stopPropagation()
    openDialog(app, name)
  })

  document.getElementById('grid').appendChild(card)
}
