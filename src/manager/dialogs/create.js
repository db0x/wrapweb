import { initDomainList } from '../domain-list.js'

export function initCreateDialog({ i18n, tr, appDefaultSrc, uaPresets, plugins }, { iconPicker, applyVisibility, createCard, insertCard }) {
  const overlay = document.createElement('div')
  overlay.className = 'dialog-overlay hidden'
  overlay.innerHTML = `
    <div class="dialog">
      <div class="dialog-header">
        <span class="dialog-title">${i18n.createTitle}</span>
        <button class="dialog-close" id="create-close">✕</button>
      </div>
      <div class="dialog-fields">
        <div class="dialog-field">
          <label>${i18n.createProfile} *</label>
          <input type="text" id="create-profile" placeholder="meine-app" autocomplete="off" spellcheck="false">
          <span class="field-hint" id="create-profile-hint"></span>
        </div>
        <div class="dialog-field">
          <label>${i18n.createName}</label>
          <input type="text" id="create-name" placeholder="Meine App">
        </div>
        <div class="dialog-field">
          <label>${i18n.createUrl} *</label>
          <input type="text" id="create-url" placeholder="https://app.example.com" autocomplete="off" spellcheck="false">
          <span class="field-hint" id="create-url-hint"></span>
        </div>
        <div class="dialog-field">
          <label>${i18n.createIcon}</label>
          <div class="icon-picker-row">
            <img id="create-icon-preview" src="${appDefaultSrc}" alt="" class="icon-field-preview">
            <button type="button" id="create-icon-btn" class="icon-picker-btn">
              <span id="create-icon-name" class="icon-picker-placeholder">${i18n.createIconChoose}</span>
            </button>
            <button type="button" id="create-icon-clear" class="icon-clear-btn" style="display:none">✕</button>
          </div>
        </div>
        <hr class="dialog-section-divider">
        <div class="dialog-section-label">${i18n.createAdvanced}</div>
        <div class="dialog-field dialog-field-row">
          <div class="dialog-field">
            <label>${i18n.createWidth}</label>
            <input type="number" id="create-width" placeholder="1280">
            <span class="field-hint" id="create-width-hint"></span>
          </div>
          <div class="dialog-field">
            <label>${i18n.createHeight}</label>
            <input type="number" id="create-height" placeholder="1024">
            <span class="field-hint" id="create-height-hint"></span>
          </div>
        </div>
        <div class="dialog-field">
          <label>${i18n.createUAgent} <span class="field-help" data-tooltip="${i18n.tooltipUAgent}">?</span></label>
          <select id="create-useragent">
            <option value="">${i18n.createUaDefault}</option>
          </select>
        </div>
        <div class="dialog-field">
          <label>${i18n.createDomains} <span class="field-help" data-tooltip="${i18n.tooltipDomains}">?</span></label>
          <div class="domain-field-wrapper">
            <ul class="domain-list" id="create-domain-list"></ul>
            <div class="domain-add-row">
              <input type="text" id="create-domain-input" placeholder="accounts.google.com" autocomplete="off" spellcheck="false">
              <button type="button" id="create-domain-add" class="domain-add-btn">+</button>
            </div>
          </div>
        </div>
        <button type="button" class="dialog-field-toggle" id="create-coi">
          <span class="toggle-switch"></span>
          <span>${i18n.createCoi} <span class="field-help" data-tooltip="${i18n.tooltipCoi}">?</span></span>
        </button>
        <button type="button" class="dialog-field-toggle" id="create-single-instance">
          <span class="toggle-switch"></span>
          <span>${i18n.createSingleInstance} <span class="field-help" data-tooltip="${i18n.tooltipSingleInstance}">?</span></span>
        </button>
        <button type="button" class="dialog-field-toggle" id="create-mail-handler">
          <span class="toggle-switch"></span>
          <span>${i18n.createMailHandler} <span class="field-help" data-tooltip="${i18n.tooltipMailHandler}">?</span></span>
        </button>
        <div class="dialog-field" id="create-plugin-field" style="display:none">
          <label>${i18n.createPlugin} <span class="field-help" data-tooltip="${i18n.tooltipPlugin}">?</span></label>
          <select id="create-plugin">
            <option value="">${i18n.createPluginNone}</option>
          </select>
        </div>
      </div>
      <div class="confirm-actions">
        <button class="btn-cancel" id="create-cancel">${i18n.createCancel}</button>
        <button class="btn-save" id="create-save" disabled>${i18n.createSave}</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)

  const uaSelect = document.getElementById('create-useragent')
  for (const { label, value } of uaPresets) {
    const opt = document.createElement('option')
    opt.value = value
    opt.textContent = label
    uaSelect.appendChild(opt)
  }

  const domainList = initDomainList('create-domain-list', 'create-domain-input', 'create-domain-add', () => {})

  const pluginSelect = document.getElementById('create-plugin')
  for (const { file, label } of (plugins || []).filter(p => p.category === 'mail-handler')) {
    const opt = document.createElement('option')
    opt.value = file
    opt.textContent = label
    pluginSelect.appendChild(opt)
  }

  document.getElementById('create-mail-handler').addEventListener('click', e => {
    e.currentTarget.classList.toggle('active')
    document.getElementById('create-plugin-field').style.display =
      e.currentTarget.classList.contains('active') ? '' : 'none'
    if (!e.currentTarget.classList.contains('active')) pluginSelect.value = ''
  })

  let profileValid = false
  let urlValid     = false
  let widthValid   = true
  let heightValid  = true
  let profileCheckTimer = null
  let selectedIconName  = ''

  const profileInput = document.getElementById('create-profile')
  const profileHint  = document.getElementById('create-profile-hint')
  const urlInput     = document.getElementById('create-url')
  const urlHint      = document.getElementById('create-url-hint')
  const saveBtn      = document.getElementById('create-save')
  const iconPreview  = document.getElementById('create-icon-preview')
  const iconNameEl   = document.getElementById('create-icon-name')
  const iconClearBtn = document.getElementById('create-icon-clear')

  function updateSaveBtn() {
    saveBtn.disabled = !(profileValid && urlValid && widthValid && heightValid)
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

  profileInput.addEventListener('input', () => {
    const val = profileInput.value.trim()
    profileValid = false
    if (!val) {
      profileInput.className = ''
      profileHint.textContent = ''
      clearTimeout(profileCheckTimer)
      updateSaveBtn()
      return
    }
    if (!/^[a-z0-9-]+$/.test(val)) {
      profileInput.className = 'invalid'
      profileHint.textContent = i18n.validPattern
      profileHint.className = 'field-hint error'
      clearTimeout(profileCheckTimer)
      updateSaveBtn()
      return
    }
    clearTimeout(profileCheckTimer)
    profileInput.className = ''
    profileHint.textContent = i18n.validChecking
    profileHint.className = 'field-hint'
    // Debounce the uniqueness check — avoids an IPC round-trip on every keystroke.
    // Guard against stale responses: discard if the input changed while awaiting.
    profileCheckTimer = setTimeout(async () => {
      const exists = await window.managerAPI.checkProfile(val)
      if (profileInput.value.trim() !== val) return
      if (exists) {
        profileInput.className = 'invalid'
        profileHint.textContent = i18n.validExists
        profileHint.className = 'field-hint error'
        profileValid = false
      } else {
        profileInput.className = 'valid'
        profileHint.textContent = tr('validHint', { profile: val })
        profileHint.className = 'field-hint'
        profileValid = true
      }
      updateSaveBtn()
    }, 300)
  })

  urlInput.addEventListener('input', () => {
    const val = urlInput.value.trim()
    if (!val) {
      urlValid = false
      urlInput.className = ''
      urlHint.textContent = ''
      urlHint.className = 'field-hint'
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

  document.getElementById('create-width').addEventListener('input', e =>
    validateDimension(e.target, document.getElementById('create-width-hint'), 400, 7680, v => { widthValid = v })
  )
  document.getElementById('create-height').addEventListener('input', e =>
    validateDimension(e.target, document.getElementById('create-height-hint'), 300, 4320, v => { heightValid = v })
  )
  document.getElementById('create-coi').addEventListener('click', e =>
    e.currentTarget.classList.toggle('active')
  )
  document.getElementById('create-single-instance').addEventListener('click', e =>
    e.currentTarget.classList.toggle('active')
  )

  document.getElementById('create-icon-btn').addEventListener('click', () => {
    iconPicker.openIconPicker((name, path) => {
      selectedIconName = name
      iconPreview.src = `file://${path}`
      iconNameEl.textContent = name
      iconNameEl.className = ''
      iconClearBtn.style.display = ''
    })
  })

  iconClearBtn.addEventListener('click', () => {
    selectedIconName = ''
    iconPreview.src = appDefaultSrc
    iconNameEl.textContent = i18n.createIconChoose
    iconNameEl.className = 'icon-picker-placeholder'
    iconClearBtn.style.display = 'none'
  })

  function openCreateDialog() {
    selectedIconName = ''
    profileInput.value = ''
    profileInput.className = ''
    profileHint.textContent = ''
    profileHint.className = 'field-hint'
    document.getElementById('create-name').value = ''
    urlInput.value = ''
    urlInput.className = ''
    urlHint.textContent = ''
    urlHint.className = 'field-hint'
    iconPreview.src = appDefaultSrc
    iconNameEl.textContent = i18n.createIconChoose
    iconNameEl.className = 'icon-picker-placeholder'
    iconClearBtn.style.display = 'none'
    document.getElementById('create-width').value = ''
    document.getElementById('create-height').value = ''
    document.getElementById('create-useragent').value = ''
    domainList.reset()
    document.getElementById('create-coi').classList.remove('active')
    document.getElementById('create-single-instance').classList.remove('active')
    document.getElementById('create-mail-handler').classList.remove('active')
    document.getElementById('create-plugin-field').style.display = 'none'
    pluginSelect.value = ''
    profileValid = false
    urlValid     = false
    widthValid   = true
    heightValid  = true
    updateSaveBtn()
    overlay.classList.remove('hidden')
    profileInput.focus()
  }

  function closeCreateDialog() {
    clearTimeout(profileCheckTimer)
    overlay.classList.add('hidden')
  }

  overlay.addEventListener('click', e => { if (e.target === overlay) closeCreateDialog() })
  document.getElementById('create-close').addEventListener('click', closeCreateDialog)
  document.getElementById('create-cancel').addEventListener('click', closeCreateDialog)
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return
    if (iconPicker.isOpen()) iconPicker.closeIconPicker()
    else closeCreateDialog()
  })

  saveBtn.addEventListener('click', async () => {
    const profile             = profileInput.value.trim()
    const name                = document.getElementById('create-name').value.trim()
    const url                 = urlInput.value.trim()
    const icon                = selectedIconName
    const width               = document.getElementById('create-width').value.trim()
    const height              = document.getElementById('create-height').value.trim()
    const userAgent           = document.getElementById('create-useragent').value.trim()
    const internalDomains     = domainList.get().join(', ')
    const crossOriginIsolation = document.getElementById('create-coi').classList.contains('active')
    const singleInstance       = document.getElementById('create-single-instance').classList.contains('active')
    const mailHandler          = document.getElementById('create-mail-handler').classList.contains('active')
    const mailtoJs             = pluginSelect.value
    saveBtn.disabled = true
    const result = await window.managerAPI.createApp({ profile, name, url, icon, width, height, userAgent, internalDomains, crossOriginIsolation, singleInstance, mailHandler, mailtoJs })
    if (result.success) {
      closeCreateDialog()
      insertCard(createCard(result.app))
      applyVisibility()
    } else {
      updateSaveBtn()
    }
  })

  return { openCreateDialog }
}
