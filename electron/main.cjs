// Electron main process. Loads the Vite dev server during development
// (ELECTRON_START_URL) and the built dist/index.html in production.
//
// Data is stored as JSON files in a shared data directory (see resolveDataDir)
// so multiple machines can point at the same folder on a network share and
// stay in sync. A polling watcher broadcasts external changes to all windows.
const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { createStore } = require('./store.cjs')
const updater = require('./updater.cjs')

// Brugerens mappevalg fra Manager Panel gemmes her og overlever opdateringer.
function userConfigPath() {
  return path.join(app.getPath('userData'), 'storage-config.json')
}

/**
 * Resolve the shared data directory, in priority order:
 *  1. TCD_HUB_DATA_DIR environment variable
 *  2. "dataDir" in tcd-hub.config.json placed next to the executable
 *  3. Folder chosen in the app (Manager Panel), stored in userData
 *  4. Local per-user fallback: <userData>/data
 * If a configured directory can't be created/accessed, falls back to local.
 */
function resolveDataDir() {
  const candidates = []

  if (process.env.TCD_HUB_DATA_DIR) {
    candidates.push({ dir: process.env.TCD_HUB_DATA_DIR, source: 'env' })
  }

  const exeDir = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(app.getPath('exe'))
  for (const configDir of [exeDir, path.join(__dirname, '..')]) {
    try {
      const configPath = path.join(configDir, 'tcd-hub.config.json')
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      if (config.dataDir) {
        // Relative paths resolve against the config file's directory.
        candidates.push({ dir: path.resolve(configDir, config.dataDir), source: 'config' })
        break
      }
    } catch {
      // No config file here — try the next location.
    }
  }

  try {
    const userConfig = JSON.parse(fs.readFileSync(userConfigPath(), 'utf8'))
    if (userConfig.dataDir) {
      candidates.push({ dir: userConfig.dataDir, source: 'user' })
    }
  } catch {
    // No user-chosen folder yet.
  }

  candidates.push({ dir: path.join(app.getPath('userData'), 'data'), source: 'default' })

  for (const candidate of candidates) {
    try {
      fs.mkdirSync(candidate.dir, { recursive: true })
      fs.accessSync(candidate.dir, fs.constants.W_OK)
      return candidate
    } catch (err) {
      console.error(`TCD Hub: data dir "${candidate.dir}" is not usable (${err.code}), trying next`)
    }
  }
  throw new Error('No writable data directory available')
}

let store
let dataDirSource = 'default'
let stopWatcher = null
let updateCheckTimer = null
let updateInProgress = false

const UPDATE_CHECK_INTERVAL = 15 * 60 * 1000

/** Tjekker manifestet i den fælles mappe og notificerer alle vinduer ved ny version. */
function checkForUpdates() {
  try {
    // Undgå at afbryde en opdatering, der allerede henter i baggrunden.
    if (updateInProgress) return null
    const manifest = updater.readManifest(store.dataDir)
    if (manifest && updater.isNewerVersion(manifest.version, app.getVersion())) {
      broadcast('updates:available', manifest)
      return manifest
    }
    return null
  } catch (err) {
    console.error('TCD Hub: update check failed', err)
    return null
  }
}

function startWatcher() {
  if (stopWatcher) stopWatcher()
  stopWatcher = store.watch((changedKeys) => broadcast('kv:changed', changedKeys))
}

// --- Automatisk daglig backup -------------------------------------------
// Skriver hele storen (dekrypteret) til <datamappe>/Backup/tcd-hub-auto-backup-YYYY-MM-DD.json.
// Exclusive create ('wx') sikrer at kun én af de delte klienter skriver dagens fil.
const AUTO_BACKUP_KEEP = 14
const AUTO_BACKUP_CHECK_INTERVAL = 60 * 60 * 1000
let autoBackupTimer = null

