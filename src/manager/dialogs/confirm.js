export function initConfirmDialog({ i18n }) {
  const overlay = document.createElement('div')
  overlay.className = 'confirm-overlay hidden'
  overlay.innerHTML = `
    <div class="confirm-dialog">
      <div id="confirm-message"></div>
      <div id="confirm-toggles"></div>
      <div class="confirm-actions">
        <button class="btn-cancel" id="confirm-cancel">${i18n.confirmCancel}</button>
        <button class="btn-confirm-delete" id="confirm-ok">${i18n.confirmDelete}</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)

  function showConfirm(message, options = {}) {
    return new Promise(resolve => {
      document.getElementById('confirm-message').innerHTML = message

      const toggleDefs = options.toggles
        ?? (options.toggle ? [{ key: 'deleteConfig', ...options.toggle }] : [])

      const container = document.getElementById('confirm-toggles')
      container.innerHTML = ''
      for (const def of toggleDefs) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'dialog-field-toggle' + (def.defaultOn ? ' active' : '')
        btn.dataset.key = def.key
        btn.innerHTML = `<span class="toggle-switch"></span><span>${def.label}</span>`
        btn.addEventListener('click', e => e.currentTarget.classList.toggle('active'))
        container.appendChild(btn)
      }

      const ok     = document.getElementById('confirm-ok')
      const cancel = document.getElementById('confirm-cancel')
      ok.textContent = options.okLabel ?? i18n.confirmDelete
      ok.className   = options.okClass ?? 'btn-confirm-delete'

      overlay.classList.remove('hidden')

      const cleanup = confirmed => {
        overlay.classList.add('hidden')
        ok.replaceWith(ok.cloneNode(true))
        cancel.replaceWith(cancel.cloneNode(true))
        const result = { confirmed }
        for (const btn of container.querySelectorAll('[data-key]'))
          result[btn.dataset.key] = btn.classList.contains('active')
        if (!('deleteConfig' in result)) result.deleteConfig = false
        resolve(result)
      }

      document.getElementById('confirm-ok').addEventListener('click',    () => cleanup(true))
      document.getElementById('confirm-cancel').addEventListener('click', () => cleanup(false))
      overlay.addEventListener('click', e => { if (e.target === overlay) cleanup(false) }, { once: true })
    })
  }

  return { showConfirm }
}
