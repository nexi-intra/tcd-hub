// Local persistent key/value store backed by localStorage. Data survives
// reloads and app restarts (in Electron, localStorage is persisted to the
// app's userData directory automatically). Falls back to an in-memory Map
// in environments where Web Storage is blocked (e.g. strict privacy modes),
// so the app degrades gracefully instead of crashing.

const PREFIX = 'tcd-hub:'

function detectStorage(): Storage | null {
  try {
    const testKey = '__tcd_hub_storage_test__'
    window.localStorage.setItem(testKey, '1')
    window.localStorage.removeItem(testKey)
    return window.localStorage
  } catch {
    return null
  }
}

const storage = detectStorage()
const memoryFallback = new Map<string, string>()

function read(key: string): string | undefined {
  if (storage) {
    const value = storage.getItem(PREFIX + key)
    return value === null ? undefined : value
  }
  return memoryFallback.get(key)
}

function write(key: string, value: string): void {
  if (storage) {
    storage.setItem(PREFIX + key, value)
  } else {
    memoryFallback.set(key, value)
  }
}

function remove(key: string): void {
  if (storage) {
    storage.removeItem(PREFIX + key)
  } else {
    memoryFallback.delete(key)
  }
}

function allKeys(): string[] {
  if (storage) {
    const keys: string[] = []
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key?.startsWith(PREFIX)) keys.push(key.slice(PREFIX.length))
    }
    return keys
  }
  return Array.from(memoryFallback.keys())
}

// Async API kept for call-site compatibility (the previous store was remote).
export const localKv = {
  async get<T>(key: string): Promise<T | undefined> {
    const raw = read(key)
    if (raw === undefined) return undefined
    try {
      return JSON.parse(raw) as T
    } catch {
      return undefined
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    write(key, JSON.stringify(value))
  },

  async delete(key: string): Promise<void> {
    remove(key)
  },

  async keys(): Promise<string[]> {
    return allKeys()
  },

  async getAll<T = unknown>(): Promise<Record<string, T>> {
    const result: Record<string, T> = {}
    for (const key of allKeys()) {
      const raw = read(key)
      if (raw === undefined) continue
      try {
        result[key] = JSON.parse(raw) as T
      } catch {
        // Skip unparsable entries.
      }
    }
    return result
  },
}

export type LocalKv = typeof localKv
