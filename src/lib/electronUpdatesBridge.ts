// Typet adgang til opdaterings-API'et fra electron/preload.cjs.
// Findes kun i desktop-appen (window.electronUpdates er undefined i browseren).

export interface UpdateManifest {
  version: string
  file: string
  sha256: string
  size: number
  notes: string
  publishedAt: string
  publishedBy: string
}

export interface UpdateStatus {
  currentVersion: string
  isPackaged: boolean
  manifest: UpdateManifest | null
  updateAvailable: boolean
}

export interface SelectedZip {
  path: string
  fileName: string
  size: number
  version: string | null
}

export interface ElectronUpdatesApi {
  getStatus(): Promise<UpdateStatus>
  check(): Promise<UpdateManifest | null>
  selectZip(): Promise<SelectedZip | null>
  publish(payload: { zipPath: string; version: string; notes: string; publishedBy: string }): Promise<UpdateManifest>
  install(): Promise<void>
  onUpdateAvailable(callback: (manifest: UpdateManifest) => void): () => void
}