function runAutoBackup() {
  try {
    const backupDir = path.join(store.dataDir, 'Backup')
    fs.mkdirSync(backupDir, { recursive: true })
    const today = new Date().toISOString().slice(0, 10)
    const target = path.join(backupDir, `tcd-hub-auto-backup-${today}.json`)
    if (fs.existsSync(target)) return

    const payload = JSON.stringify({
      app: 'tcd-hub',
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      auto: true,
      data: store.dumpAll(),
    }, null, 2)

    let fd
    try {
      fd = fs.openSync(target, 'wx')
    } catch (err) {
      if (err.code === 'EEXIST') return // En anden klient nåede det først.
      throw err
    }
    try {
      fs.writeSync(fd, payload)
    } finally {
      fs.closeSync(fd)
    }
    console.log(`TCD Hub: automatisk backup skrevet: ${target}`)

    // Rotation: behold de nyeste AUTO_BACKUP_KEEP auto-backups.
    const autoBackups = fs.readdirSync(backupDir)
      .filter((name) => /^tcd-hub-auto-backup-\d{4}-\d{2}-\d{2}\.json$/.test(name))
      .sort()
    for (const name of autoBackups.slice(0, Math.max(0, autoBackups.length - AUTO_BACKUP_KEEP))) {
      try { fs.unlinkSync(path.join(backupDir, name)) } catch {}
    }
  } catch (err) {
    console.error('TCD Hub: automatisk backup fejlede', err)
  }
}

function startAutoBackup() {
  if (autoBackupTimer) clearInterval(autoBackupTimer)
  runAutoBackup()
  // Timetjek dækker både midnat og klienter, der bare får lov at køre.
  autoBackupTimer = setInterval(runAutoBackup, AUTO_BACKUP_CHECK_INTERVAL)
  autoBackupTimer.unref?.()
}

