// In-app opdateringssystem uden installation (brugerne har ikke admin-rettigheder).
//
// Den fælles datamappe (netværksdrevet) bruges som opdateringskanal:
//   <datamappe>/updates/manifest.json  — metadata om nyeste version
//   <datamappe>/updates/<app>.zip      — selve app-pakken (fra electron-builder)
//
// Publicering: en manager vælger en ny ZIP i appen; den kopieres til updates/
// med sha256-checksum, og manifestet skrives. Alle klienter poller manifestet.
//
// Installation: ZIP kopieres lokalt, checksum verificeres, pakkes ud til en
// midlertidig mappe, og et .cmd-script venter på at appen lukker, kopierer de
// nye filer over den lokale appmappe (fx C:\TCD TOOLS\...) og genstarter appen.
// Alt foregår i brugerens egne mapper — ingen administrator-rettigheder kræves.
const fs = require('fs')
const path = require('path')
const os = require('os')
const crypto = require('crypto')
const { spawn, execFileSync } = require('child_process')

const UPDATES_DIR = 'updates'
const MANIFEST_FILE = 'manifest.json'
const WORK_DIR_PREFIX = 'tcd-hub-update-'

function updatesDir(dataDir) {
  return path.join(dataDir, UPDATES_DIR)
}

function manifestPath(dataDir) {
  return path.join(updatesDir(dataDir), MANIFEST_FILE)
}

function parseVersion(value) {
  const match = String(value || '').trim().match(/^(\d+)\.(\d+)\.(\d+)$/)
  if (!match) return null
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function isNewerVersion(candidate, current) {
  const a = parseVersion(candidate)
  const b = parseVersion(current)
  if (!a || !b) return false
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true
    if (a[i] < b[i]) return false
  }
  return false
}

/** Læser manifestet fra den fælles mappe. Returnerer null hvis intet/ugyldigt. */
function readManifest(dataDir) {
  try {
    const raw = fs.readFileSync(manifestPath(dataDir), 'utf8')
    const manifest = JSON.parse(raw)
    if (!manifest || typeof manifest !== 'object') return null
    if (!parseVersion(manifest.version) || typeof manifest.file !== 'string' || typeof manifest.sha256 !== 'string') {
      return null
    }
    return manifest
  } catch {
    return null
  }
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const stream = fs.createReadStream(filePath)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

/** Gæt versionsnummer ud fra zip-filnavnet, fx "TCD Hub-1.2.0-win.zip". */
function versionFromFilename(fileName) {
  const match = String(fileName).match(/(\d+\.\d+\.\d+)/)
  return match ? match[1] : null
}

/**
 * Kopierer zip'en til <datamappe>/updates/, verificerer kopien og skriver
 * manifestet. Gamle zip-filer ryddes op bagefter.
 */
async function publishUpdate(dataDir, { zipPath, version, notes, publishedBy }) {
  if (!parseVersion(version)) {
    throw new Error('Versionsnummeret skal have formatet X.Y.Z, fx 1.2.0')
  }
  const stat = fs.statSync(zipPath)
  const dir = updatesDir(dataDir)
  fs.mkdirSync(dir, { recursive: true })

  const sha256 = await sha256File(zipPath)
  const fileName = path.basename(zipPath)
  const target = path.join(dir, fileName)

  if (path.resolve(zipPath) !== path.resolve(target)) {
    fs.copyFileSync(zipPath, target)
  }
  const copiedSha = await sha256File(target)
  if (copiedSha !== sha256) {
    try { fs.unlinkSync(target) } catch { /* ignore */ }
    throw new Error('Kopien til den fælles mappe blev beskadiget undervejs — prøv igen')
  }

  const manifest = {
    version,
    file: fileName,
    sha256,
    size: stat.size,
    notes: String(notes || ''),
    publishedAt: new Date().toISOString(),
    publishedBy: String(publishedBy || ''),
  }
  const tmp = manifestPath(dataDir) + '.' + process.pid + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(manifest, null, 2))
  fs.renameSync(tmp, manifestPath(dataDir))

  for (const name of fs.readdirSync(dir)) {
    if (name.toLowerCase().endsWith('.zip') && name !== fileName) {
      try { fs.unlinkSync(path.join(dir, name)) } catch { /* en anden klient kan være i gang med den */ }
    }
  }
  return manifest
}

