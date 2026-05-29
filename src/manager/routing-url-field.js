import { initDomainList } from './domain-list.js'

// Renderer-side shape check for a routing-URL pattern. The authoritative parse and
// the overlap test run in the main process (manager:check-routing-overlap); this only
// rejects obviously malformed input before the IPC round-trip. '*' is allowed in the
// host so wildcard patterns like *.example.com pass.
const ROUTING_URL_RE = /^[a-z0-9.*:_-]+(\/\S*)?$/i

// Wires a routing-URL list (the shared domain-list widget) with overlap validation.
// `prefix` is the dialog id prefix ('create' | 'edit'); `getProfile` returns the
// profile to exclude from the overlap check (its own URLs must never self-conflict).
export function initRoutingUrlList(prefix, getProfile, { tr, onChange }) {
  const hintEl = document.getElementById(`${prefix}-routing-hint`)

  const validate = async (raw) => {
    // Strip an optional scheme before the shape check — new URL() can't be used
    // since '*' is not a legal host character.
    const stripped = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
    if (!ROUTING_URL_RE.test(stripped)) return tr('routingUrlInvalid')
    const { conflict, invalid } = await window.managerAPI.checkRoutingOverlap(getProfile(), raw, 'routing')
    if (invalid)  return tr('routingUrlInvalid')
    if (conflict) return tr('routingUrlConflict', { app: conflict })
    return null
  }

  return initDomainList(
    `${prefix}-routing-list`, `${prefix}-routing-input`, `${prefix}-routing-add`,
    onChange, { validate, hintEl }
  )
}
