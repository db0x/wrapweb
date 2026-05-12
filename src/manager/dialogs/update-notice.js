export function initUpdateNotice({ i18n, tr, icons }) {
  const iconSrc = icons.updateNotifier ?? '../../assets/wrapweb.svg'
  const overlay = document.createElement('div')
  overlay.id = 'update-notice-overlay'
  overlay.className = 'confirm-overlay hidden'
  overlay.innerHTML = `
    <div class="confirm-dialog">
      <h2 style="margin:0 0 12px;display:flex;align-items:center;gap:10px">
        <img src="${iconSrc}" width="28" height="28" alt="">
        ${i18n.updateNoticeTitle}
      </h2>
      <div id="update-notice-body"></div>
      <div class="confirm-actions" style="margin-top:16px">
        <button class="btn-secondary" id="update-notice-github">${i18n.updateNoticeGithub}</button>
        <button class="btn-confirm-delete" id="update-notice-ok">${i18n.updateNoticeOk}</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)

  document.getElementById('update-notice-ok').addEventListener('click', () => {
    overlay.classList.add('hidden')
  })

  document.getElementById('update-notice-github').addEventListener('click', () => {
    window.managerAPI.openExternal('https://github.com/db0x/wrapweb')
  })

  function show(latestVersion) {
    document.getElementById('update-notice-body').innerHTML =
      tr('updateNoticeBody', { version: latestVersion })
    overlay.classList.remove('hidden')
  }

  return { show }
}
