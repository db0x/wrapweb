export function initRcloneDialog({ i18n, icons }) {
  const rcloneIconHtml = icons.rclone
    ? `<img src="${icons.rclone}" width="20" height="20" alt="">`
    : ''

  const overlay = document.createElement('div')
  overlay.className = 'dialog-overlay hidden'
  overlay.innerHTML = `
    <div class="dialog rclone-dialog">
      <div class="dialog-header">
        ${rcloneIconHtml}
        <span class="dialog-title">${i18n.rcloneDialogTitle}</span>
        <button class="dialog-close" id="rclone-close">✕</button>
      </div>
      <div class="dialog-fields">
        <div class="rclone-section-heading">${i18n.rcloneDialogGdrive}</div>
        <div class="dialog-field">
          <label for="rclone-remote-select">${i18n.rcloneDialogRemote}</label>
          <select id="rclone-remote-select">
            <option value="">${i18n.rcloneDialogNone}</option>
          </select>
        </div>
        <p class="rclone-hint" id="rclone-no-remotes-hint" style="display:none">
          ${i18n.rcloneDialogNoRemotes}
        </p>
        <p class="rclone-hint">${i18n.rcloneDialogHint}</p>
      </div>
      <div class="confirm-actions">
        <button class="btn-cancel" id="rclone-cancel">${i18n.confirmCancel}</button>
        <button class="btn-secondary" id="rclone-save">${i18n.rcloneDialogSave}</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)

  const selectEl   = document.getElementById('rclone-remote-select')
  const noHint     = document.getElementById('rclone-no-remotes-hint')
  const saveBtn    = document.getElementById('rclone-save')

  function closeDialog() { overlay.classList.add('hidden') }

  overlay.addEventListener('click', e => { if (e.target === overlay) closeDialog() })
  document.getElementById('rclone-close').addEventListener('click', closeDialog)
  document.getElementById('rclone-cancel').addEventListener('click', closeDialog)
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDialog() })

  saveBtn.addEventListener('click', async () => {
    const remote = selectEl.value || null
    await window.managerAPI.saveRcloneConfig({ googleDriveRemote: remote })
    closeDialog()
  })

  async function openRcloneDialog() {
    overlay.classList.remove('hidden')

    // Fetch remotes and saved config in parallel.
    const [remotes, saved] = await Promise.all([
      window.managerAPI.getRcloneDriveRemotes(),
      window.managerAPI.loadRcloneConfig(),
    ])

    // Rebuild the option list, preserving the empty "none" entry.
    selectEl.innerHTML = `<option value="">${i18n.rcloneDialogNone}</option>`
    for (const name of remotes) {
      const opt = document.createElement('option')
      opt.value = name
      opt.textContent = name
      selectEl.appendChild(opt)
    }

    // Pre-select the previously saved remote if it is still present.
    if (saved.googleDriveRemote && remotes.includes(saved.googleDriveRemote)) {
      selectEl.value = saved.googleDriveRemote
    }

    noHint.style.display = remotes.length === 0 ? '' : 'none'
  }

  return { openRcloneDialog }
}
