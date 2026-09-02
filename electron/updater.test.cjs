const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')
const { publishUpdate, prepareUpdate, isNewerVersion, readManifest, buildApplyScript } = require('./updater.cjs')

const EXE_NAME = 'TCD Hub.exe'

function makeTempDir(t, prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  return dir
}

/** Builds a minimal release zip that looks like a packaged TCD Hub build. */
function buildReleaseZip(t) {
  const sourceDir = makeTempDir(t, 'tcd-release-src-')
  fs.writeFileSync(path.join(sourceDir, EXE_NAME), 'binary-placeholder')
  fs.mkdirSync(path.join(sourceDir, 'resources'))
  fs.writeFileSync(path.join(sourceDir, 'resources', 'app.asar'), 'asar-placeholder')

  const zipDir = makeTempDir(t, 'tcd-release-zip-')
  const zipPath = path.join(zipDir, 'TCD Hub-9.9.9-win.zip')
  execFileSync('tar.exe', ['-a', '-c', '-f', zipPath, '-C', sourceDir, '.'], { windowsHide: true })
  return zipPath
}

test('publishUpdate writes a manifest that clients detect as newer', async (t) => {
  const dataDir = makeTempDir(t, 'tcd-data-')
  const zipPath = buildReleaseZip(t)

  const manifest = await publishUpdate(dataDir, {
    zipPath,
    version: '9.9.9',
    notes: 'test',
    publishedBy: 'tester',
  })

  assert.equal(manifest.version, '9.9.9')
  assert.equal(readManifest(dataDir).sha256, manifest.sha256)
  assert.ok(isNewerVersion(manifest.version, '1.2.2'))
})

test('prepareUpdate downloads and extracts without touching the installed app', async (t) => {
  const dataDir = makeTempDir(t, 'tcd-data-')
  const installDir = makeTempDir(t, 'tcd-install-')
  const zipPath = buildReleaseZip(t)

  fs.writeFileSync(path.join(installDir, EXE_NAME), 'current-version')

  const manifest = await publishUpdate(dataDir, { zipPath, version: '9.9.9', notes: '', publishedBy: '' })

  const phases = []
  const prepared = await prepareUpdate({
    dataDir,
    manifest,
    exePath: path.join(installDir, EXE_NAME),
    installDir,
    onProgress: (progress) => phases.push(progress.phase),
  })
  t.after(() => fs.rmSync(prepared.workDir, { recursive: true, force: true }))

  assert.ok(fs.existsSync(path.join(prepared.stagingDir, EXE_NAME)))
  assert.ok(phases.includes('comparing'))
  assert.ok(phases.includes('downloading'))
  assert.equal(phases.at(-1), 'ready')
  // The running installation must stay untouched until the restart step.
  assert.equal(fs.readFileSync(path.join(installDir, EXE_NAME), 'utf8'), 'current-version')
})

test('prepareUpdate rejects a package whose checksum does not match', async (t) => {
  const dataDir = makeTempDir(t, 'tcd-data-')
  const installDir = makeTempDir(t, 'tcd-install-')
  const zipPath = buildReleaseZip(t)

  const manifest = await publishUpdate(dataDir, { zipPath, version: '9.9.9', notes: '', publishedBy: '' })
  const tampered = { ...manifest, sha256: 'f'.repeat(64), files: undefined, deltaDir: undefined }

  await assert.rejects(
    prepareUpdate({ dataDir, manifest: tampered, exePath: path.join(installDir, EXE_NAME), installDir }),
    /Checksum-fejl/
  )
})

test('publishUpdate indexes every file so clients can diff them', async (t) => {
  const dataDir = makeTempDir(t, 'tcd-data-')
  const zipPath = buildReleaseZip(t)

  const manifest = await publishUpdate(dataDir, { zipPath, version: '9.9.9', notes: '', publishedBy: '' })

  const indexed = manifest.files.map((entry) => entry.path).sort()
  assert.deepEqual(indexed, ['TCD Hub.exe', 'resources/app.asar'])
  assert.equal(manifest.deltaDir, '9.9.9')
  assert.ok(manifest.files.every((entry) => /^[0-9a-f]{64}$/.test(entry.sha256)))
})

