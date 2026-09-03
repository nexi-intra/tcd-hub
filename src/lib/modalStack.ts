// Simpelt globalt "hvor mange dialoger er åbne lige nu"-tæller. Bruges til at
// afgøre om Escape-tasten skal navigere ét skridt tilbage i appen, eller om
// den skal lade en åben Dialog/AlertDialog lukke sig selv først (Radix
// håndterer selv Escape-lukning af dialoger — vi skal bare undgå at vores
// egne globale Escape-lyttere ÉN gang skal navigere samtidig).
let openCount = 0

export function registerModalOpen(): void {
  openCount++
}

export function registerModalClosed(): void {
  openCount = Math.max(0, openCount - 1)
}

export function isAnyModalOpen(): boolean {
  return openCount > 0
}
