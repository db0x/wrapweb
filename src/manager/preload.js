const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('managerAPI', {
  getApps:    () => ipcRenderer.invoke('manager:apps'),
  getVersion: () => ipcRenderer.invoke('manager:version'),
  getUiIcons: () => ipcRenderer.invoke('manager:ui-icons'),
  buildApp:   (profile) => ipcRenderer.invoke('manager:build',   profile),
  installApp: (profile) => ipcRenderer.invoke('manager:install', profile),
  deleteApp:  (profile) => ipcRenderer.invoke('manager:delete',  profile),
  launchApp:  (profile) => ipcRenderer.invoke('manager:launch',  profile),
})
