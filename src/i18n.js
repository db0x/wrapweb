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
    drawerMicrosoft:       'Microsoft Apps',
    drawerGoogle:          'Google Apps',
    drawerHideUninstalled: 'Nicht installierte ausblenden',

    // Badges
    badgeBuilt:       'Gebaut',
    badgeNotBuilt:    'Nicht gebaut',
    badgeInstalled:   'Installiert',
    badgeUser:        'Benutzer',
    badgeMailHandler: 'Mail-Handler',

    // Toolbar buttons
    btnInfo:           'Informationen',
    btnEdit:           'Bearbeiten',
    btnBuild:          'AppImage erzeugen',
    btnRebuild:        'AppImage neu erstellen',
    btnInstall:           'Installieren',
    btnInstallTooltip:    '{name} als Applikation im System installieren',
    btnReinstallTooltip:  '{name} neu installieren',
    btnDelete:            'Löschen',

    // Confirm dialog
    confirmCancel:       'Abbrechen',
    confirmDelete:       'Löschen',
    confirmDeleteMsg:    '<p>App-Image und Desktop-Eintrag für <strong>{name}</strong> wirklich löschen?</p><p>Das Profil-Verzeichnis bleibt erhalten.</p>',
    confirmDeleteConfig:      'Konfiguration löschen',
    confirmDeleteProfileData: 'Profil-Daten löschen (Cookies, Sessions, lokale Daten)',

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

    // Edit dialog
    editTitle:             'App bearbeiten',
    editSave:              'Speichern',
    editRebuildPrompt:     '<p>Konfiguration von <strong>{name}</strong> gespeichert.</p><p>AppImage jetzt neu erstellen?</p>',
    editRebuild:           'Neu bauen',
    editInstallAfterBuild: 'Nach dem Bauen installieren',

    // Install confirm
    installConfirmMsg:       '<p><strong>{name}</strong> als Applikation im System installieren?</p>',
    installConfirmOk:        'Installieren',
    installSetMailHandler:   'Als Standard-Mail-Handler registrieren',

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
    createDomains:  'Interne Domains',
    createCoi:            'Cross-Origin Isolation (SharedArrayBuffer / WASM)',
    createSingleInstance: 'Nur eine Instanz erlauben',
    createMailHandler:    'Als Mail-Handler registrieren',
    createPlugin:         'Plugin',
    createPluginNone:     '— kein Plugin —',
    createCancel:         'Abbrechen',
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
    profilesDeleteConfirm: '<p>Profildaten von <strong>{name}</strong> wirklich löschen?</p><p>Cookies, Login-Sessions und lokale Daten gehen verloren. Die App bleibt installiert.</p>',
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
    drawerMicrosoft:       'Microsoft Apps',
    drawerGoogle:          'Google Apps',
    drawerHideUninstalled: 'Hide uninstalled',

    // Badges
    badgeBuilt:       'Built',
    badgeNotBuilt:    'Not built',
    badgeInstalled:   'Installed',
    badgeUser:        'User',
    badgeMailHandler: 'Mail handler',

    // Toolbar buttons
    btnInfo:           'Information',
    btnEdit:           'Edit',
    btnBuild:          'Create AppImage',
    btnRebuild:        'Rebuild AppImage',
    btnInstall:           'Install',
    btnInstallTooltip:    'Install {name} as system application',
    btnReinstallTooltip:  'Reinstall {name}',
    btnDelete:            'Delete',

    // Confirm dialog
    confirmCancel:       'Cancel',
    confirmDelete:       'Delete',
    confirmDeleteMsg:    '<p>Really delete AppImage and desktop entry for <strong>{name}</strong>?</p><p>The profile directory will be kept.</p>',
    confirmDeleteConfig:      'Delete configuration',
    confirmDeleteProfileData: 'Delete profile data (cookies, sessions, local data)',

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

    // Edit dialog
    editTitle:             'Edit app',
    editSave:              'Save',
    editRebuildPrompt:     '<p>Configuration of <strong>{name}</strong> saved.</p><p>Rebuild the AppImage now?</p>',
    editRebuild:           'Rebuild',
    editInstallAfterBuild: 'Install after build',

    // Install confirm
    installConfirmMsg:       '<p>Install <strong>{name}</strong> as a system application?</p>',
    installConfirmOk:        'Install',
    installSetMailHandler:   'Register as default mail handler',

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
    createDomains:  'Internal domains',
    createCoi:            'Cross-Origin Isolation (SharedArrayBuffer / WASM)',
    createSingleInstance: 'Allow only one instance',
    createMailHandler:    'Register as mail handler',
    createPlugin:         'Plugin',
    createPluginNone:     '— no plugin —',
    createCancel:         'Cancel',
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
    profilesDeleteConfirm: '<p>Really delete profile data for <strong>{name}</strong>?</p><p>Cookies, login sessions and local data will be lost. The app remains installed.</p>',
  },
}

function t() {
  const lang = (process.env.WRAPWEB_LANG ?? app.getLocale()).split('-')[0].toLowerCase()
  return translations[lang] ?? translations.en
}

module.exports = { t }
