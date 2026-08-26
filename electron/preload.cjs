// Exposes the shared file-based KV store to the renderer. All file I/O stays
// in the main process; the renderer only sees an async API.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronKv', {
  get: (key) => ipcRenderer.invoke('kv:get', key),
  set: (key, value) => ipcRenderer.invoke('kv:set', key, value),
  delete: (key) => ipcRenderer.invoke('kv:delete', key),
  keys: () => ipcRenderer.invoke('kv:keys'),
  getDataDir: () => ipcRenderer.invoke('kv:data-dir'),
  onChanged: (callback) => {
    const listener = (_event, changedKeys) => callback(changedKeys)
    ipcRenderer.on('kv:changed', listener)
    return () => ipcRenderer.removeListener('kv:changed', listener)
  },
})
