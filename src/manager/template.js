// Applies an HTML template string: substitutes {{key}} placeholders and resolves
// icon attributes to concrete file:// src values.
//
// - data-icon:          src set if icon available; element removed if not (truly optional icons)
// - data-icon-fallback: src overridden only if icon available; element kept with existing fallback src
export function applyTemplate(html, { i18n = {}, icons = {}, vars = {} } = {}) {
  const substituted = html.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    key in vars ? String(vars[key] ?? '') : String(i18n[key] ?? '')
  )
  const tmp = document.createElement('div')
  tmp.innerHTML = substituted
  tmp.querySelectorAll('[data-icon]').forEach(el => {
    const src = icons[el.dataset.icon]
    if (src) { el.src = src; el.removeAttribute('data-icon') }
    else el.remove()
  })
  tmp.querySelectorAll('[data-icon-fallback]').forEach(el => {
    const src = icons[el.dataset.iconFallback]
    if (src) el.src = src
    el.removeAttribute('data-icon-fallback')
  })
  return tmp.firstElementChild
}
