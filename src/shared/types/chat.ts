// ─── Mood System ───
export type MoodType = 'joy' | 'anger' | 'calm' | 'excitement' | 'sadness' | 'neutral'

export interface MoodResult {
  mood: MoodType
  emoji: string
  color: string
  confidence: number
}

// ─── User ───
export interface User {
  uid: string
  displayName: string | null
  photoURL: string | null
  email: string | null
}

// ─── Message ───
export interface Message {
  id: string
  text: string
  uid: string
  displayName: string
  photoURL: string | null
  createdAt: Date

  // Mood Ring fields (from Gemini analysis)
  mood?: MoodType
  moodEmoji?: string
  moodColor?: string
  moodConfidence?: number

  // Ephemeral Ghost Message fields
  isEphemeral?: boolean
  ttl?: number          // seconds until dissolution
  dissolved?: boolean
  dissolvedAt?: Date
}

// ─── Chat Room ───
export interface ChatRoom {
  id: string
  name: string
  description?: string
  createdAt: Date
  createdBy?: string
  createdByName?: string
  memberCount?: number
}

// ─── Presence & Spatial ───
export interface UserPresence {
  uid: string
  displayName: string
  photoURL: string | null
  online: boolean
  spatialX: number   // 0-1, position on spatial canvas
  spatialY: number   // 0-1, position on spatial canvas
  lastSeen: Date
}

export interface TypingUser {
  uid: string
  displayName: string
  timestamp: Date
}
