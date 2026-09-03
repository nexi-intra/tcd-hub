// Afgør om der lige nu er en åben Dialog/AlertDialog nogen steder i appen, ved
// at spørge DOM'en direkte (Radix fjerner altid Content-elementet fra DOM'en
// når en dialog lukkes, medmindre forceMount bruges — hvilket vi ikke gør).
// Bruges til at afgøre om Escape-tasten skal navigere ét skridt tilbage i
// appen, eller lade en åben dialog lukke sig selv først. En DOM-forespørgsel
// er immun over for evt. modul-duplikering ved bundling/chunking, som en
// JS-tæller ellers kunne være sårbar over for.
export function isAnyModalOpen(): boolean {
  return document.querySelector('[data-slot="dialog-content"], [data-slot="alert-dialog-content"]') !== null
}
