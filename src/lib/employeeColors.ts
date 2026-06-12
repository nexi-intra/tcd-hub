const colorPalette = [
  { bg: 'oklch(0.75 0.14 340)', text: 'oklch(0.98 0.015 320)', name: 'Pink' },
  { bg: 'oklch(0.68 0.16 240)', text: 'oklch(0.98 0.015 320)', name: 'Lilla' },
  { bg: 'oklch(0.65 0.18 280)', text: 'oklch(0.98 0.015 320)', name: 'Blå' },
  { bg: 'oklch(0.72 0.15 180)', text: 'oklch(0.98 0.015 320)', name: 'Cyan' },
  { bg: 'oklch(0.70 0.16 160)', text: 'oklch(0.98 0.015 320)', name: 'Teal' },
  { bg: 'oklch(0.68 0.16 140)', text: 'oklch(0.98 0.015 320)', name: 'Grøn' },
  { bg: 'oklch(0.75 0.14 110)', text: 'oklch(0.22 0.04 280)', name: 'Lime' },
  { bg: 'oklch(0.78 0.15 85)', text: 'oklch(0.22 0.04 280)', name: 'Gul' },
  { bg: 'oklch(0.72 0.16 50)', text: 'oklch(0.22 0.04 280)', name: 'Orange' },
  { bg: 'oklch(0.65 0.18 25)', text: 'oklch(0.98 0.015 320)', name: 'Rød' },
  { bg: 'oklch(0.62 0.16 15)', text: 'oklch(0.98 0.015 320)', name: 'Dyb Rød' },
  { bg: 'oklch(0.68 0.14 350)', text: 'oklch(0.98 0.015 320)', name: 'Rose' },
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

export function getEmployeeColor(employeeId: string): { bg: string; text: string; name: string } {
  const hash = hashString(employeeId)
  const index = hash % colorPalette.length
  return colorPalette[index]
}

export function getEmployeeColorByEmail(email: string): { bg: string; text: string; name: string } {
  return getEmployeeColor(email)
}

export function getEmployeeColorByName(name: string): { bg: string; text: string; name: string } {
  return getEmployeeColor(name)
}
