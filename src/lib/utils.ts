import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Giver kontrollen tilbage til browserens event loop et øjeblik, så UI'et (klik, scroll, animationer) forbliver responsivt under tunge synkrone loops. */
export function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}
