export function initDomainList(listId, inputId, addBtnId, onChange) {
  const listEl  = document.getElementById(listId)
  const inputEl = document.getElementById(inputId)
  const addBtn  = document.getElementById(addBtnId)
  let domains = []

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

  function add() {
    const val = inputEl.value.trim()
    if (!val || domains.includes(val)) return
    domains.push(val)
    inputEl.value = ''
    renderList()
    onChange()
  }

  addBtn.addEventListener('click', add)
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
    reset: ()    => { domains = []; renderList() },
  }
}
