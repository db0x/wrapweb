const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('managerAPI', {
  getApps:    () => ipcRenderer.invoke('manager:apps'),
  getVersion: () => ipcRenderer.invoke('manager:version'),
  getUiIcons: () => ipcRenderer.invoke('manager:ui-icons'),
})
