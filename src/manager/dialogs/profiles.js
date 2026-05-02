import { OverlayScrollbars } from '../../../node_modules/overlayscrollbars/overlayscrollbars.mjs'

export function initProfilesDialog({ i18n, apps, appDefaultSrc }) {
  const overlay = document.createElement('div')
  overlay.className = 'dialog-overlay hidden'
  overlay.innerHTML = `
    <div class="dialog profiles-dialog">
      <div class="dialog-header">
        <span class="dialog-title">${i18n.profilesTitle}</span>
        <button class="dialog-close" id="profiles-close">✕</button>
      </div>
      <div class="profiles-scroll-wrapper" id="profiles-scroll-wrapper">
        <div id="profiles-list" class="profiles-list">
          <div class="build-spinner" style="margin: 24px auto;"></div>
        </div>
      </div>
    </div>
  `
  document.body.appendChild(overlay)

  function closeProfilesDialog() { overlay.classList.add('hidden') }

  overlay.addEventListener('click', e => { if (e.target === overlay) closeProfilesDialog() })
  document.getElementById('profiles-close').addEventListener('click', closeProfilesDialog)

  let scrollbarInited = false

  function fmtBytes(b) {
    if (b >= 1e9) return (b / 1e9).toFixed(1) + ' GB'
    if (b >= 1e6) return (b / 1e6).toFixed(1) + ' MB'
    if (b >= 1e3) return (b / 1e3).toFixed(0) + ' KB'
    return b + ' B'
  }

  async function openProfilesDialog() {
    overlay.classList.remove('hidden')
    if (!scrollbarInited) {
      OverlayScrollbars(document.getElementById('profiles-scroll-wrapper'), { scrollbars: { autoHide: 'leave', autoHideDelay: 200 } })
      scrollbarInited = true
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

  return { openProfilesDialog }
}
