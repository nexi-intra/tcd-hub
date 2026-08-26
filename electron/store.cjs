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

const FILE_EXT = '.json'

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
      return JSON.parse(raw)
    } catch (err) {
      if (err.code === 'ENOENT') return undefined
      // Torn/partial read on a flaky share: one short retry, then give up.
      try {
        const raw = fs.readFileSync(filePath(key), 'utf8')
        return JSON.parse(raw)
      } catch {
        return undefined
      }
    }
  }

  function set(key, value) {
    const target = filePath(key)
    const tmp = target + '.' + process.pid + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(value))
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
