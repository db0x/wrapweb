import { OverlayScrollbars } from '../../../node_modules/overlayscrollbars/overlayscrollbars.mjs'

export function initRebuildNotice({ i18n, tr, version, appDefaultSrc },
                                  { showBuildOverlay, hideBuildOverlay, getBuildRunning, setBuildRunning } = {}) {
  const overlay = document.createElement('div')
  overlay.className = 'confirm-overlay hidden'
  overlay.innerHTML = `
    <div class="confirm-dialog rebuild-notice-dialog">
      <h2 style="margin:0 0 12px;display:flex;align-items:center;gap:10px">
        <img src="../../assets/wrapweb.svg" width="28" height="28" alt="">
        ${i18n.rebuildNoticeTitle}
      </h2>
      <div id="rebuild-notice-intro"></div>
      <div class="rebuild-notice-scroll-wrapper" id="rebuild-notice-scroll">
        <div id="rebuild-notice-list"></div>
      </div>
      <div class="confirm-actions">
        <button class="btn-secondary" id="rebuild-notice-rebuild-all">${i18n.rebuildNoticeRebuildAll}</button>
        <button class="btn-confirm-delete" id="rebuild-notice-ok">${i18n.rebuildNoticeOk}</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)

  document.getElementById('rebuild-notice-ok').addEventListener('click', () => {
    overlay.classList.add('hidden')
  })

  document.getElementById('rebuild-notice-rebuild-all').addEventListener('click', () => {
    rebuildAll()
  })

  let scrollbarInited = false
  let outdatedApps = []

  // Rebuilds all outdated apps sequentially, showing the blocking overlay per app.
  // Uses the same isBuildRunning mutex as individual card builds to prevent concurrent builds.
  async function rebuildAll() {
    if (getBuildRunning?.()) return
    const rebuildAllBtn = document.getElementById('rebuild-notice-rebuild-all')
    const okBtn         = document.getElementById('rebuild-notice-ok')
    rebuildAllBtn.disabled = true
    okBtn.disabled         = true

    for (const a of outdatedApps) {
      const row = document.querySelector(`.rebuild-notice-row[data-profile="${a.profile}"]`)
      const statusEl = row?.querySelector('.rebuild-notice-status')

      setBuildRunning?.(true)
      showBuildOverlay?.(a.name || a.profile)
      if (statusEl) statusEl.innerHTML = '<span class="btn-spinner"></span>'

      const result = await window.managerAPI.buildApp(a.configLabel)

      hideBuildOverlay?.()
      setBuildRunning?.(false)

      if (statusEl) {
        statusEl.innerHTML = result.success
          ? '<span class="rebuild-status-ok">✓</span>'
          : '<span class="rebuild-status-err">✗</span>'
      }
      if (result.success) {
        // Mutate the shared app object so card.js also sees the updated state.
        a.needsRebuild = false
        document.querySelector(`.card[data-profile="${a.profile}"] [data-role="outdated-badge"]`)?.remove()
      }
    }

    // Hide (not just disable) to signal that rebuild is complete.
    rebuildAllBtn.classList.add('hidden')
    okBtn.disabled    = false
    okBtn.textContent = i18n.rebuildNoticeDone
  }

  function showIfNeeded(apps) {
    outdatedApps = apps.filter(a => a.needsRebuild)
    if (outdatedApps.length === 0) return

    document.getElementById('rebuild-notice-intro').innerHTML =
      tr('rebuildNoticeIntro', { version })

    const list = document.getElementById('rebuild-notice-list')
    list.innerHTML = ''
    for (const a of outdatedApps) {
      const row = document.createElement('div')
      row.className = 'rebuild-notice-row'
      row.dataset.profile = a.profile
      const iconSrc = a.iconPath ? `file://${a.iconPath}` : appDefaultSrc
      const label = a.name || a.profile.replace(/^private\./, '').replace(/-/g, ' ')
      row.innerHTML = `
        <img src="${iconSrc}" width="24" height="24" alt="">
        <span>${label}</span>
        <span class="rebuild-notice-status"></span>
      `
      list.appendChild(row)
    }

    overlay.classList.remove('hidden')

    if (!scrollbarInited) {
      OverlayScrollbars(document.getElementById('rebuild-notice-scroll'),
        { scrollbars: { autoHide: 'leave', autoHideDelay: 200 } })
      scrollbarInited = true
    }
  }

  return { showIfNeeded }
}
