// Electron main process. Loads the Vite dev server during development
// (ELECTRON_START_URL) and the built dist/index.html in production.
//
// Data is stored as JSON files in a shared data directory (see resolveDataDir)
// so multiple machines can point at the same folder on a network share and
// stay in sync. A polling watcher broadcasts external changes to all windows.
const { app, BrowserWindow, shell, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const { createStore } = require('./store.cjs')

/**
 * Resolve the shared data directory, in priority order:
 *  1. TCD_HUB_DATA_DIR environment variable
 *  2. "dataDir" in tcd-hub.config.json placed next to the executable
 *  3. Local per-user fallback: <userData>/data
 * If a configured directory can't be created/accessed, falls back to local.
 */
function resolveDataDir() {
  const candidates = []

  if (process.env.TCD_HUB_DATA_DIR) {
    candidates.push(process.env.TCD_HUB_DATA_DIR)
  }

  const exeDir = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(app.getPath('exe'))
  for (const configDir of [exeDir, path.join(__dirname, '..')]) {
    try {
      const configPath = path.join(configDir, 'tcd-hub.config.json')
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      if (config.dataDir) {
        // Relative paths resolve against the config file's directory.
        candidates.push(path.resolve(configDir, config.dataDir))
        break
      }
    } catch {
      // No config file here — try the next location.
    }
  }

  candidates.push(path.join(app.getPath('userData'), 'data'))

  for (const candidate of candidates) {
    try {
      fs.mkdirSync(candidate, { recursive: true })
      fs.accessSync(candidate, fs.constants.W_OK)
      return candidate
    } catch (err) {
      console.error(`TCD Hub: data dir "${candidate}" is not usable (${err.code}), trying next`)
    }
  }
  throw new Error('No writable data directory available')
}

let store

function broadcast(channel, payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload)
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 900,
    minHeight: 600,
    autoHideMenuBar: true,
    // Avoid a blank white window while the app bundle loads.
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  win.once('ready-to-show', () => win.show())

  // Open external links (e.g. mailto:, https://) in the OS default handler.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  const devServerUrl = process.env.ELECTRON_START_URL
  if (devServerUrl) {
    win.loadURL(devServerUrl)
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

app.whenReady().then(() => {
  store = createStore(resolveDataDir())
  console.log('TCD Hub: using data directory', store.dataDir)

  ipcMain.handle('kv:get', (_event, key) => store.get(key))
  ipcMain.handle('kv:set', (_event, key, value) => store.set(key, value))
  ipcMain.handle('kv:delete', (_event, key) => store.delete(key))
  ipcMain.handle('kv:keys', () => store.keys())
  ipcMain.handle('kv:data-dir', () => store.dataDir)

  store.watch((changedKeys) => broadcast('kv:changed', changedKeys))

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
