const { app } = require('electron')

const translations = {
  de: { cut: 'Ausschneiden', copy: 'Kopieren', paste: 'Einfügen', saveAs: 'Speichern unter…' },
  en: { cut: 'Cut',          copy: 'Copy',     paste: 'Paste',     saveAs: 'Save As…'        },
}

function t() {
  const lang = app.getLocale().split('-')[0].toLowerCase()
  return translations[lang] ?? translations.en
}

module.exports = { t }
