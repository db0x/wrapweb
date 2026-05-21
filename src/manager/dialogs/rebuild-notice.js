import { OverlayScrollbars } from '../../../node_modules/overlayscrollbars/overlayscrollbars.mjs'
import { applyTemplate }     from '../template.js'

export function initRebuildNotice({ i18n, tr, version, appDefaultSrc, templates },
                                  { showBuildOverlay, hideBuildOverlay, getBuildRunning, setBuildRunning } = {}) {
  const overlay = applyTemplate(templates.rebuildNotice, { i18n })
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
