import type { KvStore } from './localKvStore'

// Raw API exposed by electron/preload.cjs via contextBridge.
export interface ElectronKvApi {
  get(key: string): Promise<unknown>
  set(key: string, value: unknown): Promise<void>
  delete(key: string): Promise<void>
  keys(): Promise<string[]>
  getDataDir(): Promise<string>
  onChanged(callback: (changedKeys: string[]) => void): () => void
}

/** Adapts the preload bridge to the app's KvStore interface. */
export function createElectronKv(api: ElectronKvApi): KvStore {
  return {
    async get<T>(key: string): Promise<T | undefined> {
      return (await api.get(key)) as T | undefined
    },
    async set<T>(key: string, value: T): Promise<void> {
      await api.set(key, value)
    },
    async delete(key: string): Promise<void> {
      await api.delete(key)
    },
    async keys(): Promise<string[]> {
      return api.keys()
    },
    subscribe(listener) {
      return api.onChanged(listener)
    },
  }
}
