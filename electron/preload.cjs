// Exposes the shared file-based KV store to the renderer. All file I/O stays
// in the main process; the renderer only sees an async API.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronKv', {
  get: (key) => ipcRenderer.invoke('kv:get', key),
  set: (key, value) => ipcRenderer.invoke('kv:set', key, value),
  delete: (key) => ipcRenderer.invoke('kv:delete', key),
  keys: () => ipcRenderer.invoke('kv:keys'),
  update: (key, operation) => ipcRenderer.invoke('kv:update', key, operation),
  getDataDir: () => ipcRenderer.invoke('kv:data-dir'),
  getStorageInfo: () => ipcRenderer.invoke('kv:storage-info'),
  chooseDataDir: () => ipcRenderer.invoke('kv:choose-data-dir'),
  onChanged: (callback) => {
    const listener = (_event, changedKeys) => callback(changedKeys)
    ipcRenderer.on('kv:changed', listener)
    return () => ipcRenderer.removeListener('kv:changed', listener)
  },
})

contextBridge.exposeInMainWorld('electronUpdates', {
  getStatus: () => ipcRenderer.invoke('updates:status'),
  check: () => ipcRenderer.invoke('updates:check'),
  history: () => ipcRenderer.invoke('updates:history'),
  selectZip: () => ipcRenderer.invoke('updates:select-zip'),
  publish: (payload) => ipcRenderer.invoke('updates:publish', payload),
  install: (version) => ipcRenderer.invoke('updates:install', version ? { version } : undefined),
  onUpdateAvailable: (callback) => {
    const listener = (_event, manifest) => callback(manifest)
    ipcRenderer.on('updates:available', listener)
    return () => ipcRenderer.removeListener('updates:available', listener)
  },
  onProgress: (callback) => {
    const listener = (_event, progress) => callback(progress)
    ipcRenderer.on('updates:progress', listener)
    return () => ipcRenderer.removeListener('updates:progress', listener)
  },
  onPublishProgress: (callback) => {
    const listener = (_event, progress) => callback(progress)
    ipcRenderer.on('updates:publish-progress', listener)
    return () => ipcRenderer.removeListener('updates:publish-progress', listener)
  },
})

contextBridge.exposeInMainWorld('electronGuides', {
  chooseExportDir: () => ipcRenderer.invoke('guides:choose-export-dir'),
  exportDocx: (payload) => ipcRenderer.invoke('guides:export-docx', payload),
})

contextBridge.exposeInMainWorld('electronTranslation', {
  workerAssets: () => ipcRenderer.invoke('translation:worker-assets'),
  registry: () => ipcRenderer.invoke('translation:registry'),
  modelFiles: (pair) => ipcRenderer.invoke('translation:model-files', pair),
})
