/// <reference types="vite/client" />
import type { KvStore } from './lib/localKvStore'
import type { ElectronKvApi } from './lib/electronKvBridge'
import type { ElectronUpdatesApi } from './lib/electronUpdatesBridge'

declare global {
  interface Window {
    kv: KvStore
    /** Present only when running inside the Electron desktop app. */
    electronKv?: ElectronKvApi
    /** Present only when running inside the Electron desktop app. */
    electronUpdates?: ElectronUpdatesApi
  }
}

export {}