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

// User profile stored in Firestore
export interface UserProfile {
  uid: string
  email: string
  handle?: string
  displayName: string
  photoURL: string | null
  status?: 'online' | 'away' | 'offline'
  bio?: string
  role?: 'admin' | 'moderator' | 'user'  // global role (can be override per workspace)
  workspaceIds: string[]  // IDs of workspaces user belongs to
  createdAt: Date
  updatedAt: Date
}

// ─── Workspace (Organization) ───
export interface Workspace {
  id: string
  name: string
  description?: string
  icon?: string  // emoji or URL
  ownerId: string
  ownerName: string
  createdAt: Date
  updatedAt: Date
  memberCount: number
  isPrivate: boolean  // true = invitation only, false = open
}

// Workspace member with role
export interface WorkspaceMember {
  userId: string
  workspaceId: string
  role: 'owner' | 'admin' | 'moderator' | 'member'
  joinedAt: Date
  inviteStatus: 'active' | 'pending' | 'declined'
  invitedBy?: string
  invitedAt?: Date
}

// Workspace invitation
export interface WorkspaceInvitation {
  id: string
  workspaceId: string
  email: string
  role: 'member' | 'moderator' | 'admin'
  status: 'pending' | 'accepted' | 'declined'
  invitedBy: string
  invitedByName: string
  invitedAt: Date
  expiresAt: Date
  acceptedAt?: Date
  declinedAt?: Date
}

// ─── Vibe System ───
export type VibeType = 'default' | 'lofi' | 'hype' | 'focus' | 'chill' | 'midnight'

export interface VibeConfig {
  id: VibeType
  label: string
  emoji: string
  description: string
}

export const VIBE_CONFIGS: VibeConfig[] = [
  { id: 'default',  label: 'Default',        emoji: '💬', description: 'Classic FlameChat' },
  { id: 'lofi',     label: 'Lofi Study',      emoji: '🌙', description: 'Calm, focused, and nostalgic' },
  { id: 'hype',     label: 'Hype Zone',       emoji: '⚡', description: 'High energy, electric vibes' },
  { id: 'focus',    label: 'Focus Mode',      emoji: '🔥', description: 'Minimal, distraction-free' },
  { id: 'chill',    label: 'Chill Space',     emoji: '🌿', description: 'Earthy, relaxed atmosphere' },
  { id: 'midnight', label: 'Midnight Lounge', emoji: '🌌', description: 'Deep, moody, and late-night' },
]

// ─── Chat Room ───
export interface ChatRoom {
  id: string
  workspaceId: string  // NEW: scope room to workspace
  name: string
  description?: string
  visibility?: 'public' | 'private'
  vibe?: VibeType           // NEW: visual theme for room
  expiresAt?: Date | null   // NEW: ephemeral self-destruct timestamp
  translationMode?: 'off' | 'manual' | 'auto'
  defaultLanguage?: string
  createdAt: Date
  createdBy?: string
  createdByName?: string
  memberCount?: number
  allowedRoles?: Array<'owner' | 'admin' | 'moderator' | 'member'>  // default: all roles
}

export interface RoomDigest {
  summary: string
  unreadCount: number
  mentionCount: number
  generatedAt: string
  highlights: string[]
  actionItems: string[]
  sinceAt: string | null
  sinceSource: 'query' | 'read-state' | 'none'
}

// ─── Message ───
export interface Message {
  id: string
  text: string
  uid: string
  displayName: string
  photoURL: string | null
  createdAt: Date
  edited?: boolean
  editedAt?: Date | null
  workspaceId?: string  // track which workspace message belongs to
  roomId?: string       // track room for context

  // Mood Ring fields (from Gemini analysis)
  mood?: MoodType
  moodEmoji?: string
  moodColor?: string
  moodConfidence?: number

  // Time Capsule fields — message is sealed until sealedUntil date
  sealedUntil?: Date | null
  capsuleLabel?: string   // optional label shown on sealed capsule

  // Ephemeral Ghost Message fields
  isEphemeral?: boolean
  ttl?: number          // seconds until dissolution
  dissolved?: boolean
  dissolvedAt?: Date
  attachments?: Array<{
    name: string
    url: string
    type: string
    size: number
  }>
  reactions?: Record<string, string[]>
  translatedText?: string
  translatedFromLanguage?: string
  translatedToLanguage?: string
}

export interface ModerationReport {
  id: string
  roomId: string
  messageId: string
  reason: 'spam' | 'harassment' | 'abuse' | 'off-topic' | 'other'
  status: 'open' | 'resolved'
  reporterUid: string
  reporterName: string
  createdAt: Date | null
  messagePreview: string
  reportedUid?: string
  reportedDisplayName?: string
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
