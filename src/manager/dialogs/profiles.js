import { OverlayScrollbars } from '../../../node_modules/overlayscrollbars/overlayscrollbars.mjs'

export function initProfilesDialog({ i18n, tr, apps, appDefaultSrc, icons }, { showConfirm }) {
  const deleteSrc = icons.delete

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
    await loadProfiles()
  }

  async function loadProfiles() {
    const listEl = document.getElementById('profiles-list')
    listEl.innerHTML = '<div class="build-spinner" style="margin: 24px auto;"></div>'
    await new Promise(resolve => requestAnimationFrame(resolve))

    const sizes = (await window.managerAPI.getProfileSizes()).filter(p => p.bytes > 0)
    sizes.sort((a, b) => b.bytes - a.bytes)
    const total = sizes.reduce((s, p) => s + p.bytes, 0)
    const iconByProfile = Object.fromEntries(apps.map(a => [a.profile, a.iconPath]))

    listEl.innerHTML = ''

    for (const p of sizes) {
      const label    = p.name || p.profile.replace(/^private\./, '').replace(/-/g, ' ')
      const pct      = total > 0 ? Math.max(2, Math.round(p.bytes / total * 100)) : 0
      const iconPath = iconByProfile[p.profile]
      const iconHtml = iconPath
        ? `<img src="file://${iconPath}" width="24" height="24" class="profile-size-icon" alt="">`
        : `<img src="${appDefaultSrc}" width="24" height="24" class="profile-size-icon" alt="">`

      const row = document.createElement('div')
      row.className = 'profile-size-row'
      row.dataset.profile = p.profile
      row.innerHTML = `
        <div class="profile-size-name">${iconHtml}<span data-tooltip="${label}">${label}</span></div>
        <div class="profile-size-bar-wrap">
          <div class="profile-size-bar" style="width:${pct}%"></div>
        </div>
        <div class="profile-size-value">${fmtBytes(p.bytes)}</div>
        <button class="profile-delete-btn toolbar-btn danger" data-tooltip="${i18n.btnDelete}">
          ${deleteSrc ? `<img src="${deleteSrc}" alt="${i18n.btnDelete}">` : '✕'}
        </button>`

      row.querySelector('.profile-delete-btn').addEventListener('click', async () => {
        const { confirmed } = await showConfirm(
          tr('profilesDeleteConfirm', { name: label })
        )
        if (!confirmed) return
        const btn = row.querySelector('.profile-delete-btn')
        btn.disabled = true
        const result = await window.managerAPI.deleteProfileData(p.profile)
        if (result.success) {
          row.remove()
          updateTotal()
        } else {
          btn.disabled = false
        }
      })

      listEl.appendChild(row)
    }

    const totalEl = document.createElement('div')
    totalEl.className = 'profile-size-total'
    totalEl.id = 'profiles-total'
    totalEl.innerHTML = `<span>${i18n.profilesTotal}</span><span>${fmtBytes(total)}</span>`
    listEl.appendChild(totalEl)
  }

  function updateTotal() {
    const rows = [...document.querySelectorAll('.profile-size-row')]
    if (rows.length === 0) {
      document.getElementById('profiles-list').innerHTML =
        `<p style="color:var(--card-url);text-align:center;padding:16px 0">${i18n.profilesEmpty}</p>`
      return
    }
    const bars = rows.map(r => r.querySelector('.profile-size-bar'))
    const values = rows.map(r => {
      const v = r.querySelector('.profile-size-value').textContent.trim()
      return parseSize(v)
    })
    const total = values.reduce((s, v) => s + v, 0)
    const max = Math.max(...values, 1)
    rows.forEach((r, i) => {
      bars[i].style.width = Math.max(2, Math.round(values[i] / max * 100)) + '%'
    })
    document.getElementById('profiles-total').innerHTML =
      `<span>${i18n.profilesTotal}</span><span>${fmtBytes(total)}</span>`
  }

  function parseSize(str) {
    const [num, unit] = str.split(' ')
    const n = parseFloat(num)
    if (unit === 'GB') return n * 1e9
    if (unit === 'MB') return n * 1e6
    if (unit === 'KB') return n * 1e3
    return n
  }

  return { openProfilesDialog }
}
