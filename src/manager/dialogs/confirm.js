export function initConfirmDialog({ i18n }) {
  const overlay = document.createElement('div')
  overlay.className = 'confirm-overlay hidden'
  overlay.innerHTML = `
    <div class="confirm-dialog">
      <div id="confirm-message"></div>
      <div id="confirm-toggle-row" style="display:none">
        <button type="button" class="dialog-field-toggle" id="confirm-toggle-btn">
          <span class="toggle-switch"></span>
          <span id="confirm-toggle-label"></span>
        </button>
      </div>
      <div class="confirm-actions">
        <button class="btn-cancel" id="confirm-cancel">${i18n.confirmCancel}</button>
        <button class="btn-confirm-delete" id="confirm-ok">${i18n.confirmDelete}</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)

  document.getElementById('confirm-toggle-btn').addEventListener('click', e =>
    e.currentTarget.classList.toggle('active')
  )

  function showConfirm(message, options = {}) {
    return new Promise(resolve => {
      document.getElementById('confirm-message').innerHTML = message
      const toggleRow = document.getElementById('confirm-toggle-row')
      const toggleBtn = document.getElementById('confirm-toggle-btn')
      if (options.toggle) {
        document.getElementById('confirm-toggle-label').textContent = options.toggle.label
        toggleBtn.classList.toggle('active', options.toggle.defaultOn ?? false)
        toggleRow.style.display = ''
      } else {
        toggleRow.style.display = 'none'
        toggleBtn.classList.remove('active')
      }
      overlay.classList.remove('hidden')
      const ok     = document.getElementById('confirm-ok')
      const cancel = document.getElementById('confirm-cancel')
      ok.textContent = options.okLabel ?? i18n.confirmDelete
      ok.className   = options.okClass ?? 'btn-confirm-delete'
      const cleanup = result => {
        overlay.classList.add('hidden')
        ok.replaceWith(ok.cloneNode(true))
        cancel.replaceWith(cancel.cloneNode(true))
        resolve({ confirmed: result, deleteConfig: toggleBtn.classList.contains('active') })
      }
      document.getElementById('confirm-ok').addEventListener('click',    () => cleanup(true))
      document.getElementById('confirm-cancel').addEventListener('click', () => cleanup(false))
      overlay.addEventListener('click', e => { if (e.target === overlay) cleanup(false) }, { once: true })
    })
  }

  return { showConfirm }
}
