// Discovers the main-process plugins shipped under webapps/plugins, so the create/edit
// dialogs can offer them for per-app selection. A plugin is the entry file of a plugin
// directory, named after that directory: plugins/<name>/<name>.js (e.g. onedrive/onedrive.js).
// Any other .js in the directory is a helper module (e.g. widget/move-overlay.js) and is NOT a
// selectable plugin — that's why we don't just list every .js. The returned `file` is the path
// relative to webapps/, exactly what an app config's `plugins` array stores and the loader resolves.

const { ipcMain } = require('electron')
const path = require('node:path')
const fs   = require('node:fs')

const { CONFIGS_DIR } = require('../lib/paths')

// Collects each plugin directory's entry file (<dir>/<dir>.js), webapps-relative. One level of
// nesting; helper files alongside the entry are ignored.
function collectPluginFiles(pluginsDir, baseDir, out) {
  for (const entry of fs.readdirSync(pluginsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const entryFile = path.join(pluginsDir, entry.name, `${entry.name}.js`)
    if (fs.existsSync(entryFile)) out.push(path.relative(baseDir, entryFile))
  }
}

// Reads a plugin's optional plugin.svg (sibling of the .js file) as a data URL so the
// dialog can show it without a file:// path. Returns null when the plugin ships no icon.
function pluginIconDataUrl(relFile) {
  const svg = path.join(CONFIGS_DIR, path.dirname(relFile), 'plugin.svg')
  try {
    return `data:image/svg+xml;base64,${fs.readFileSync(svg).toString('base64')}`
  } catch { return null }
}

module.exports = function registerPluginHandlers() {
  ipcMain.handle('manager:plugins', () => {
    const pluginsDir = path.join(CONFIGS_DIR, 'plugins')
    if (!fs.existsSync(pluginsDir)) return []
    const files = []
    collectPluginFiles(pluginsDir, CONFIGS_DIR, files)
    // Label from the filename without extension — e.g. "plugins/onedrive/onedrive.js" → "onedrive".
    // A leading "private." (the gitignored-private naming convention) is dropped from the
    // label only; the stored `file` path keeps it so the loader still resolves the real file.
    return files
      .map(file => ({
        file,
        label: path.basename(file).replace(/\.js$/, '').replace(/^private\./, ''),
        icon:  pluginIconDataUrl(file),
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  })
}
