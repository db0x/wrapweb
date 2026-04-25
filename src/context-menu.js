const { Menu, dialog } = require('electron')
const path = require('node:path')
const { t } = require('./i18n')

function showContextMenu(mainWindow, customSession, params) {
  const i18n = t()
  const template = [
    { role: 'cut',   label: i18n.cut   },
    { role: 'copy',  label: i18n.copy  },
    { role: 'paste', label: i18n.paste },
  ]

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
          customSession.once('will-download', (_e, item) => item.setSavePath(filePath))
          mainWindow.webContents.downloadURL(params.srcURL)
        }
      },
    })
  }

  Menu.buildFromTemplate(template).popup({ window: mainWindow })
}

module.exports = { showContextMenu }
