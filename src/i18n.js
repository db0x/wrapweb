const { app } = require('electron')

const translations = {
  de: { cut: 'Ausschneiden', copy: 'Kopieren', paste: 'Einfügen', saveAs: 'Speichern unter…', noSuggestions: 'Keine Vorschläge' },
  en: { cut: 'Cut',          copy: 'Copy',     paste: 'Paste',     saveAs: 'Save As…',        noSuggestions: 'No suggestions'   },
}

function t() {
  const lang = app.getLocale().split('-')[0].toLowerCase()
  return translations[lang] ?? translations.en
}

module.exports = { t }
