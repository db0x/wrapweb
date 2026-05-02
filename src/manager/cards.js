export function initCards({ i18n, tr, apps, toDisplayName, appDefaultSrc, icons }, { showConfirm, openInfoDialog, showBuildOverlay, hideBuildOverlay }) {
  const { info: infoSrc, build: buildSrc, install: installSrc, delete: deleteSrc } = icons

  const grid = document.getElementById('grid')

  const addCard = document.createElement('div')
  addCard.className = 'card card-add'
  addCard.innerHTML = `<span class="plus">+</span>`

  let isBuildRunning = false

  function createCard(app) {
    const hostname = (() => { try { return new URL(app.url).hostname } catch { return app.url } })()
    const name = app.name || toDisplayName(app.profile)

    const card = document.createElement('div')
    card.className = 'card'
    card.dataset.private   = app.isPrivate ? 'true' : 'false'
    card.dataset.installed = app.installed ? 'true' : 'false'
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

    card.querySelector('[data-action="info"]')?.addEventListener('click', () => openInfoDialog(app, name))

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
  grid.appendChild(addCard)

  return { createCard, insertCard, addCard }
}
