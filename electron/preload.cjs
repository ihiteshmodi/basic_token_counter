const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('tokenBridge', {
  getData: () => ipcRenderer.invoke('token:get-data'),
  setData: (data) => ipcRenderer.invoke('token:set-data', data),
  setSize: (width, height) => ipcRenderer.invoke('window:set-size', { width, height }),
})
