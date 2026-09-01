// Typer for window.electronGuides (preload.cjs) — guide-eksport til filsystem.

export interface GuideExportPayload {
  root: string
  category: string
  fileName: string
  data: ArrayBuffer
}

export interface ElectronGuidesApi {
  /** Åbner mappe-dialog; returnerer valgt sti eller null ved annullering. */
  chooseExportDir(): Promise<string | null>
  /** Skriver DOCX til <root>/<kategori>/<filnavn>; returnerer den fulde sti. */
  exportDocx(payload: GuideExportPayload): Promise<string>
}