test('prepareUpdate transfers only the files that actually changed', async (t) => {
  const dataDir = makeTempDir(t, 'tcd-data-')
  const installDir = makeTempDir(t, 'tcd-install-')
  const zipPath = buildReleaseZip(t)

  const manifest = await publishUpdate(dataDir, { zipPath, version: '9.9.9', notes: '', publishedBy: '' })

  // Simulate an install where only app.asar differs from the published version.
  fs.writeFileSync(path.join(installDir, EXE_NAME), 'binary-placeholder')
  fs.mkdirSync(path.join(installDir, 'resources'))
  fs.writeFileSync(path.join(installDir, 'resources', 'app.asar'), 'previous-version')

  const prepared = await prepareUpdate({
    dataDir,
    manifest,
    exePath: path.join(installDir, EXE_NAME),
    installDir,
  })
  t.after(() => fs.rmSync(prepared.workDir, { recursive: true, force: true }))

  assert.equal(prepared.changedCount, 1)
  assert.ok(fs.existsSync(path.join(prepared.stagingDir, 'resources', 'app.asar')))
  // The unchanged executable must not be transferred at all.
  assert.equal(fs.existsSync(path.join(prepared.stagingDir, EXE_NAME)), false)
})

test('prepareUpdate reports files the new version no longer contains', async (t) => {
  const dataDir = makeTempDir(t, 'tcd-data-')
  const installDir = makeTempDir(t, 'tcd-install-')
  const zipPath = buildReleaseZip(t)

  const manifest = await publishUpdate(dataDir, { zipPath, version: '9.9.9', notes: '', publishedBy: '' })
  fs.writeFileSync(path.join(installDir, 'leftover-from-old-version.dll'), 'stale')

  const prepared = await prepareUpdate({
    dataDir,
    manifest,
    exePath: path.join(installDir, EXE_NAME),
    installDir,
  })
  t.after(() => fs.rmSync(prepared.workDir, { recursive: true, force: true }))

  assert.deepEqual(prepared.obsolete, ['leftover-from-old-version.dll'])
})

test('prepareUpdate creates a staging directory even when delta has no changed files', async (t) => {
  const dataDir = makeTempDir(t, 'tcd-data-')
  const installDir = makeTempDir(t, 'tcd-install-')
  const zipPath = buildReleaseZip(t)

  const manifest = await publishUpdate(dataDir, { zipPath, version: '9.9.9', notes: '', publishedBy: '' })
  fs.writeFileSync(path.join(installDir, EXE_NAME), 'binary-placeholder')
  fs.mkdirSync(path.join(installDir, 'resources'))
  fs.writeFileSync(path.join(installDir, 'resources', 'app.asar'), 'asar-placeholder')

  const prepared = await prepareUpdate({
    dataDir,
    manifest,
    exePath: path.join(installDir, EXE_NAME),
    installDir,
  })
  t.after(() => fs.rmSync(prepared.workDir, { recursive: true, force: true }))

  assert.equal(prepared.changedCount, 0)
  assert.ok(fs.existsSync(prepared.stagingDir))
})

test('apply script restarts old app and stops before success path when robocopy fails', (t) => {
  const workDir = makeTempDir(t, 'tcd-work-')
  const stagingDir = path.join(workDir, 'app')
  const installDir = path.join(workDir, 'install')
  const exePath = path.join(installDir, EXE_NAME)

  const script = buildApplyScript({ workDir, stagingDir, installDir, exePath, appPid: 1234 })

  assert.match(script, /if %ERRORLEVEL% GEQ 8 \(/)
  assert.match(script, /start "" ".*TCD Hub\.exe"\r\n  exit \/b %ERRORLEVEL%/)
  assert.match(script, /\) else \(\r\n  echo Opdatering gennemfoert/)
})
