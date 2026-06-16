export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
} as const

export const colors = {
  primary: 'oklch(0.50 0.12 250)',
  secondary: 'oklch(0.92 0.02 250)',
  accent: 'oklch(0.55 0.10 210)',
  destructive: 'oklch(0.55 0.15 25)',
  muted: 'oklch(0.95 0.01 250)',
  
  gradients: {
    primary: 'from-[oklch(0.50_0.12_250)] to-[oklch(0.55_0.10_210)]',
    shifts: 'from-[oklch(0.60_0.22_220)] via-[oklch(0.65_0.26_340)] to-[oklch(0.60_0.22_220)]',
    calendar: 'from-[oklch(0.65_0.26_340)] via-[oklch(0.70_0.20_20)] to-[oklch(0.65_0.26_340)]',
    meals: 'from-[oklch(0.70_0.18_90)] via-[oklch(0.75_0.15_60)] to-[oklch(0.70_0.18_90)]',
    team: 'from-[oklch(0.55_0.24_192)] via-[oklch(0.60_0.22_220)] to-[oklch(0.55_0.24_192)]',
    email: 'from-[oklch(0.68_0.14_340)] via-[oklch(0.75_0.12_180)] to-[oklch(0.68_0.14_340)]',
    guides: 'from-[oklch(0.50_0.27_262)] via-[oklch(0.55_0.24_192)] to-[oklch(0.50_0.27_262)]',
    projects: 'from-[oklch(0.75_0.15_60)] via-[oklch(0.70_0.18_90)] to-[oklch(0.75_0.15_60)]',
    games: 'from-[oklch(0.72_0.20_310)] via-[oklch(0.68_0.22_280)] to-[oklch(0.72_0.20_310)]',
    manager: 'from-[oklch(0.58_0.25_25)] via-[oklch(0.65_0.26_340)] to-[oklch(0.58_0.25_25)]',
    sickLeave: 'from-[oklch(0.58_0.25_25)] to-[oklch(0.65_0.26_340)]',
    overview: 'from-[oklch(0.50_0.12_250)] to-[oklch(0.60_0.15_250)]',
  }
} as const

export const typography = {
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  }
} as const

export const animation = {
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },
  easing: {
    default: 'ease-in-out',
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  }
} as const

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const
