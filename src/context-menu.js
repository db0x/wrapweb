const { Menu, dialog, app } = require('electron')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { t } = require('./i18n')

function aspellSuggestions(word) {
  const preferred = app.getPreferredSystemLanguages().map(l => l.split('-')[0])
  const langs = [...new Set([...preferred, 'en'])]
  for (const lang of langs) {
    const r = spawnSync('aspell', ['-l', lang, '-a'], {
      input: word + '\n',
      encoding: 'utf8',
      timeout: 500,
    })
    if (r.stdout) {
      const match = r.stdout.match(/^& \S+ \d+ \d+: (.+)$/m)
      if (match) return match[1].split(', ').slice(0, 6)
    }
  }
  return []
}

function showContextMenu(mainWindow, customSession, params) {
  const i18n = t()
  const template = []

  if (params.misspelledWord) {
    const corrections = params.spellingCorrections?.length
      ? params.spellingCorrections
      : aspellSuggestions(params.misspelledWord)

    if (corrections.length > 0) {
      for (const suggestion of corrections) {
        template.push({
          label: suggestion,
          click: () => mainWindow.webContents.replaceMisspelling(suggestion),
        })
      }
    } else {
      template.push({ label: i18n.noSuggestions, enabled: false })
    }
    template.push({ type: 'separator' })
  }

  template.push(
    { role: 'cut',   label: i18n.cut   },
    { role: 'copy',  label: i18n.copy  },
    { role: 'paste', label: i18n.paste },
  )

  if (params.mediaType === 'image' && params.srcURL) {
    let defaultName = 'image.jpg'
    try {
      const name = path.basename(new URL(params.srcURL).pathname)
      if (name && path.extname(name)) defaultName = name
      else if (name)                  defaultName = name + '.jpg'
    } catch {}

    template.push({ type: 'separator' })
    template.push({
      label: i18n.saveAs,
      click: async () => {
        const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
          defaultPath: defaultName,
        })
        if (!canceled && filePath) {
          customSession.prependOnceListener('will-download', (_e, item) => item.setSavePath(filePath))
          mainWindow.webContents.downloadURL(params.srcURL)
        }
      },
    })
  }

  Menu.buildFromTemplate(template).popup({ window: mainWindow })
}

module.exports = { showContextMenu }
