// In-memory key/value store — data lives only for the current page session and is
// gone on reload/close. Deliberately avoids sessionStorage/localStorage since some
// browser environments (privacy modes, managed/corporate policies) block Web Storage
// access entirely, which would fail silently and make the app look broken.
const store = new Map<string, string>()

export const sessionKv = {
  async get<T>(key: string): Promise<T | undefined> {
    const raw = store.get(key)
    if (raw === undefined) return undefined
    try {
      return JSON.parse(raw) as T
    } catch {
      return undefined
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    store.set(key, JSON.stringify(value))
  },

  async delete(key: string): Promise<void> {
    store.delete(key)
  },

  async keys(): Promise<string[]> {
    return Array.from(store.keys())
  },

  async getAll<T = unknown>(): Promise<Record<string, T>> {
    const result: Record<string, T> = {}
    for (const key of store.keys()) {
      const value = await this.get<T>(key)
      if (value !== undefined) result[key] = value
    }
    return result
  }
}
