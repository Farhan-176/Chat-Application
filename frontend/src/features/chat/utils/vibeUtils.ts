/* Vibe System Utilities */

export type VibeType = 'default' | 'lofi' | 'hype' | 'focus' | 'chill' | 'midnight'

export const VIBE_CONFIGS: Array<{
  id: VibeType
  label: string
  emoji: string
  description: string
  cssFile?: string
}> = [
  {
    id: 'default',
    label: 'Default',
    emoji: '💬',
    description: 'Classic FlameChat',
  },
  {
    id: 'lofi',
    label: 'Lofi Study',
    emoji: '🌙',
    description: 'Calm, focused, and nostalgic',
    cssFile: 'lofi.css',
  },
  {
    id: 'hype',
    label: 'Hype Zone',
    emoji: '⚡',
    description: 'High energy, electric vibes',
    cssFile: 'hype.css',
  },
  {
    id: 'focus',
    label: 'Focus Mode',
    emoji: '🔥',
    description: 'Minimal, distraction-free',
    cssFile: 'focus.css',
  },
  {
    id: 'chill',
    label: 'Chill Space',
    emoji: '🌿',
    description: 'Earthy, relaxed atmosphere',
    cssFile: 'chill.css',
  },
  {
    id: 'midnight',
    label: 'Midnight Lounge',
    emoji: '🌌',
    description: 'Deep, moody, and late-night',
    cssFile: 'midnight.css',
  },
]

/**
 * Dynamically load a vibe CSS theme
 * @param vibe - The vibe type to load
 */
export function loadVibe(vibe: VibeType) {
  // Remove all existing vibe stylesheets (except base)
  const existingVibeLinks = document.querySelectorAll('link[data-vibe-theme]')
  existingVibeLinks.forEach((link) => link.remove())

  // Find the CSS file for this vibe
  const vibeConfig = VIBE_CONFIGS.find((v) => v.id === vibe)
  if (!vibeConfig?.cssFile) return // Default vibe has no CSS file

  // Create and inject new stylesheet
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `/src/features/chat/styles/vibes/${vibeConfig.cssFile}`
  link.dataset.vibeTheme = vibe
  document.head.appendChild(link)

  // Store preference in localStorage
  localStorage.setItem('activeVibe', vibe)
}

/**
 * Get the active vibe from localStorage or default
 */
export function getActiveVibe(): VibeType {
  const stored = localStorage.getItem('activeVibe')
  if (stored && VIBE_CONFIGS.some((v) => v.id === stored)) {
    return stored as VibeType
  }
  return 'default'
}

/**
 * Initialize vibe system on app load
 */
export function initializeVibe() {
  const activeVibe = getActiveVibe()
  if (activeVibe !== 'default') {
    loadVibe(activeVibe)
  }
}

/**
 * Load base vibe CSS (runs once on app startup)
 */
export function loadBaseVibeCss() {
  // Check if base CSS is already loaded
  if (document.querySelector('link[data-vibe-base]')) return

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = '/src/features/chat/styles/vibes/base.css'
  link.dataset.vibeBase = 'true'
  document.head.appendChild(link)
}

/**
 * Get vibe config by ID
 */
export function getVibeConfig(vibeId: VibeType) {
  return VIBE_CONFIGS.find((v) => v.id === vibeId)
}
