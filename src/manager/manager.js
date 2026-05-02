import { OverlayScrollbars } from '../../node_modules/overlayscrollbars/overlayscrollbars.mjs'
import { initDrawer }          from './drawer.js'
import { initBuildOverlay }    from './build-overlay.js'
import { initConfirmDialog }   from './dialogs/confirm.js'
import { initInfoDialog }      from './dialogs/info.js'
import { initProfilesDialog }  from './dialogs/profiles.js'
import { initIconPicker }      from './dialogs/icon-picker.js'
import { initCreateDialog }    from './dialogs/create.js'
import { initAboutDialog }     from './dialogs/about.js'
import { initCards }           from './cards.js'

function toDisplayName(profile) {
  return profile
    .replace(/^private\./, '')
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

const dark = localStorage.getItem('dark') === '1'
if (dark) document.body.classList.add('dark')

const [apps, version, uiIcons, i18n, uaPresets] = await Promise.all([
  window.managerAPI.getApps(),
  window.managerAPI.getVersion(),
  window.managerAPI.getUiIcons(),
  window.managerAPI.getI18n(),
  window.managerAPI.getUaPresets(),
])

const tr = (key, params = {}) =>
  (i18n[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ''))

const s = k => uiIcons[k] ? `file://${uiIcons[k]}` : null
const appDefaultSrc = s('appDefault') ?? '../../assets/wrapweb.svg'

const ctx = {
  i18n, tr, apps, version, toDisplayName, appDefaultSrc, uaPresets,
  icons: {
    sun:          s('sun'),
    moon:         s('moon'),
    info:         s('info'),
    build:        s('build'),
    install:      s('install'),
    delete:       s('delete'),
    menu:         s('menu'),
    filterAll:    s('filterAll'),
    filterPublic: s('filterPublic'),
    filterPrivate: s('filterPrivate'),
    hideFilter:   s('hideFilter'),
    github:       s('github'),
  },
}

const drawer       = initDrawer(ctx)
const buildOverlay = initBuildOverlay(ctx)
const confirm      = initConfirmDialog(ctx)
const info         = initInfoDialog(ctx)
const profiles     = initProfilesDialog(ctx)
const iconPicker   = initIconPicker(ctx)
const about        = initAboutDialog(ctx)

const cards = initCards(ctx, {
  showConfirm:      confirm.showConfirm,
  openInfoDialog:   info.openInfoDialog,
  showBuildOverlay: buildOverlay.showBuildOverlay,
  hideBuildOverlay: buildOverlay.hideBuildOverlay,
})

const createDialog = initCreateDialog(ctx, {
  iconPicker,
  applyVisibility: drawer.applyVisibility,
  createCard:      cards.createCard,
  insertCard:      cards.insertCard,
})

cards.addCard.addEventListener('click', createDialog.openCreateDialog)
document.getElementById('menu-profiles').addEventListener('click', () => {
  profiles.openProfilesDialog()
  drawer.closeDrawer()
})
document.getElementById('menu-about').addEventListener('click', () => {
  about.openAboutDialog()
  drawer.closeDrawer()
})

OverlayScrollbars(document.getElementById('grid-wrapper'), { scrollbars: { autoHide: 'leave', autoHideDelay: 200 } })
drawer.applyInitialFilter()
