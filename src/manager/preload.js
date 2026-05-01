const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('managerAPI', {
  getApps:      () => ipcRenderer.invoke('manager:apps'),
  getVersion:   () => ipcRenderer.invoke('manager:version'),
  getUiIcons:   () => ipcRenderer.invoke('manager:ui-icons'),
  getI18n:      () => ipcRenderer.invoke('manager:i18n'),
  getUaPresets: () => ipcRenderer.invoke('manager:ua-presets'),
  buildApp:   (profile) => ipcRenderer.invoke('manager:build',   profile),
  installApp: (profile) => ipcRenderer.invoke('manager:install', profile),
  deleteApp:    (params)  => ipcRenderer.invoke('manager:delete',       params),
  launchApp:    (profile) => ipcRenderer.invoke('manager:launch',       profile),
  revealPath:   (p)       => ipcRenderer.invoke('manager:reveal-path',    p),
  checkProfile: (profile) => ipcRenderer.invoke('manager:check-profile', profile),
  createApp:    (data)    => ipcRenderer.invoke('manager:create-app',    data),
  getAllIcons:   ()        => ipcRenderer.invoke('manager:all-icons'),
})
