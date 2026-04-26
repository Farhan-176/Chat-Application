import { auth } from '../config'
import type { VibeType } from '../types'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'

export class ApiError extends Error {
    status: number
    payload: any

    constructor(message: string, status: number, payload: any) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.payload = payload
    }
}

export interface RoomCreationOptions {
    visibility?: 'public' | 'private'
    translationMode?: 'off' | 'manual' | 'auto'
    defaultLanguage?: string
    vibe?: VibeType
    expiresAt?: Date | string | null
    location?: { lat: number; lng: number } | null
    radius?: number
}

export interface RoomDigestResponse {
    digest: {
        summary: string
        unreadCount: number
        mentionCount: number
        generatedAt: string
        highlights: string[]
        actionItems: string[]
        sinceAt: string | null
        sinceSource: 'query' | 'read-state' | 'none'
    }
}

export interface RoomReadStateResponse {
    roomId: string
    lastReadAt: string | null
}

export interface MessageTranslationsResponse {
    roomId: string
    targetLanguage: string
    translations: Record<string, {
        text: string
        sourceLanguage: string
        targetLanguage: string
        cached: boolean
    }>
}

export interface TranslationPrewarmResponse {
    success: boolean
    roomId: string
    targetLanguage: string
    scanned: number
    translated: number
    cached: number
    skipped: number
}

export interface UserProfileUpdatePayload {
    displayName?: string
    bio?: string
    photoURL?: string | null
    handle?: string
}

export interface CurrentUserProfileResponse {
    uid: string
    email: string
    handle?: string
    displayName: string
    photoURL: string | null
    bio?: string
    status?: 'online' | 'away' | 'offline'
    workspaceIds: string[]
    identity?: {
        isProfileComplete: boolean
        requiresHandleUpdate: boolean
        displayNameValid: boolean
        handleValidFormat: boolean
        handleOwnedBySelf: boolean
        reason?: 'invalid_handle' | 'handle_conflict'
        suggestedHandles: string[]
    }
}

export interface HandleAvailabilityResponse {
    available: boolean
    handle?: string
    reason?: string
}

/**
 * Get the current user's Firebase ID token for API auth.
 */
async function getIdToken(): Promise<string> {
    const user = auth.currentUser
    if (!user) throw new Error('Not authenticated')
    return user.getIdToken()
}

/**
 * Authenticated fetch wrapper for the backend API.
 */
async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
    const token = await getIdToken()

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
        },
    })

    if (!res.ok) {
        const payload = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new ApiError(payload.error || `API error: ${res.status}`, res.status, payload)
    }

    return res.json()
}

// ─── Room API ───

export async function fetchRooms() {
    return apiFetch('/rooms')
}

export async function createRoom(
    name: string,
    description: string = '',
    workspaceId?: string,
    options: RoomCreationOptions = {}
) {
    return apiFetch('/rooms', {
        method: 'POST',
        body: JSON.stringify({ name, description, workspaceId, ...options }),
    })
}

export async function fetchRoomDigest(roomId: string, since?: string, limit: number = 120): Promise<RoomDigestResponse> {
    const params = new URLSearchParams()
    params.set('limit', String(limit))
    if (since) {
        params.set('since', since)
    }

    return apiFetch(`/rooms/${roomId}/digest?${params.toString()}`)
}

export async function getRoomReadState(roomId: string): Promise<RoomReadStateResponse> {
    return apiFetch(`/rooms/${roomId}/read-state`)
}

export async function markRoomRead(roomId: string, readAt?: string) {
    return apiFetch(`/rooms/${roomId}/read-state`, {
        method: 'POST',
        body: JSON.stringify(readAt ? { readAt } : {}),
    })
}

export async function backfillRoomReadState() {
    return apiFetch('/rooms/read-state/backfill', {
        method: 'POST',
        body: JSON.stringify({}),
    })
}

export async function fetchCurrentUserProfile(): Promise<CurrentUserProfileResponse> {
    return apiFetch('/users/me')
}

export async function inviteRoomMember(roomId: string, email: string) {
    return apiFetch(`/rooms/${roomId}/invite`, {
        method: 'POST',
        body: JSON.stringify({ email }),
    })
}

export async function fetchNearbyRooms(lat: number, lng: number, radiusKm: number = 5) {
    return apiFetch(`/rooms/discovery/nearby?lat=${lat}&lng=${lng}&radius=${radiusKm}`)
}

// ─── Message API ───