function psQuote(value) {
  return value.replace(/'/g, "''")
}

/** Udpakker en zip med tar.exe (Windows 10+) og PowerShell som fallback. */
function extractZip(zipPath, destDir) {
  fs.mkdirSync(destDir, { recursive: true })
  try {
    execFileSync('tar.exe', ['-xf', zipPath, '-C', destDir], { windowsHide: true })
    return
  } catch {
    // tar.exe mangler eller fejlede — prøv PowerShell i stedet.
  }
  execFileSync(
    'powershell.exe',
    [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command',
      `Expand-Archive -LiteralPath '${psQuote(zipPath)}' -DestinationPath '${psQuote(destDir)}' -Force`,
    ],
    { windowsHide: true }
  )
}

/**
 * Forbereder opdateringen og starter det løsrevne script, der udfører den,
 * når appen er lukket. Kalderen skal selv kalde app.quit() bagefter.
 */
async function installUpdate({ dataDir, manifest, installDir, exePath }) {
  const sourceZip = path.join(updatesDir(dataDir), manifest.file)
  if (!fs.existsSync(sourceZip)) {
    throw new Error('Opdateringsfilen findes ikke længere i den fælles mappe')
  }

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), WORK_DIR_PREFIX))
  const localZip = path.join(workDir, manifest.file)
  // Kopiér til lokal disk først — udpakning direkte fra netværksdrev er skrøbelig.
  fs.copyFileSync(sourceZip, localZip)

  const actualSha = await sha256File(localZip)
  if (actualSha !== manifest.sha256) {
    fs.rmSync(workDir, { recursive: true, force: true })
    throw new Error('Checksum-fejl: filen er beskadiget eller ændret. Prøv igen senere.')
  }

  const stagingDir = path.join(workDir, 'app')
  extractZip(localZip, stagingDir)

  const exeName = path.basename(exePath)
  if (!fs.existsSync(path.join(stagingDir, exeName))) {
    fs.rmSync(workDir, { recursive: true, force: true })
    throw new Error(`Zip-filen ligner ikke en TCD Hub-udgivelse (mangler ${exeName})`)
  }

  // "ping -n 2" bruges som 1 sekunds pause — timeout.exe virker ikke uden stdin.
  const script = [
    '@echo off',
    'setlocal',
    `set "APPPID=${process.pid}"`,
    `set "LOG=${path.join(workDir, 'update-log.txt')}"`,
    'echo Venter paa at TCD Hub lukker... > "%LOG%"',
    ':wait',
    'tasklist /FI "PID eq %APPPID%" /NH 2>nul | find "%APPPID%" >nul',
    'if not errorlevel 1 (',
    '  ping -n 2 127.0.0.1 >nul',
    '  goto wait',
    ')',
    'echo Kopierer nye filer... >> "%LOG%"',
    `robocopy "${stagingDir}" "${installDir}" /E /R:10 /W:2 >> "%LOG%" 2>&1`,
    'if %ERRORLEVEL% GEQ 8 (',
    '  echo Opdatering fejlede - robocopy exit %ERRORLEVEL% >> "%LOG%"',
    ') else (',
    '  echo Opdatering gennemfoert >> "%LOG%"',
    ')',
    `start "" "${exePath}"`,
    'endlocal',
    '',
  ].join('\r\n')

  const scriptPath = path.join(workDir, 'apply-update.cmd')
  fs.writeFileSync(scriptPath, script)

  const child = spawn('cmd.exe', ['/c', scriptPath], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    cwd: workDir,
  })
  child.unref()
}

/** Rydder efterladte arbejdsmapper fra tidligere opdateringer (kaldes ved opstart). */
function cleanupOldWorkDirs() {
  let entries = []
  try {
    entries = fs.readdirSync(os.tmpdir())
  } catch {
    return
  }
  for (const name of entries) {
    if (!name.startsWith(WORK_DIR_PREFIX)) continue
    const dir = path.join(os.tmpdir(), name)
    try {
      const ageMs = Date.now() - fs.statSync(dir).mtimeMs
      // Lad friske mapper være — et opdaterings-script kan stadig køre.
      if (ageMs > 60 * 60 * 1000) fs.rmSync(dir, { recursive: true, force: true })
    } catch { /* ignore */ }
  }
}

module.exports = {
  readManifest,
  isNewerVersion,
  versionFromFilename,
  publishUpdate,
  installUpdate,
  cleanupOldWorkDirs,
  sha256File,
}
