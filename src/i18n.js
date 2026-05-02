const { app } = require('electron')

const translations = {
  de: {
    // Context menu
    cut: 'Ausschneiden', copy: 'Kopieren', paste: 'Einfügen',
    saveAs: 'Speichern unter…', noSuggestions: 'Keine Vorschläge',

    // Drawer
    drawerAppearance:      'Darstellung',
    drawerLightMode:       'Light Mode',
    drawerDarkMode:        'Dark Mode',
    drawerVisibility:      'Sichtbarkeit',
    drawerAllApps:         'Alle Apps',
    drawerEmbeddedApps:    'Embedded Apps',
    drawerUserApps:        'Benutzer Apps',
    drawerHideUninstalled: 'Nicht installierte ausblenden',

    // Badges
    badgeBuilt:     'Gebaut',
    badgeNotBuilt:  'Nicht gebaut',
    badgeInstalled: 'Installiert',
    badgeUser:      'Benutzer',

    // Toolbar buttons
    btnInfo:    'Informationen',
    btnBuild:   'Bauen',
    btnRebuild: 'Neu bauen',
    btnInstall: 'Installieren',
    btnDelete:  'Löschen',

    // Confirm dialog
    confirmCancel:       'Abbrechen',
    confirmDelete:       'Löschen',
    confirmDeleteMsg:    '<p>App-Image und Desktop-Eintrag für <strong>{name}</strong> wirklich löschen?</p><p>Das Profil-Verzeichnis bleibt erhalten.</p>',
    confirmDeleteConfig: 'Konfiguration löschen',

    // Build overlay
    buildingApp: 'Baut {name} …',

    // Info dialog
    infoUrl:        'URL',
    infoProfile:    'Profil',
    infoIcon:       'Icon',
    infoGeometry:   'Fenstergröße',
    infoUserAgent:  'User-Agent',
    infoDomains:    'Interne Domains',
    infoCoi:        'Cross-Origin Isolation',
    infoCoiYes:     'Ja',
    infoAppImage:   'App-Image',
    infoProfileDir: 'Profil-Ordner',
    infoNotBuilt:   'App ist nicht gebaut.',
    infoReveal:     'Im Dateimanager öffnen',

    // Create dialog
    createTitle:    'Neue WebApp hinzufügen',
    createProfile:  'Profil',
    createName:     'Name',
    createUrl:      'URL',
    createIcon:     'Icon (GNOME-Theme)',
    createAdvanced: 'Erweitert (optional)',
    createWidth:    'Breite (px)',
    createHeight:   'Höhe (px)',
    createUAgent:   'User-Agent',
    createDomains:  'Interne Domains (kommagetrennt)',
    createCoi:      'Cross-Origin Isolation (SharedArrayBuffer / WASM)',
    createCancel:   'Abbrechen',
    createSave:     'Speichern',
    createUaDefault:'— Standard (nicht gesetzt) —',

    // Validation
    validPattern:  'Nur Kleinbuchstaben, Ziffern und Bindestriche',
    validExists:   'Profil existiert bereits',
    validHint:     '→ build.private.{profile}.json',
    validChecking: '…',
    validUrl:      'Keine gültige URL',
    validDimRange: '{min}–{max} px',

    // Icon picker
    createIconChoose:  'Icon wählen …',
    iconPickerSearch:  'Suchen …',
    iconPickerLoading: 'Lädt Icons …',

    // About dialog
    drawerAbout:       'Über wrapweb',
    aboutLicense:      'MIT-Lizenz',
    aboutGithub:       'wrapweb bei GitHub',

    // Profile sizes dialog
    drawerProfiles:    'Profile',
    profilesTitle:     'Profil-Verzeichnisse',
    profilesTotal:     'Gesamt',
    profilesEmpty:     'Kein Datenverzeichnis vorhanden',
  },

  en: {
    // Context menu
    cut: 'Cut', copy: 'Copy', paste: 'Paste',
    saveAs: 'Save As…', noSuggestions: 'No suggestions',

    // Drawer
    drawerAppearance:      'Appearance',
    drawerLightMode:       'Light Mode',
    drawerDarkMode:        'Dark Mode',
    drawerVisibility:      'Visibility',
    drawerAllApps:         'All Apps',
    drawerEmbeddedApps:    'Embedded Apps',
    drawerUserApps:        'User Apps',
    drawerHideUninstalled: 'Hide uninstalled',

    // Badges
    badgeBuilt:     'Built',
    badgeNotBuilt:  'Not built',
    badgeInstalled: 'Installed',
    badgeUser:      'User',

    // Toolbar buttons
    btnInfo:    'Information',
    btnBuild:   'Build',
    btnRebuild: 'Rebuild',
    btnInstall: 'Install',
    btnDelete:  'Delete',

    // Confirm dialog
    confirmCancel:       'Cancel',
    confirmDelete:       'Delete',
    confirmDeleteMsg:    '<p>Really delete AppImage and desktop entry for <strong>{name}</strong>?</p><p>The profile directory will be kept.</p>',
    confirmDeleteConfig: 'Delete configuration',

    // Build overlay
    buildingApp: 'Building {name} …',

    // Info dialog
    infoUrl:        'URL',
    infoProfile:    'Profile',
    infoIcon:       'Icon',
    infoGeometry:   'Window size',
    infoUserAgent:  'User-Agent',
    infoDomains:    'Internal domains',
    infoCoi:        'Cross-Origin Isolation',
    infoCoiYes:     'Yes',
    infoAppImage:   'App image',
    infoProfileDir: 'Profile directory',
    infoNotBuilt:   'App is not built.',
    infoReveal:     'Open in file manager',

    // Create dialog
    createTitle:    'Add new WebApp',
    createProfile:  'Profile',
    createName:     'Name',
    createUrl:      'URL',
    createIcon:     'Icon (GNOME theme)',
    createAdvanced: 'Advanced (optional)',
    createWidth:    'Width (px)',
    createHeight:   'Height (px)',
    createUAgent:   'User-Agent',
    createDomains:  'Internal domains (comma-separated)',
    createCoi:      'Cross-Origin Isolation (SharedArrayBuffer / WASM)',
    createCancel:   'Cancel',
    createSave:     'Save',
    createUaDefault:'— Default (not set) —',

    // Validation
    validPattern:  'Only lowercase letters, digits and hyphens',
    validExists:   'Profile already exists',
    validHint:     '→ build.private.{profile}.json',
    validChecking: '…',
    validUrl:      'Not a valid URL',
    validDimRange: '{min}–{max} px',

    // Icon picker
    createIconChoose:  'Choose icon …',
    iconPickerSearch:  'Search …',
    iconPickerLoading: 'Loading icons …',

    // About dialog
    drawerAbout:       'About wrapweb',
    aboutLicense:      'MIT License',
    aboutGithub:       'wrapweb on GitHub',

    // Profile sizes dialog
    drawerProfiles:    'Profiles',
    profilesTitle:     'Profile directories',
    profilesTotal:     'Total',
    profilesEmpty:     'No data directory',
  },
}

function t() {
  const lang = (process.env.WRAPWEB_LANG ?? app.getLocale()).split('-')[0].toLowerCase()
  return translations[lang] ?? translations.en
}

module.exports = { t }
