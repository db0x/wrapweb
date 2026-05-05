import { OverlayScrollbars } from '../../../node_modules/overlayscrollbars/overlayscrollbars.mjs'
import { initDomainList }    from '../domain-list.js'

export function initEditDialog({ i18n, tr, appDefaultSrc, uaPresets }, { iconPicker, showConfirm }) {
  const overlay = document.createElement('div')
  overlay.className = 'dialog-overlay hidden'
  overlay.innerHTML = `
    <div class="dialog edit-dialog">
      <div class="dialog-header">
        <span class="dialog-title">${i18n.editTitle}</span>
        <button class="dialog-close" id="edit-close">✕</button>
      </div>
      <div class="edit-scroll-wrapper" id="edit-scroll-wrapper">
      <div class="dialog-fields">
        <div class="dialog-field">
          <label>${i18n.createProfile}</label>
          <div class="value" id="edit-profile-label" style="padding:6px 0;color:var(--card-url);font-size:0.9em"></div>
        </div>
        <div class="dialog-field">
          <label>${i18n.createName}</label>
          <input type="text" id="edit-name" placeholder="Meine App">
        </div>
        <div class="dialog-field">
          <label>${i18n.createUrl} *</label>
          <input type="text" id="edit-url" placeholder="https://app.example.com" autocomplete="off" spellcheck="false">
          <span class="field-hint" id="edit-url-hint"></span>
        </div>
        <div class="dialog-field">
          <label>${i18n.createIcon}</label>
          <div class="icon-picker-row">
            <img id="edit-icon-preview" src="${appDefaultSrc}" alt="" class="icon-field-preview">
            <button type="button" id="edit-icon-btn" class="icon-picker-btn">
              <span id="edit-icon-name" class="icon-picker-placeholder">${i18n.createIconChoose}</span>
            </button>
            <button type="button" id="edit-icon-clear" class="icon-clear-btn" style="display:none">✕</button>
          </div>
        </div>
        <hr class="dialog-section-divider">
        <div class="dialog-section-label">${i18n.createAdvanced}</div>
        <div class="dialog-field dialog-field-row">
          <div class="dialog-field">
            <label>${i18n.createWidth}</label>
            <input type="number" id="edit-width" placeholder="1280">
            <span class="field-hint" id="edit-width-hint"></span>
          </div>
          <div class="dialog-field">
            <label>${i18n.createHeight}</label>
            <input type="number" id="edit-height" placeholder="1024">
            <span class="field-hint" id="edit-height-hint"></span>
          </div>
        </div>
        <div class="dialog-field">
          <label>${i18n.createUAgent}</label>
          <select id="edit-useragent">
            <option value="">${i18n.createUaDefault}</option>
          </select>
        </div>
        <div class="dialog-field">
          <label>${i18n.createDomains}</label>
          <div class="domain-field-wrapper">
            <ul class="domain-list" id="edit-domain-list"></ul>
            <div class="domain-add-row">
              <input type="text" id="edit-domain-input" placeholder="accounts.google.com" autocomplete="off" spellcheck="false">
              <button type="button" id="edit-domain-add" class="domain-add-btn">+</button>
            </div>
          </div>
        </div>
        <button type="button" class="dialog-field-toggle" id="edit-coi">
          <span class="toggle-switch"></span>
          <span>${i18n.createCoi}</span>
        </button>
        <button type="button" class="dialog-field-toggle" id="edit-single-instance">
          <span class="toggle-switch"></span>
          <span>${i18n.createSingleInstance}</span>
        </button>
        <hr class="dialog-section-divider">
        <div id="edit-info-section"></div>
      </div>
      </div>
      <div class="confirm-actions">
        <button class="btn-cancel" id="edit-cancel">${i18n.createCancel}</button>
        <button class="btn-save" id="edit-save" disabled>${i18n.editSave}</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)

  const uaSelect = document.getElementById('edit-useragent')
  for (const { label, value } of uaPresets) {
    const opt = document.createElement('option')
    opt.value = value
    opt.textContent = label
    uaSelect.appendChild(opt)
  }

  const domainList    = initDomainList('edit-domain-list', 'edit-domain-input', 'edit-domain-add', () => updateSaveBtn())

  let scrollbarInited  = false
  let urlValid         = true
  let widthValid       = true
  let heightValid      = true
  let selectedIconName = ''
  let currentProfile   = ''
  let currentApp       = null
  let onUpdated        = null
  let initialSnapshot  = null

  const urlInput     = document.getElementById('edit-url')
  const urlHint      = document.getElementById('edit-url-hint')
  const saveBtn      = document.getElementById('edit-save')
  const iconPreview  = document.getElementById('edit-icon-preview')
  const iconNameEl   = document.getElementById('edit-icon-name')
  const iconClearBtn = document.getElementById('edit-icon-clear')

  function snapshot() {
    return {
      name:               document.getElementById('edit-name').value.trim(),
      url:                urlInput.value.trim(),
      icon:               selectedIconName,
      width:              document.getElementById('edit-width').value.trim(),
      height:             document.getElementById('edit-height').value.trim(),
      userAgent:          uaSelect.value.trim(),
      internalDomains:    domainList.get().join(','),
      crossOriginIsolation: document.getElementById('edit-coi').classList.contains('active'),
      singleInstance:       document.getElementById('edit-single-instance').classList.contains('active'),
    }
  }

  function isDirty() {
    if (!initialSnapshot) return false
    const cur = snapshot()
    return Object.keys(initialSnapshot).some(k => initialSnapshot[k] !== cur[k])
  }

  function updateSaveBtn() {
    saveBtn.disabled = !(urlValid && widthValid && heightValid && isDirty())
  }

  function validateDimension(inputEl, hintEl, min, max, flagSetter) {
    const val = inputEl.value.trim()
    if (!val) {
      inputEl.className = ''
      hintEl.textContent = ''
      flagSetter(true)
      updateSaveBtn()
      return
    }
    const n = Number(val)
    if (!Number.isInteger(n) || n < min || n > max) {
      inputEl.className = 'invalid'
      hintEl.textContent = tr('validDimRange', { min, max })
      hintEl.className = 'field-hint error'
      flagSetter(false)
    } else {
      inputEl.className = 'valid'
      hintEl.textContent = ''
      hintEl.className = 'field-hint'
      flagSetter(true)
    }
    updateSaveBtn()
  }

  urlInput.addEventListener('input', () => {
    const val = urlInput.value.trim()
    if (!val) {
      urlValid = false
      urlInput.className = ''
      urlHint.textContent = ''
    } else {
      try {
        new URL(val)
        urlValid = true
        urlInput.className = 'valid'
        urlHint.textContent = ''
      } catch {
        urlValid = false
        urlInput.className = 'invalid'
        urlHint.textContent = i18n.validUrl
        urlHint.className = 'field-hint error'
      }
    }
    updateSaveBtn()
  })

  document.getElementById('edit-name').addEventListener('input', updateSaveBtn)
  document.getElementById('edit-width').addEventListener('input', e =>
    validateDimension(e.target, document.getElementById('edit-width-hint'), 400, 7680, v => { widthValid = v })
  )
  document.getElementById('edit-height').addEventListener('input', e =>
    validateDimension(e.target, document.getElementById('edit-height-hint'), 300, 4320, v => { heightValid = v })
  )
  uaSelect.addEventListener('change', updateSaveBtn)
  document.getElementById('edit-coi').addEventListener('click', e => {
    e.currentTarget.classList.toggle('active')
    updateSaveBtn()
  })
  document.getElementById('edit-single-instance').addEventListener('click', e => {
    e.currentTarget.classList.toggle('active')
    updateSaveBtn()
  })

  document.getElementById('edit-icon-btn').addEventListener('click', () => {
    iconPicker.openIconPicker((name, path) => {
      selectedIconName = name
      iconPreview.src = `file://${path}`
      iconNameEl.textContent = name
      iconNameEl.className = ''
      iconClearBtn.style.display = ''
      updateSaveBtn()
    })
  })

  iconClearBtn.addEventListener('click', () => {
    selectedIconName = ''
    iconPreview.src = appDefaultSrc
    iconNameEl.textContent = i18n.createIconChoose
    iconNameEl.className = 'icon-picker-placeholder'
    iconClearBtn.style.display = 'none'
    updateSaveBtn()
  })

  function renderInfoSection(app) {
    const section = document.getElementById('edit-info-section')
    const pathField = (label, value) => `
      <div class="dialog-field">
        <label>${label}</label>
        <div class="dialog-field-path">
          <div class="value">${value}</div>
          <button class="btn-reveal" data-reveal="${value}" data-tooltip="${i18n.infoReveal}">…</button>
        </div>
      </div>`

    if (app.built) {
      section.innerHTML =
        pathField(i18n.infoAppImage,   app.appImagePath) +
        pathField(i18n.infoProfileDir, app.profilePath)
    } else {
      section.innerHTML = `<p style="color:var(--card-url);font-size:0.85em;margin:4px 0 8px">${i18n.infoNotBuilt}</p>`
    }

    section.querySelectorAll('[data-reveal]').forEach(btn =>
      btn.addEventListener('click', () => window.managerAPI.revealPath(btn.dataset.reveal))
    )
  }

  function closeEditDialog() {
    overlay.classList.add('hidden')
  }

  function openEditDialog(app, onUpdatedCallback) {
    currentProfile = app.profile
    currentApp     = app
    onUpdated      = onUpdatedCallback

    document.getElementById('edit-profile-label').textContent = app.profile
    document.getElementById('edit-name').value = app.name || ''
    urlInput.value = app.url || ''
    urlInput.className = app.url ? 'valid' : ''
    urlHint.textContent = ''
    urlHint.className = 'field-hint'
    urlValid = !!app.url

    selectedIconName = app.icon || ''
    if (app.iconPath) {
      iconPreview.src = `file://${app.iconPath}`
      iconNameEl.textContent = app.icon
      iconNameEl.className = ''
      iconClearBtn.style.display = ''
    } else {
      iconPreview.src = appDefaultSrc
      iconNameEl.textContent = i18n.createIconChoose
      iconNameEl.className = 'icon-picker-placeholder'
      iconClearBtn.style.display = 'none'
    }

    document.getElementById('edit-width').value  = app.geometry?.width  || ''
    document.getElementById('edit-height').value = app.geometry?.height || ''
    document.getElementById('edit-width-hint').textContent  = ''
    document.getElementById('edit-height-hint').textContent = ''
    document.getElementById('edit-width').className  = app.geometry?.width  ? 'valid' : ''
    document.getElementById('edit-height').className = app.geometry?.height ? 'valid' : ''
    widthValid  = true
    heightValid = true

    uaSelect.value = app.userAgent || ''
    domainList.set(app.internalDomains || [])

    const coiBtn = document.getElementById('edit-coi')
    if (app.crossOriginIsolation) coiBtn.classList.add('active')
    else coiBtn.classList.remove('active')

    const siBtn = document.getElementById('edit-single-instance')
    if (app.singleInstance) siBtn.classList.add('active')
    else siBtn.classList.remove('active')

    renderInfoSection(app)
    initialSnapshot = snapshot()
    saveBtn.disabled = true

    overlay.classList.remove('hidden')
    if (!scrollbarInited) {
      OverlayScrollbars(document.getElementById('edit-scroll-wrapper'), { scrollbars: { autoHide: 'leave', autoHideDelay: 200 } })
      scrollbarInited = true
    }
    document.getElementById('edit-name').focus()
  }

  overlay.addEventListener('click', e => { if (e.target === overlay) closeEditDialog() })
  document.getElementById('edit-close').addEventListener('click', closeEditDialog)
  document.getElementById('edit-cancel').addEventListener('click', closeEditDialog)
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || overlay.classList.contains('hidden')) return
    if (iconPicker.isOpen()) iconPicker.closeIconPicker()
    else closeEditDialog()
  })

  saveBtn.addEventListener('click', async () => {
    const cur = snapshot()
    saveBtn.disabled = true
    const result = await window.managerAPI.updateApp({ profile: currentProfile, ...cur })
    if (!result.success) { updateSaveBtn(); return }

    closeEditDialog()

    if (currentApp.built) {
      const appName = currentApp.name || currentApp.profile
      const { confirmed, deleteConfig: installAfter } = await showConfirm(
        tr('editRebuildPrompt', { name: appName }),
        {
          okLabel: i18n.editRebuild,
          okClass: 'btn-save',
          ...(currentApp.installed && { toggle: { label: i18n.editInstallAfterBuild, defaultOn: true } }),
        }
      )
      onUpdated?.(result.app, { rebuild: confirmed, install: confirmed && installAfter })
    } else {
      onUpdated?.(result.app, { rebuild: false, install: false })
    }
  })

  return { openEditDialog }
}