export async function sendMessageToServer(
    roomId: string,
    text: string,
    isEphemeral: boolean = false,
    ttl: number = 30,
    attachments?: any[],
    sealedUntil?: Date | string | null,
    capsuleLabel?: string,
    smartActions?: any[]
) {
    return apiFetch(`/messages/${roomId}`, {
        method: 'POST',
        body: JSON.stringify({ 
            text, 
            isEphemeral, 
            ttl, 
            attachments,
            sealedUntil: sealedUntil instanceof Date ? sealedUntil.toISOString() : sealedUntil,
            capsuleLabel,
            smartActions
        }),
    })
}

export async function deleteMessage(roomId: string, messageId: string) {
    return apiFetch(`/messages/${roomId}/${messageId}`, {
        method: 'DELETE',
    })
}

export async function editMessage(roomId: string, messageId: string, text: string) {
    return apiFetch(`/messages/${roomId}/${messageId}`, {
        method: 'PUT',
        body: JSON.stringify({ text }),
    })
}

export async function toggleMessageReaction(roomId: string, messageId: string, emoji: string) {
    return apiFetch(`/messages/${roomId}/${messageId}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
    })
}

export async function searchMessages(roomId: string, query: string, maxResults: number = 100) {
    const encodedQuery = encodeURIComponent(query)
    return apiFetch(`/messages/${roomId}/search?q=${encodedQuery}&maxResults=${maxResults}`)
}

export async function fetchMessageTranslations(
    roomId: string,
    messageIds: string[],
    targetLanguage: string
): Promise<MessageTranslationsResponse> {
    return apiFetch(`/messages/${roomId}/translations`, {
        method: 'POST',
        body: JSON.stringify({ messageIds, targetLanguage }),
    })
}

export async function prewarmMessageTranslations(
    roomId: string,
    targetLanguage?: string,
    limit: number = 120
): Promise<TranslationPrewarmResponse> {
    return apiFetch(`/messages/${roomId}/translations/prewarm`, {
        method: 'POST',
        body: JSON.stringify({
            targetLanguage,
            limit,
        }),
    })
}

export async function reportMessage(
    roomId: string,
    messageId: string,
    reason: 'spam' | 'harassment' | 'abuse' | 'off-topic' | 'other',
    note?: string
) {
    return apiFetch(`/messages/${roomId}/${messageId}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason, note }),
    })
}

export async function fetchModerationReports(roomId: string, status: 'open' | 'resolved' = 'open') {
    return apiFetch(`/messages/${roomId}/reports?status=${status}`)
}

export async function moderateDeleteMessage(roomId: string, messageId: string, reportId?: string) {
    return apiFetch(`/messages/${roomId}/${messageId}/moderate-delete`, {
        method: 'POST',
        body: JSON.stringify({ reportId }),
    })
}

// ─── Presence API ───

export async function updatePresence(roomId: string, spatialX?: number, spatialY?: number) {
    return apiFetch(`/presence/${roomId}`, {
        method: 'POST',
        body: JSON.stringify({ spatialX, spatialY }),
    })
}

export async function setOffline(roomId: string) {
    return apiFetch(`/presence/${roomId}`, {
        method: 'DELETE',
    })
}

export async function setTypingStatus(roomId: string, isTyping: boolean) {
    return apiFetch(`/presence/${roomId}/typing`, {
        method: 'POST',
        body: JSON.stringify({ isTyping }),
    })
}

// ─── User API ───

export async function checkHandleAvailability(handle: string): Promise<HandleAvailabilityResponse> {
    const encodedHandle = encodeURIComponent(handle)
    return apiFetch(`/users/handle/${encodedHandle}/availability`)
}

export async function updateCurrentUserProfile(payload: UserProfileUpdatePayload) {
    return apiFetch('/users/me', {
        method: 'PUT',
        body: JSON.stringify(payload),
    })
}

// ─── Vault API ───

export async function fetchVaultMessages() {
    return apiFetch('/users/me/vault')
}

export async function saveMessageToVault(messageData: {
    messageId: string
    roomId: string
    text: string
    senderName: string
    senderId: string
    timestamp: Date | string
    tags?: string[]
    aiTags?: string[]
    notes?: string
}) {
    const { messageId, ...rest } = messageData
    return apiFetch(`/users/me/vault/${messageId}`, {
        method: 'POST',
        body: JSON.stringify(rest),
    })
}

export async function removeMessageFromVault(messageId: string) {
    return apiFetch(`/users/me/vault/${messageId}`, {
        method: 'DELETE',
    })
}
