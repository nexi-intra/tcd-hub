// File-based key/value store shared by all app instances via a common data
// directory (typically a network share). One JSON file per key. Plain Node
// module with no Electron imports so it can be tested standalone.
//
// Concurrency model: writes are atomic (temp file + rename, atomic on the
// same volume incl. SMB shares) with last-write-wins per key — adequate for
// 10-15 clients with low write frequency. Change detection is polling-based
// (mtime scans) because fs.watch is unreliable on network shares.
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const FILE_EXT = '.json'

// Kryptering på disken (AES-256-GCM): beskytter mod at data/passwords kan
// læses direkte af alle med adgang til mappen på et delt drev. Nøglen er
// indbygget i appen, så alle klienter kan læse samme delte mappe.
const ENC_KEY = crypto.scryptSync('tcd-hub-storage-v1', 'tcd-hub-static-salt', 32)

function encryptPayload(json) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv)
  const data = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()])
  return JSON.stringify({
    __enc: 1,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: data.toString('base64'),
  })
}

function decryptPayload(parsed) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, Buffer.from(parsed.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'))
  const json = Buffer.concat([
    decipher.update(Buffer.from(parsed.data, 'base64')),
    decipher.final(),
  ])
  return json.toString('utf8')
}

function parseFileContents(raw) {
  const parsed = JSON.parse(raw)
  if (parsed && typeof parsed === 'object' && parsed.__enc === 1) {
    return JSON.parse(decryptPayload(parsed))
  }
  // Legacy ukrypteret fil fra tidligere versioner.
  return parsed
}

function keyToFilename(key) {
  return encodeURIComponent(key) + FILE_EXT
}

function filenameToKey(filename) {
  return decodeURIComponent(filename.slice(0, -FILE_EXT.length))
}

function createStore(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true })

  function filePath(key) {
    return path.join(dataDir, keyToFilename(key))
  }

  function get(key) {
    try {
      const raw = fs.readFileSync(filePath(key), 'utf8')
      return parseFileContents(raw)
    } catch (err) {
      if (err.code === 'ENOENT') return undefined
      // Torn/partial read on a flaky share: one short retry, then give up.
      try {
        const raw = fs.readFileSync(filePath(key), 'utf8')
        return parseFileContents(raw)
      } catch {
        return undefined
      }
    }
  }

  function set(key, value) {
    const target = filePath(key)
    const tmp = target + '.' + process.pid + '.tmp'
    fs.writeFileSync(tmp, encryptPayload(JSON.stringify(value)))
    fs.renameSync(tmp, target)
  }

  function del(key) {
    try {
      fs.unlinkSync(filePath(key))
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
    }
  }

  function keys() {
    return fs
      .readdirSync(dataDir)
      .filter((name) => name.endsWith(FILE_EXT))
      .map(filenameToKey)
  }

  /**
   * Polls the directory and invokes onChange(changedKeys: string[]) whenever
   * files were added, modified, or removed. Returns a stop function.
   */
  function watch(onChange, intervalMs = 2000) {
    let snapshot = takeSnapshot()

    function takeSnapshot() {
      const result = new Map()
      let entries = []
      try {
        entries = fs.readdirSync(dataDir)
      } catch {
        return result
      }
      for (const name of entries) {
        if (!name.endsWith(FILE_EXT)) continue
        try {
          const stat = fs.statSync(path.join(dataDir, name))
          result.set(name, stat.mtimeMs + ':' + stat.size)
        } catch {
          // File vanished between readdir and stat — treated as removed.
        }
      }
      return result
    }

    const timer = setInterval(() => {
      const next = takeSnapshot()
      const changed = []
      for (const [name, stamp] of next) {
        if (snapshot.get(name) !== stamp) changed.push(filenameToKey(name))
      }
      for (const name of snapshot.keys()) {
        if (!next.has(name)) changed.push(filenameToKey(name))
      }
      snapshot = next
      if (changed.length > 0) onChange(changed)
    }, intervalMs)
    timer.unref?.()

    return () => clearInterval(timer)
  }

  return { get, set, delete: del, keys, watch, dataDir }
}

module.exports = { createStore }
