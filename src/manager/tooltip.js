export function initTooltip() {
  const el = document.createElement('div')
  el.className = 'app-tooltip'
  document.body.appendChild(el)

  let current = null

  function show(text, x, y) {
    el.textContent = text
    el.classList.add('visible')
    position(x, y)
  }

  function hide() {
    el.classList.remove('visible')
    current = null
  }

  function position(x, y) {
    const pad = 12
    el.style.left = '0'
    el.style.top  = '0'
    const w = el.offsetWidth
    const h = el.offsetHeight
    const left = Math.min(x + pad, window.innerWidth  - w - 8)
    const top  = y - h - 8 < 4 ? y + pad : y - h - 8
    el.style.left = `${left}px`
    el.style.top  = `${top}px`
  }

  document.addEventListener('mouseover', e => {
    const target = e.target.closest('[data-tooltip]')
    if (target === current) return
    current = target
    if (target) show(target.dataset.tooltip, e.clientX, e.clientY)
    else hide()
  })

  document.addEventListener('mousemove', e => {
    if (current) position(e.clientX, e.clientY)
  })

  document.addEventListener('mouseout', e => {
    if (current && !current.contains(e.relatedTarget)) hide()
  })
}
