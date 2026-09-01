/// <reference types="vite/client" />
import type { KvStore } from './lib/localKvStore'
import type { ElectronKvApi } from './lib/electronKvBridge'
import type { ElectronUpdatesApi } from './lib/electronUpdatesBridge'
import type { ElectronGuidesApi } from './lib/electronGuidesBridge'

declare global {
  interface Window {
    kv: KvStore
    /** Present only when running inside the Electron desktop app. */
    electronKv?: ElectronKvApi
    /** Present only when running inside the Electron desktop app. */
    electronUpdates?: ElectronUpdatesApi
    /** Present only when running inside the Electron desktop app. */
    electronGuides?: ElectronGuidesApi
  }
}

export {}