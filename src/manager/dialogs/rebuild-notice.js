import { OverlayScrollbars } from '../../../node_modules/overlayscrollbars/overlayscrollbars.mjs'

export function initRebuildNotice({ i18n, tr, version, appDefaultSrc }) {
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
        <button class="btn-confirm-delete" id="rebuild-notice-ok">${i18n.rebuildNoticeOk}</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)

  document.getElementById('rebuild-notice-ok').addEventListener('click', () => {
    overlay.classList.add('hidden')
  })

  let scrollbarInited = false

  function showIfNeeded(apps) {
    const outdated = apps.filter(a => a.needsRebuild)
    if (outdated.length === 0) return

    document.getElementById('rebuild-notice-intro').innerHTML =
      tr('rebuildNoticeIntro', { version })

    const list = document.getElementById('rebuild-notice-list')
    list.innerHTML = ''
    for (const a of outdated) {
      const row = document.createElement('div')
      row.className = 'rebuild-notice-row'
      const iconSrc = a.iconPath ? `file://${a.iconPath}` : appDefaultSrc
      const label = a.name || a.profile.replace(/^private\./, '').replace(/-/g, ' ')
      row.innerHTML = `<img src="${iconSrc}" width="24" height="24" alt=""><span>${label}</span>`
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
