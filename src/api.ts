import { auth } from './firebase'

const API_BASE = 'http://localhost:3001/api'

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
        const error = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(error.error || `API error: ${res.status}`)
    }

    return res.json()
}

// ─── Room API ───

export async function fetchRooms() {
    return apiFetch('/rooms')
}

export async function createRoom(name: string, description: string = '') {
    return apiFetch('/rooms', {
        method: 'POST',
        body: JSON.stringify({ name, description }),
    })
}

// ─── Message API ───

export async function sendMessageToServer(
    roomId: string,
    text: string,
    isEphemeral: boolean = false,
    ttl: number = 30
) {
    return apiFetch(`/messages/${roomId}`, {
        method: 'POST',
        body: JSON.stringify({ text, isEphemeral, ttl }),
    })
}

export async function deleteMessage(roomId: string, messageId: string) {
    return apiFetch(`/messages/${roomId}/${messageId}`, {
        method: 'DELETE',
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
