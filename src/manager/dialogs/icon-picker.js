import { OverlayScrollbars } from '../../../node_modules/overlayscrollbars/overlayscrollbars.mjs'

export function initIconPicker({ i18n }) {
  let overlay = null
  let allIconsCache = null
  let onSelectCallback = null

  function ensureOverlay() {
    if (overlay) return
    overlay = document.createElement('div')
    overlay.className = 'dialog-overlay icon-picker-overlay hidden'
    overlay.innerHTML = `
      <div class="dialog icon-picker-dialog">
        <div class="dialog-header">
          <span class="dialog-title">${i18n.createIconChoose}</span>
          <button class="dialog-close" id="icon-picker-close">✕</button>
        </div>
        <div class="icon-search-bar">
          <input type="text" id="icon-search" placeholder="${i18n.iconPickerSearch}" autocomplete="off" spellcheck="false">
        </div>
        <div class="icon-picker-scroll-wrapper" id="icon-picker-scroll-wrapper">
          <div class="icon-picker-grid" id="icon-picker-grid"></div>
        </div>
        <div class="icon-picker-loader hidden" id="icon-picker-loader">
          <div class="build-spinner"></div>
        </div>
      </div>
    `
    document.body.appendChild(overlay)
    OverlayScrollbars(document.getElementById('icon-picker-scroll-wrapper'), { scrollbars: { autoHide: 'leave', autoHideDelay: 200 } })
    overlay.addEventListener('click', e => { if (e.target === overlay) closeIconPicker() })
    document.getElementById('icon-picker-close').addEventListener('click', closeIconPicker)
    document.getElementById('icon-search').addEventListener('input', e =>
      filterIconGrid(e.target.value.trim().toLowerCase())
    )
  }

  function closeIconPicker() {
    overlay?.classList.add('hidden')
  }

  function isOpen() {
    return overlay ? !overlay.classList.contains('hidden') : false
  }

  function renderIconGrid(icons) {
    const gridEl = document.getElementById('icon-picker-grid')
    const frag = document.createDocumentFragment()
    for (const { name, path } of icons) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'icon-item'
      btn.title = name
      btn.dataset.name = name
      const img = document.createElement('img')
      img.src = `file://${path}`
      img.width = 32
      img.height = 32
      img.alt = ''
      img.loading = 'lazy'
      img.decoding = 'async'
      btn.appendChild(img)
      btn.addEventListener('click', () => {
        onSelectCallback?.(name, path)
        closeIconPicker()
      })
      frag.appendChild(btn)
    }
    gridEl.replaceChildren(frag)
  }

  function filterIconGrid(query) {
    for (const btn of document.getElementById('icon-picker-grid').querySelectorAll('.icon-item')) {
      btn.style.display = !query || btn.dataset.name.includes(query) ? '' : 'none'
    }
  }

  async function openIconPicker(onSelected) {
    ensureOverlay()
    onSelectCallback = onSelected
    overlay.classList.remove('hidden')

    if (!allIconsCache) {
      const loader = document.getElementById('icon-picker-loader')
      loader.classList.remove('hidden')
      allIconsCache = await window.managerAPI.getAllIcons()
      renderIconGrid(allIconsCache)
      loader.classList.add('hidden')
    }

    document.getElementById('icon-search').value = ''
    filterIconGrid('')
    document.getElementById('icon-search').focus()
  }

  return { openIconPicker, closeIconPicker, isOpen }
}
