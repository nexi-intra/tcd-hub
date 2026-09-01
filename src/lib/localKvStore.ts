// Local persistent key/value store backed by localStorage. Data survives
// reloads and app restarts. Used in the browser; in the desktop app the
// Electron file-based store (shared network folder) takes over instead.
// Falls back to an in-memory Map where Web Storage is blocked.

export interface KvStore {
  get<T>(key: string): Promise<T | undefined>
  set<T>(key: string, value: T): Promise<void>
  delete(key: string): Promise<void>
  keys(): Promise<string[]>
  /**
   * Atomar opdatering af et array af objekter med `id` — i desktop-appen under
   * fil-lås på tværs af klienter, så samtidige skrivninger ikke taber elementer.
   */
  update<T extends { id: string }>(key: string, operation: KvArrayOperation<T>): Promise<T[]>
  /** Notifies when keys change (other tabs/clients, and local writes). Returns unsubscribe. */
  subscribe(listener: (changedKeys: string[]) => void): () => void
}

export type KvArrayOperation<T extends { id: string }> =
  | { op: 'append'; items: T[] }
  | { op: 'upsert'; items: T[] }
  | { op: 'remove'; ids: string[] }

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

const listeners = new Set<(changedKeys: string[]) => void>()

function notify(changedKeys: string[]) {
  listeners.forEach((listener) => listener(changedKeys))
}

// Cross-tab sync: the 'storage' event fires in *other* tabs on writes.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key?.startsWith(PREFIX)) notify([event.key.slice(PREFIX.length)])
  })
}

// Async API kept for call-site compatibility.
export const localKv: KvStore = {
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
    notify([key])
  },

  async delete(key: string): Promise<void> {
    remove(key)
    notify([key])
  },

  async keys(): Promise<string[]> {
    return allKeys()
  },

  // Browser kører single-client pr. origin — simpel read-modify-write rækker her.
  async update<T extends { id: string }>(key: string, operation: KvArrayOperation<T>): Promise<T[]> {
    const current = await localKv.get<T[]>(key)
    const list = Array.isArray(current) ? current : []
    let next: T[]
    if (operation.op === 'append') {
      next = [...list, ...operation.items]
    } else if (operation.op === 'upsert') {
      next = [...list]
      for (const item of operation.items) {
        const index = next.findIndex((entry) => entry?.id === item.id)
        if (index !== -1) next[index] = item
        else next.push(item)
      }
    } else {
      const ids = new Set(operation.ids)
      next = list.filter((entry) => !entry || !ids.has(entry.id))
    }
    write(key, JSON.stringify(next))
    notify([key])
    return next
  },

  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