/** Kopierer alle datafiler til den nye mappe og skifter storen over. */
function switchDataDir(newDir) {
  const oldDir = store.dataDir
  if (path.resolve(newDir) === path.resolve(oldDir)) {
    return { dataDir: oldDir, migratedFiles: 0 }
  }

  fs.mkdirSync(newDir, { recursive: true })
  fs.accessSync(newDir, fs.constants.W_OK)

  let migratedFiles = 0
  for (const name of fs.readdirSync(oldDir)) {
    if (!name.endsWith('.json')) continue
    // Eksisterende filer i målmappen bevares — den nye mappe kan allerede
    // være i brug af andre klienter.
    const target = path.join(newDir, name)
    if (!fs.existsSync(target)) {
      fs.copyFileSync(path.join(oldDir, name), target)
      migratedFiles++
    }
  }

  fs.writeFileSync(userConfigPath(), JSON.stringify({ dataDir: newDir }, null, 2))

  store = createStore(newDir)
  dataDirSource = 'user'
  startWatcher()
  startAutoBackup()

  // Alle keys kan have ændret sig — bed alle vinduer om at genindlæse.
  broadcast('kv:changed', store.keys())
  return { dataDir: newDir, migratedFiles }
}

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

  // No app menu (autoHideMenuBar) means the usual DevTools accelerators may not
  // be registered — bind F12 / Ctrl+Shift+I explicitly so support/debugging works.
  win.webContents.on('before-input-event', (_event, input) => {
    const isF12 = input.key === 'F12'
    const isCtrlShiftI = input.control && input.shift && input.key.toLowerCase() === 'i'
    if (isF12 || isCtrlShiftI) {
      win.webContents.toggleDevTools()
    }
  })

  const devServerUrl = process.env.ELECTRON_START_URL
  if (devServerUrl) {
    win.loadURL(devServerUrl)
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

app.whenReady().then(() => {
  const resolved = resolveDataDir()
  store = createStore(resolved.dir)
  dataDirSource = resolved.source
  console.log('TCD Hub: using data directory', store.dataDir)

  ipcMain.handle('kv:get', (_event, key) => store.get(key))
  ipcMain.handle('kv:set', (_event, key, value) => store.set(key, value))
  ipcMain.handle('kv:delete', (_event, key) => store.delete(key))
  ipcMain.handle('kv:keys', () => store.keys())
  // Atomar array-opdatering under fil-lås; broadcast med det samme så dette
  // vindues useKV-abonnenter opdaterer uden at vente på 2s-polleren.
  ipcMain.handle('kv:update', (_event, key, operation) => {
    const result = store.update(key, operation)
    broadcast('kv:changed', [key])
    return result
  })
  ipcMain.handle('kv:data-dir', () => store.dataDir)
  ipcMain.handle('kv:storage-info', () => ({ dataDir: store.dataDir, source: dataDirSource }))
  ipcMain.handle('kv:choose-data-dir', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win, {
      title: 'Vælg mappe til appens data',
      buttonLabel: 'Brug denne mappe',
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: store.dataDir,
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return switchDataDir(result.filePaths[0])
  })

  ipcMain.handle('guides:choose-export-dir', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win, {
      title: 'Vælg rodmappe til guidebiblioteket',
      buttonLabel: 'Brug denne mappe',
      properties: ['openDirectory', 'createDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // --- Neural oversættelse (Bergamot) -------------------------------------
  // Worker/WASM ligger i dist/translation (inde i app.asar); modellerne ligger
  // i den delte datamappe, så én download tjener alle klienter.

  // Renderer kører under file:// hvor fetch() er blokeret — filerne læses derfor her.
  ipcMain.handle('translation:worker-assets', () => {
    const assetDir = path.join(__dirname, '..', 'dist', 'translation')
    try {
      return {
        workerJs: fs.readFileSync(path.join(assetDir, 'translator-worker.js'), 'utf8'),
        glueJs: fs.readFileSync(path.join(assetDir, 'bergamot-translator-worker.js'), 'utf8'),
        wasm: fs.readFileSync(path.join(assetDir, 'bergamot-translator-worker.wasm')).buffer,
      }
    } catch (err) {
      throw new Error(`Oversættelsesfiler mangler i "${assetDir}" (${err.code || err.message}) — bygget uden dist/translation?`)
    }
  })

  // Registry: scanner <datamappe>/translation-models/ for sprogpar-mapper (fx 'daen', 'enda').
  ipcMain.handle('translation:registry', () => {
    const modelsDir = path.join(store.dataDir, 'translation-models')
    if (!fs.existsSync(modelsDir)) return []
    return fs.readdirSync(modelsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^[a-z]{4}$/.test(entry.name))
      .map((entry) => ({ from: entry.name.slice(0, 2), to: entry.name.slice(2, 4) }))
  })

  // Modelfiler for ét sprogpar: model*.bin, lex*.bin (shortlist), vocab*.spm.
  ipcMain.handle('translation:model-files', (_event, pair) => {
    if (!/^[a-z]{4}$/.test(String(pair))) throw new Error(`Ugyldigt sprogpar: ${pair}`)
    const dir = path.join(store.dataDir, 'translation-models', pair)
    const names = fs.readdirSync(dir)
    const find = (pattern) => {
      const name = names.find((n) => pattern.test(n))
      if (!name) throw new Error(`Manglende modelfil (${pattern}) i ${dir}`)
      return fs.readFileSync(path.join(dir, name)).buffer
    }
    const modelName = names.find((n) => /^model.*\.bin$/.test(n)) || ''
    return {
      model: find(/^model.*\.bin$/),
      shortlist: find(/^lex.*\.bin$/),
      vocabs: names.filter((n) => /\.spm$/.test(n)).sort().map((n) => fs.readFileSync(path.join(dir, n)).buffer),
      // intgemm8-modeller (uden alphas) kræver denne gemm-præcision.
      gemmPrecision: /intgemm8\.bin$/.test(modelName) ? 'int8shiftAll' : undefined,
    }
  })

  // Skriver en genereret DOCX til <rod>/<kategori>/<filnavn> og opretter kategorimappen.
  ipcMain.handle('guides:export-docx', async (_event, payload) => {
    const sanitize = (value) => String(value || '').replace(/[\\/:*?"<>|]/g, '-').replace(/^\.+|\.+$/g, '').trim()
    const root = String(payload?.root || '')
    if (!root || !fs.existsSync(root)) {
      throw new Error(`Eksport-mappen findes ikke: ${root}`)
    }
    const category = sanitize(payload?.category) || 'Ukategoriseret'
    const fileName = sanitize(payload?.fileName) || 'guide.docx'
    const targetDir = path.join(root, category)
    if (!path.resolve(targetDir).startsWith(path.resolve(root))) {
      throw new Error('Ugyldig kategoristi')
    }
    fs.mkdirSync(targetDir, { recursive: true })
    const filePath = path.join(targetDir, fileName)
    await fs.promises.writeFile(filePath, Buffer.from(payload.data))
    return filePath
  })

  ipcMain.handle('updates:status', () => {
    const manifest = updater.readManifest(store.dataDir)
    return {
      currentVersion: app.getVersion(),
      isPackaged: app.isPackaged,
      manifest,
      updateAvailable: !!manifest && updater.isNewerVersion(manifest.version, app.getVersion()),
    }
  })

  ipcMain.handle('updates:check', () => checkForUpdates())

  ipcMain.handle('updates:select-zip', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win, {
      title: 'Vælg app-pakke (.zip) der skal publiceres',
      buttonLabel: 'Vælg denne pakke',
      properties: ['openFile'],
      filters: [{ name: 'App-pakke (zip)', extensions: ['zip'] }],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const zipPath = result.filePaths[0]
    const stat = fs.statSync(zipPath)
    return {
      path: zipPath,
      fileName: path.basename(zipPath),
      size: stat.size,
      version: updater.versionFromFilename(zipPath),
    }
  })

  ipcMain.handle('updates:publish', async (_event, payload) => {
    const manifest = await updater.publishUpdate(store.dataDir, {
      zipPath: String(payload.zipPath),
      version: String(payload.version),
      notes: String(payload.notes || ''),
      publishedBy: String(payload.publishedBy || ''),
    })
    checkForUpdates()
    return manifest
  })

  ipcMain.handle('updates:install', async () => {
    if (!app.isPackaged) {
      throw new Error('Opdatering kan kun installeres fra den byggede app (ikke i udviklingstilstand)')
    }
    if (updateInProgress) return
    const manifest = updater.readManifest(store.dataDir)
    if (!manifest || !updater.isNewerVersion(manifest.version, app.getVersion())) {
      throw new Error('Der er ingen nyere version at installere')
    }

    updateInProgress = true
    const exePath = app.getPath('exe')
    const installDir = path.dirname(exePath)
    try {
      // Hentes i baggrunden; kun ændrede filer overføres, og appen forbliver brugbar.
      const prepared = await updater.prepareUpdate({
        dataDir: store.dataDir,
        manifest,
        exePath,
        installDir,
        onProgress: (progress) => broadcast('updates:progress', progress),
      })

      broadcast('updates:progress', { phase: 'restarting', percent: 100 })
      updater.applyPreparedUpdate({
        ...prepared,
        installDir,
        exePath,
      })
      // Giv vinduet et øjeblik til at vise beskeden før appen lukker og byttes ud.
      setTimeout(() => app.quit(), 1200)
    } catch (error) {
      updateInProgress = false
      broadcast('updates:progress', { phase: 'error', percent: 0, message: error.message })
      throw error
    }
  })

  startWatcher()

  createWindow()

  updater.cleanupOldWorkDirs()
  // Backup kører først når appen har haft et øjeblik til at starte færdig.
  setTimeout(startAutoBackup, 30 * 1000)
  // Første tjek kort efter opstart (når vinduet er indlæst), derefter fast interval.
  setTimeout(checkForUpdates, 10 * 1000)
  updateCheckTimer = setInterval(checkForUpdates, UPDATE_CHECK_INTERVAL)
  updateCheckTimer.unref?.()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
