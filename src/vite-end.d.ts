/// <reference types="vite/client" />
import type { LocalKv } from './lib/localKvStore'

declare global {
  interface Window {
    kv: LocalKv
  }
}

export {}