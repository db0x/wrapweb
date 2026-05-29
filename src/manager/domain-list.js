// Reusable "add chips to a list" widget used for both the internalDomains field and
// the routing-URLs field. The optional `validate` hook lets a caller reject an entry
// (e.g. on a routing-URL overlap) before it is added; without it the widget behaves
// exactly as before, so the internalDomains usage is unaffected.
export function initDomainList(listId, inputId, addBtnId, onChange, options = {}) {
  const { validate, hintEl } = options
  const listEl  = document.getElementById(listId)
  const inputEl = document.getElementById(inputId)
  const addBtn  = document.getElementById(addBtnId)
  let domains = []

  function clearHint() { if (hintEl) { hintEl.textContent = ''; hintEl.className = 'field-hint' } }
  function showHint(msg) { if (hintEl) { hintEl.textContent = msg; hintEl.className = 'field-hint error' } }

  function renderList() {
    listEl.innerHTML = ''
    for (const d of domains) {
      const li = document.createElement('li')
      li.className = 'domain-item'
      li.innerHTML = `<span>${d}</span><button type="button" class="domain-remove-btn" tabindex="-1">−</button>`
      li.querySelector('button').addEventListener('click', () => {
        domains = domains.filter(x => x !== d)
        renderList()
        onChange()
      })
      listEl.appendChild(li)
    }
  }

  // Async because the optional validator may need an IPC round-trip (overlap check).
  async function add() {
    const val = inputEl.value.trim()
    if (!val || domains.includes(val)) return
    if (validate) {
      const error = await validate(val)
      if (error) { showHint(error); return }
    }
    clearHint()
    domains.push(val)
    inputEl.value = ''
    renderList()
    onChange()
  }

  addBtn.addEventListener('click', add)
  inputEl.addEventListener('input', clearHint)  // no-op when no hintEl is configured
  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); add() }
  })

  return {
    get:   ()    => [...domains],
    // Accepts both an array (from JSON config) and a comma-separated string
    // (legacy format stored by older versions of the Manager).
    set:   (src) => {
      domains = src
        ? (Array.isArray(src) ? [...src] : src.split(',').map(s => s.trim()).filter(Boolean))
        : []
      renderList()
    },
    reset: ()    => { domains = []; clearHint(); renderList() },
  }
}
