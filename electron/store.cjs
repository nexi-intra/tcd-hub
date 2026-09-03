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
const READ_ATTEMPTS = 5
const WRITE_ATTEMPTS = 30
const RETRY_DELAY_MS = 100

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

function wait(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds)
}

function createStore(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true })

  // Local read cache (3s TTL) to reduce repeated network I/O. Async background refresh.
  const readCache = new Map()
  const CACHE_TTL_MS = 3000

  function filePath(key) {
    return path.join(dataDir, keyToFilename(key))
  }

  function get(key, options) {
    const skipCache = options && options.skipCache
    const cached = !skipCache && readCache.get(key)
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      // Return cached value immediately, refresh in background.
      setImmediate(() => {
        try {
          const raw = fs.readFileSync(filePath(key), 'utf8')
          const decoded = parseFileContents(raw)
          readCache.set(key, { value: decoded, at: Date.now() })
        } catch {
          // Keep cached value on error.
        }
      })
      return cached.value
    }

    let lastError
    for (let attempt = 1; attempt <= READ_ATTEMPTS; attempt++) {
      try {
        const raw = fs.readFileSync(filePath(key), 'utf8')
        const decoded = parseFileContents(raw)
        readCache.set(key, { value: decoded, at: Date.now() })
        return decoded
      } catch (err) {
        if (err.code === 'ENOENT') return undefined
        lastError = err
        if (attempt < READ_ATTEMPTS) wait(RETRY_DELAY_MS)
      }
    }
    // Existing but temporarily unreadable data must never look like a missing
    // key; callers may otherwise initialize it with an empty value.
    throw lastError
  }

  function set(key, value) {
    readCache.set(key, { value, at: Date.now() })
    const target = filePath(key)
    const tmp = `${target}.${process.pid}.${Date.now()}.${crypto.randomBytes(4).toString('hex')}.tmp`
    fs.writeFileSync(tmp, encryptPayload(JSON.stringify(value)))

    let lastError
    for (let attempt = 1; attempt <= WRITE_ATTEMPTS; attempt++) {
      try {
        fs.renameSync(tmp, target)
        return
      } catch (err) {
        lastError = err
        if (!['EPERM', 'EBUSY', 'EACCES'].includes(err.code) || attempt === WRITE_ATTEMPTS) break
        wait(RETRY_DELAY_MS)
      }
    }

    try { fs.unlinkSync(tmp) } catch {}
    throw lastError
  }

  function del(key) {
    readCache.delete(key)
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

  // --- Atomar array-opdatering på tværs af klienter -----------------------
  // Låsefil pr. nøgle (exclusive create er atomisk, også på SMB-shares).
  // Forældede låse (crashet klient) overtages efter STALE_LOCK_MS.
  const LOCK_ATTEMPTS = 50
  const LOCK_RETRY_MS = 100
  const STALE_LOCK_MS = 10_000

  function lockPath(key) {
    return filePath(key) + '.lock'
  }

  function acquireLock(key) {
    const target = lockPath(key)
    for (let attempt = 1; attempt <= LOCK_ATTEMPTS; attempt++) {
      try {
        const fd = fs.openSync(target, 'wx')
        fs.writeSync(fd, String(process.pid))
        fs.closeSync(fd)
        return
      } catch (err) {
        if (err.code !== 'EEXIST') throw err
        try {
          const stat = fs.statSync(target)
          if (Date.now() - stat.mtimeMs > STALE_LOCK_MS) {
            fs.unlinkSync(target)
            continue
          }
        } catch {
          continue // Låsen forsvandt imens — prøv igen med det samme.
        }
        if (attempt === LOCK_ATTEMPTS) throw new Error(`Kunne ikke få lås på "${key}" (optaget af anden klient)`)
        wait(LOCK_RETRY_MS)
      }
    }
  }

  function releaseLock(key) {
    try { fs.unlinkSync(lockPath(key)) } catch {}
  }

  /**
   * Atomar opdatering af et array af objekter med `id` under fil-lås:
   *   { op: 'append', items }  — tilføj elementer
   *   { op: 'upsert', items }  — erstat pr. id, ellers tilføj
   *   { op: 'remove', ids }    — fjern pr. id
   * Valgfri `path` (array af nøgler) navigerer ned i et objekt til et nested
   * array, fx { path: ['easy'] } for et leaderboard opdelt pr. sværhedsgrad —
   * resten af objektet bevares, kun arrayet på den sti opdateres.
   *
   * To ekstra ops arbejder i stedet på et almindeligt objekt (fx 'users', keyet
   * pr. email) under samme fil-lås:
   *   { op: 'setField', field, value }  — sæt/erstat én nøgle i objektet
   *   { op: 'deleteField', field }      — fjern én nøgle fra objektet
   *
   * Returnerer det opdaterede array/objekt. Kaster hvis nøglen (på stien) ikke
   * har den forventede type (array for array-ops, objekt for felt-ops).
   */
  function update(key, operation) {
    acquireLock(key)
    try {
      if (operation.op === 'setField' || operation.op === 'deleteField') {
        const current = get(key, { skipCache: true })
        const root = current && typeof current === 'object' && !Array.isArray(current) ? current : {}
        if (operation.op === 'setField') root[operation.field] = operation.value
        else delete root[operation.field]
        set(key, root)
        return root
      }

      const current = get(key, { skipCache: true })
      const path = operation.path && operation.path.length > 0 ? operation.path : null
      let root
      let list
      if (path) {
        root = current && typeof current === 'object' && !Array.isArray(current) ? current : {}
        let parent = root
        for (let i = 0; i < path.length - 1; i++) {
          const segment = path[i]
          if (!parent[segment] || typeof parent[segment] !== 'object' || Array.isArray(parent[segment])) {
            parent[segment] = {}
          }
          parent = parent[segment]
        }
        const lastSegment = path[path.length - 1]
        list = Array.isArray(parent[lastSegment]) ? parent[lastSegment] : []
      } else {
        list = current === undefined ? [] : current
        if (!Array.isArray(list)) {
          throw new Error(`kv:update kræver et array i "${key}"`)
        }
      }
      let next
      if (operation.op === 'append') {
        next = [...list, ...operation.items]
      } else if (operation.op === 'upsert') {
        next = [...list]
        for (const item of operation.items) {
          const index = next.findIndex((entry) => entry && entry.id === item.id)
          if (index !== -1) next[index] = item
          else next.push(item)
        }
      } else if (operation.op === 'remove') {
        const ids = new Set(operation.ids)
        next = list.filter((entry) => !entry || !ids.has(entry.id))
      } else {
        throw new Error(`Ukendt kv:update-operation: ${operation.op}`)
      }
      if (path) {
        let parent = root
        for (let i = 0; i < path.length - 1; i++) parent = parent[path[i]]
        parent[path[path.length - 1]] = next
        set(key, root)
      } else {
        set(key, next)
      }
      return next
    } finally {
      releaseLock(key)
    }
  }

  /** Alle nøgler + værdier (til backup). */
  function dumpAll() {
    const result = {}
    for (const key of keys()) {
      try {
        const value = get(key)
        if (value !== undefined) result[key] = value
      } catch (err) {
        console.warn(`Backup: springer ulæselig nøgle over: ${key}`, err.message)
      }
    }
    return result
  }

  /**
   * Polls the directory and invokes onChange(changedKeys: string[]) whenever
   * files were added, modified, or removed. Returns a stop function.
   */
  function watch(onChange, intervalMs = 5000) {
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
      if (changed.length > 0) {
        // Invalidate cache for changed keys to force fresh read on next get().
        for (const key of changed) readCache.delete(key)
        onChange(changed)
      }
    }, Math.max(intervalMs, 5000))
    timer.unref?.()

    return () => clearInterval(timer)
  }

  return { get, set, delete: del, keys, watch, update, dumpAll, dataDir }
}

module.exports = { createStore }
