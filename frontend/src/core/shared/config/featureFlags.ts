const parseFlag = (rawValue: string | undefined, fallback: boolean): boolean => {
  if (rawValue === undefined || rawValue === null || rawValue.trim() === '') {
    return fallback
  }

  const normalized = rawValue.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

export const featureFlags = {
  roomDigest: parseFlag(import.meta.env.VITE_FEATURE_ROOM_DIGEST, true),
  roomMonetizationMetadata: parseFlag(import.meta.env.VITE_FEATURE_ROOM_MONETIZATION_METADATA, false),
  roomTranslationToggle: parseFlag(import.meta.env.VITE_FEATURE_ROOM_TRANSLATION_TOGGLE, true),
  // Phase 1 — Differentiation Features
  vibeRooms: parseFlag(import.meta.env.VITE_FEATURE_VIBE_ROOMS, true),
  aiPanel: parseFlag(import.meta.env.VITE_FEATURE_AI_PANEL, true),
  timeCapsule: parseFlag(import.meta.env.VITE_FEATURE_TIME_CAPSULE, true),
  ephemeralRooms: parseFlag(import.meta.env.VITE_FEATURE_EPHEMERAL_ROOMS, true),
  geofencing: parseFlag(import.meta.env.VITE_FEATURE_GEOFENCING, true),
}
