import { Router } from 'express'
import { authMiddleware, AuthenticatedRequest } from '../../../middleware/auth.js'
import { db } from '../../../config/firebaseAdmin.js'
import { FieldValue } from 'firebase-admin/firestore'
import { summarizeRoom } from '../services/summarizer.js'
import { featureFlags } from '../../../config/featureFlags.js'

export const roomsRouter = Router()
const ROOM_TRANSLATION_MODES = ['off', 'manual', 'auto'] as const

type RoomTranslationMode = (typeof ROOM_TRANSLATION_MODES)[number]

interface DigestMessage {
    id: string
    uid?: string
    createdAt?: { toDate?: () => Date }
    text?: string
    displayName?: string
}

const extractActionItems = (messages: DigestMessage[]) => {
    const actionHints = [
        /\b(todo|action item|follow up|follow-up|next step|need to|needs to|please|can you|could you)\b/i,
        /\b(by\s+(today|tomorrow|eod|end of day|monday|tuesday|wednesday|thursday|friday|this week|next week))\b/i,
        /\?$/,
    ]

    const items: string[] = []
    for (const message of messages) {
        const text = String(message.text || '').trim()
        if (!text) {
            continue
        }

        const matchesHint = actionHints.some((pattern) => pattern.test(text))
        if (!matchesHint) {
            continue
        }

        const sender = String(message.displayName || 'Unknown')
        const compact = text.length > 120 ? `${text.slice(0, 117)}...` : text
        items.push(`${sender}: ${compact}`)

        if (items.length >= 5) {
            break
        }
    }

    return items
}

// All routes require authentication
roomsRouter.use(authMiddleware)

/**
 * GET /api/rooms
 * List all chat rooms.
 */
roomsRouter.get('/', async (_req: AuthenticatedRequest, res) => {
    try {
        const user = _req.user!
        const orderedSnapshot = await db.collection('chatRooms').orderBy('lastMessageAt', 'desc').get().catch(async () => {
            return db.collection('chatRooms').orderBy('createdAt', 'desc').get()
        })

        const visibilityChecked = await Promise.all(orderedSnapshot.docs.map(async (roomDoc) => {
            const roomData = roomDoc.data()
            const visibility = roomData.visibility || 'public'

            if (visibility !== 'private') {
                return roomDoc
            }

            if (roomData.createdBy === user.uid) {
                return roomDoc
            }

            const membership = await roomDoc.ref.collection('members').doc(user.uid).get()
            return membership.exists ? roomDoc : null
        }))

        const rooms: Array<Record<string, any>> = visibilityChecked
            .filter((doc) => !!doc)
            .map((doc: any) => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.() || new Date(),
            }))

        // If no rooms exist, create the default "general" room
        if (rooms.length === 0) {
            const generalRef = db.collection('chatRooms').doc('general')
            await generalRef.set({
                name: 'General',
                description: 'The main chat room for everyone',
                createdAt: FieldValue.serverTimestamp(),
                createdBy: 'system',
                memberCount: 0,
            })

            rooms.push({
                id: 'general',
                name: 'General',
                description: 'The main chat room for everyone',
                createdAt: new Date(),
                createdBy: 'system',
                memberCount: 0,
            })
        }

        res.json({ rooms })
    } catch (error) {
        console.error('Error listing rooms:', error)
        res.status(500).json({ error: 'Failed to list rooms' })
    }
})

/**
 * POST /api/rooms
 * Create a new room.
 * Body: { name: string, description?: string, workspaceId?: string }
 */
roomsRouter.post('/', async (req: AuthenticatedRequest, res) => {
    try {
        const {
            name,
            description = '',
            workspaceId,
            visibility = 'public',
            translationMode = 'manual',
            defaultLanguage = 'en',
            location = null, // { lat: number, lng: number }
            radius = 1000,   // meters
        } = req.body
        const user = req.user!

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            res.status(400).json({ error: 'Room name is required' })
            return
        }

        if (name.length > 50) {
            res.status(400).json({ error: 'Room name too long (max 50 characters)' })
            return
        }

        const normalizedTranslationMode: RoomTranslationMode = featureFlags.roomTranslationToggle
            ? (ROOM_TRANSLATION_MODES.includes(translationMode) ? translationMode : 'manual')
            : 'off'

        const normalizedDefaultLanguage = typeof defaultLanguage === 'string'
            ? defaultLanguage.trim().toLowerCase().slice(0, 8) || 'en'
            : 'en'

        // Create a URL-safe ID from the name
        const roomId = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

        // Check if room already exists
        const existingRoom = await db.collection('chatRooms').doc(roomId).get()
        if (existingRoom.exists) {
            res.status(409).json({ error: 'A room with this name already exists' })
            return
        }

        const roomData: any = {
            name: name.trim(),
            description: description.trim(),
            visibility: visibility === 'private' ? 'private' : 'public',
            createdAt: FieldValue.serverTimestamp(),
            lastMessageAt: FieldValue.serverTimestamp(),
            createdBy: user.uid,
            createdByName: user.displayName || 'Anonymous',
            memberCount: 1,
            translationMode: normalizedTranslationMode,
            defaultLanguage: normalizedDefaultLanguage,
            location: location && typeof location.lat === 'number' && typeof location.lng === 'number' ? location : null,
            radius: typeof radius === 'number' ? radius : 1000,
            isGeofenced: !!(location && typeof location.lat === 'number' && typeof location.lng === 'number'),
        }

        if (featureFlags.roomMonetizationMetadata) {
            roomData.accessModel = 'free'
            roomData.minimumTipCents = 0
        }

        // Add workspaceId if provided
        if (workspaceId) {
            roomData.workspaceId = workspaceId
        }

        const roomRef = db.collection('chatRooms').doc(roomId)
        await roomRef.set(roomData)

        await roomRef.collection('members').doc(user.uid).set({
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'Anonymous',
            role: 'owner',
            joinedAt: FieldValue.serverTimestamp(),
        })

        res.status(201).json({
            id: roomId,
            ...roomData,
            createdAt: new Date(),
        })

    } catch (error) {
        console.error('Error creating room:', error)
        res.status(500).json({ error: 'Failed to create room' })
    }
})

/**
 * GET /api/rooms/:roomId
 * Get room details.
 */
roomsRouter.get('/:roomId', async (req: AuthenticatedRequest, res) => {
    try {
        const { roomId } = req.params
        const doc = await db.collection('chatRooms').doc(roomId).get()

        if (!doc.exists) {
            res.status(404).json({ error: 'Room not found' })
            return
        }

        res.json({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data()?.createdAt?.toDate?.() || new Date(),
        })

    } catch (error) {
        console.error('Error getting room:', error)
        res.status(500).json({ error: 'Failed to get room' })
    }
})

/**
 * GET /api/rooms/:roomId/read-state
 * Return current user's server-side read marker for the room.
 */
roomsRouter.get('/:roomId/read-state', async (req: AuthenticatedRequest, res) => {
    try {
        const { roomId } = req.params
        const user = req.user!
        const roomRef = db.collection('chatRooms').doc(roomId)
        const roomDoc = await roomRef.get()

        if (!roomDoc.exists) {
            res.status(404).json({ error: 'Room not found' })
            return
        }

        const roomData = roomDoc.data() || {}
        const isPrivate = roomData.visibility === 'private'
        if (isPrivate && roomData.createdBy !== user.uid) {
            const membership = await roomRef.collection('members').doc(user.uid).get()
            if (!membership.exists) {
                res.status(403).json({ error: 'Invite-only room access denied' })
                return
            }
        }

        const readDoc = await db.collection('users').doc(user.uid).collection('roomReads').doc(roomId).get()
        const lastReadAt = readDoc.data()?.lastReadAt?.toDate?.() || null

        res.json({
            roomId,
            lastReadAt: lastReadAt ? lastReadAt.toISOString() : null,
        })
    } catch (error) {
        console.error('Error getting room read-state:', error)
        res.status(500).json({ error: 'Failed to get read-state' })
    }
})

/**
 * POST /api/rooms/read-state/backfill
 * Create missing read markers for rooms visible to the current user.
 */
roomsRouter.post('/read-state/backfill', async (req: AuthenticatedRequest, res) => {
    try {
        const user = req.user!
        const readsRef = db.collection('users').doc(user.uid).collection('roomReads')
        const existingReads = await readsRef.get()
        const existingRoomIds = new Set(existingReads.docs.map((doc) => doc.id))

        const roomSnapshot = await db.collection('chatRooms').orderBy('lastMessageAt', 'desc').get().catch(async () => {
            return db.collection('chatRooms').orderBy('createdAt', 'desc').get()
        })

        let created = 0
        let skippedExisting = 0
        let skippedInaccessible = 0

        let batch = db.batch()
        let batchOps = 0

        const commitBatchIfNeeded = async (force = false) => {
            if (batchOps === 0) {
                return
            }

            if (force || batchOps >= 450) {
                await batch.commit()
                batch = db.batch()
                batchOps = 0
            }
        }

        for (const roomDoc of roomSnapshot.docs) {
            const roomId = roomDoc.id
            if (existingRoomIds.has(roomId)) {
                skippedExisting += 1
                continue
            }

            const roomData = roomDoc.data() || {}
            const isPrivate = roomData.visibility === 'private'

            if (isPrivate && roomData.createdBy !== user.uid) {
                const membership = await roomDoc.ref.collection('members').doc(user.uid).get()
                if (!membership.exists) {
                    skippedInaccessible += 1
                    continue
                }
            }

            const baselineReadAt = roomData.lastMessageAt?.toDate?.()
                || roomData.createdAt?.toDate?.()
                || new Date()

            const readDocRef = readsRef.doc(roomId)
            batch.set(readDocRef, {
                roomId,
                lastReadAt: baselineReadAt,
                backfilledAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true })

            created += 1
            batchOps += 1
            await commitBatchIfNeeded()
        }

        await commitBatchIfNeeded(true)

        res.json({
            success: true,
            created,
            skippedExisting,
            skippedInaccessible,
        })
    } catch (error) {
        console.error('Error backfilling room read-state:', error)
        res.status(500).json({ error: 'Failed to backfill read-state' })
    }
})

/**
 * POST /api/rooms/:roomId/read-state
 * Update current user's server-side read marker for digest/unread logic.
 */
roomsRouter.post('/:roomId/read-state', async (req: AuthenticatedRequest, res) => {
    try {
        const { roomId } = req.params
        const user = req.user!
        const roomRef = db.collection('chatRooms').doc(roomId)
        const roomDoc = await roomRef.get()

        if (!roomDoc.exists) {
            res.status(404).json({ error: 'Room not found' })
            return
        }

        const roomData = roomDoc.data() || {}
        const isPrivate = roomData.visibility === 'private'
        if (isPrivate && roomData.createdBy !== user.uid) {
            const membership = await roomRef.collection('members').doc(user.uid).get()
            if (!membership.exists) {
                res.status(403).json({ error: 'Invite-only room access denied' })
                return
            }
        }

        const readAtRaw = typeof req.body?.readAt === 'string' ? req.body.readAt : ''
        const parsed = readAtRaw ? new Date(readAtRaw) : null
        const hasValidParsed = !!parsed && !Number.isNaN(parsed.getTime())

        await db.collection('users').doc(user.uid).collection('roomReads').doc(roomId).set({
            roomId,
            lastReadAt: hasValidParsed ? parsed : FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true })

        res.json({
            success: true,
            roomId,
            markedAt: new Date().toISOString(),
        })
    } catch (error) {
        console.error('Error updating room read-state:', error)
        res.status(500).json({ error: 'Failed to update read-state' })
    }
})

/**
 * GET /api/rooms/:roomId/digest?since=<iso>&limit=120
 * Generate personalized unread catch-up summary.
 */
roomsRouter.get('/:roomId/digest', async (req: AuthenticatedRequest, res) => {
    try {
        if (!featureFlags.roomDigest) {
            res.status(404).json({ error: 'Digest feature is disabled' })
            return
        }

        const { roomId } = req.params
        const user = req.user!
        const roomRef = db.collection('chatRooms').doc(roomId)
        const roomDoc = await roomRef.get()

        if (!roomDoc.exists) {
            res.status(404).json({ error: 'Room not found' })
            return
        }

        const roomData = roomDoc.data() || {}
        const isPrivate = roomData.visibility === 'private'
        if (isPrivate && roomData.createdBy !== user.uid) {
            const membership = await roomRef.collection('members').doc(user.uid).get()
            if (!membership.exists) {
                res.status(403).json({ error: 'Invite-only room access denied' })
                return
            }
        }

        const limitRaw = Number(req.query.limit || 120)
        const maxMessages = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 10), 200) : 120
        const sinceRaw = typeof req.query.since === 'string' ? req.query.since : ''
        const explicitSinceDate = sinceRaw ? new Date(sinceRaw) : null
        const hasExplicitSinceDate = !!explicitSinceDate && !Number.isNaN(explicitSinceDate.getTime())

        const readDoc = await db.collection('users').doc(user.uid).collection('roomReads').doc(roomId).get()
        const persistedLastRead = readDoc.data()?.lastReadAt?.toDate?.() || null

        const effectiveSinceDate = hasExplicitSinceDate
            ? explicitSinceDate
            : persistedLastRead

        const sinceSource = hasExplicitSinceDate
            ? 'query'
            : persistedLastRead
                ? 'read-state'
                : 'none'

        const snapshot = await roomRef
            .collection('messages')
            .orderBy('createdAt', 'desc')
            .limit(maxMessages)
            .get()

        const chronologicalMessages: DigestMessage[] = snapshot.docs
            .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<DigestMessage, 'id'>) }))
            .reverse()

        const unreadMessages = effectiveSinceDate
            ? chronologicalMessages.filter((message) => {
                const createdAt = message.createdAt?.toDate?.()
                return !!createdAt && createdAt > effectiveSinceDate && message.uid !== user.uid
            })
            : chronologicalMessages.filter((message) => message.uid !== user.uid)

        if (unreadMessages.length === 0) {
            res.json({
                digest: {
                    summary: 'You are fully caught up. No new messages since your last check-in.',
                    unreadCount: 0,
                    mentionCount: 0,
                    generatedAt: new Date().toISOString(),
                    highlights: [],
                    actionItems: [],
                    sinceAt: effectiveSinceDate ? effectiveSinceDate.toISOString() : null,
                    sinceSource,
                },
            })
            return
        }

        const userDoc = await db.collection('users').doc(user.uid).get()
        const userHandle = String(userDoc.data()?.handle || '').toLowerCase()
        const displayName = String(user.displayName || '').toLowerCase()
        const mentionPatterns = [
            displayName ? `@${displayName}` : '',
            userHandle ? `@${userHandle}` : '',
        ].filter(Boolean)

        const mentionCount = unreadMessages.reduce((count, message) => {
            const text = String(message.text || '').toLowerCase()
            const hasMention = mentionPatterns.some((pattern) => text.includes(pattern))
            return hasMention ? count + 1 : count
        }, 0)

        const summary = await summarizeRoom(unreadMessages)

        const highlights = unreadMessages
            .slice(-5)
            .map((message) => {
                const sender = String(message.displayName || 'Unknown')
                const text = String(message.text || '').trim()
                const compactText = text.length > 140 ? `${text.slice(0, 137)}...` : text
                return `${sender}: ${compactText || '[attachment]'}`
            })

        const actionItems = extractActionItems(unreadMessages)

        res.json({
            digest: {
                summary,
                unreadCount: unreadMessages.length,
                mentionCount,
                generatedAt: new Date().toISOString(),
                highlights,
                actionItems,
                sinceAt: effectiveSinceDate ? effectiveSinceDate.toISOString() : null,
                sinceSource,
            },
        })
    } catch (error) {
        console.error('Error generating room digest:', error)
        res.status(500).json({ error: 'Failed to generate room digest' })
    }
})

/**
 * GET /api/rooms/:roomId/members
 * List room members for private/public rooms that requester can access.
 */
roomsRouter.get('/:roomId/members', async (req: AuthenticatedRequest, res) => {
    try {
        const { roomId } = req.params
        const user = req.user!
        const roomRef = db.collection('chatRooms').doc(roomId)
        const roomDoc = await roomRef.get()

        if (!roomDoc.exists) {
            res.status(404).json({ error: 'Room not found' })
            return
        }

        const roomData = roomDoc.data()!
        const isPrivate = roomData.visibility === 'private'
        const isCreator = roomData.createdBy === user.uid
        const memberDoc = await roomRef.collection('members').doc(user.uid).get()

        if (isPrivate && !isCreator && !memberDoc.exists) {
            res.status(403).json({ error: 'Invite-only room access denied' })
            return
        }

        const membersSnapshot = await roomRef.collection('members').get()
        const members = membersSnapshot.docs.map((doc) => ({
            uid: doc.id,
            ...doc.data(),
        }))

        res.json({ members })
    } catch (error) {
        console.error('Error listing room members:', error)
        res.status(500).json({ error: 'Failed to list room members' })
    }
})

/**
 * POST /api/rooms/:roomId/invite
 * Invite a user to a private room by email. Creator-only.
 */
roomsRouter.post('/:roomId/invite', async (req: AuthenticatedRequest, res) => {
    try {
        const { roomId } = req.params
        const { email } = req.body
        const user = req.user!

        if (!email || typeof email !== 'string') {
            res.status(400).json({ error: 'Valid email is required' })
            return
        }

        const roomRef = db.collection('chatRooms').doc(roomId)
        const roomDoc = await roomRef.get()

        if (!roomDoc.exists) {
            res.status(404).json({ error: 'Room not found' })
            return
        }

        const roomData = roomDoc.data()!
        if (roomData.visibility !== 'private') {
            res.status(400).json({ error: 'Invites are only for private rooms' })
            return
        }

        if (roomData.createdBy !== user.uid) {
            res.status(403).json({ error: 'Only room creator can invite members' })
            return
        }

        const normalizedEmail = email.trim().toLowerCase()
        const usersSnapshot = await db.collection('users').where('email', '==', normalizedEmail).limit(1).get()

        if (usersSnapshot.empty) {
            res.status(404).json({ error: 'No user found with that email' })
            return
        }

        const inviteeDoc = usersSnapshot.docs[0]
        await roomRef.collection('members').doc(inviteeDoc.id).set({
            uid: inviteeDoc.id,
            email: inviteeDoc.data().email || normalizedEmail,
            displayName: inviteeDoc.data().displayName || inviteeDoc.data().email || 'User',
            role: 'member',
            invitedBy: user.uid,
            joinedAt: FieldValue.serverTimestamp(),
        }, { merge: true })

        res.status(200).json({ success: true })
    } catch (error) {
        console.error('Error inviting room member:', error)
        res.status(500).json({ error: 'Failed to invite room member' })
    }
})

/**
 * DELETE /api/rooms/:roomId/members/:memberId
 * Remove member from room. Creator-only.
 */
roomsRouter.delete('/:roomId/members/:memberId', async (req: AuthenticatedRequest, res) => {
    try {
        const { roomId, memberId } = req.params
        const user = req.user!
        const roomRef = db.collection('chatRooms').doc(roomId)
        const roomDoc = await roomRef.get()

        if (!roomDoc.exists) {
            res.status(404).json({ error: 'Room not found' })
            return
        }

        const roomData = roomDoc.data()!
        if (roomData.createdBy !== user.uid) {
            res.status(403).json({ error: 'Only room creator can remove members' })
            return
        }

        if (memberId === user.uid) {
            res.status(400).json({ error: 'Creator cannot be removed from room' })
            return
        }

        await roomRef.collection('members').doc(memberId).delete()
        res.status(200).json({ success: true })
    } catch (error) {
        console.error('Error removing room member:', error)
        res.status(500).json({ error: 'Failed to remove room member' })
    }
})

/**
 * DELETE /api/rooms/:roomId
 * Delete room and direct subcollection docs. Creator-only.
 */
roomsRouter.delete('/:roomId', async (req: AuthenticatedRequest, res) => {
    try {
        const { roomId } = req.params
        const user = req.user!
        const roomRef = db.collection('chatRooms').doc(roomId)
        const roomDoc = await roomRef.get()

        if (!roomDoc.exists) {
            res.status(404).json({ error: 'Room not found' })
            return
        }

        const roomData = roomDoc.data()!
        if (roomData.createdBy !== user.uid) {
            res.status(403).json({ error: 'Only room creator can delete room' })
            return
        }

        const subcollections = ['members', 'messages', 'presence', 'typing']
        for (const subcollectionName of subcollections) {
            const snapshot = await roomRef.collection(subcollectionName).get()
            if (snapshot.empty) {
                continue
            }
            const batch = db.batch()
            snapshot.docs.forEach((doc) => batch.delete(doc.ref))
            await batch.commit()
        }

        await roomRef.delete()
        res.status(200).json({ success: true })
    } catch (error) {
        console.error('Error deleting room:', error)
        res.status(500).json({ error: 'Failed to delete room' })
    }
})
/**
 * GET /api/rooms/:roomId/summarize
 * Generate an AI summary of the room's recent messages.
 */
roomsRouter.get('/:roomId/summarize', async (req: AuthenticatedRequest, res) => {
    try {
        const { roomId } = req.params

        // Fetch latest 30 messages for context
        const messagesSnapshot = await db.collection('chatRooms')
            .doc(roomId)
            .collection('messages')
            .orderBy('createdAt', 'desc')
            .limit(30)
            .get()

        const messages = messagesSnapshot.docs
            .map(doc => doc.data())
            .reverse() // Put in chronological order

        const summary = await summarizeRoom(messages)
        res.json({ summary })

    } catch (error) {
        console.error('Error summarizing room:', error)
        res.status(500).json({ error: 'Failed to generate room summary' })
    }
})

/**
 * GET /api/rooms/discovery/nearby
 * Find geofenced rooms within a certain radius of the user.
 */
roomsRouter.get('/discovery/nearby', async (req: AuthenticatedRequest, res) => {
    try {
        const lat = parseFloat(req.query.lat as string)
        const lng = parseFloat(req.query.lng as string)
        const radiusKm = parseFloat(req.query.radius as string) || 5 // Default 5km

        if (isNaN(lat) || isNaN(lng)) {
            res.status(400).json({ error: 'Latitude and Longitude are required' })
            return
        }

        // 1. Basic Box Filter to limit Firestore scanning
        // Approx 1 deg = 111km
        const latDelta = radiusKm / 111
        const lngDelta = radiusKm / (111 * Math.cos(lat * (Math.PI / 180)))

        const snapshot = await db.collection('chatRooms')
            .where('isGeofenced', '==', true)
            .where('location.lat', '>=', lat - latDelta)
            .where('location.lat', '<=', lat + latDelta)
            .get()

        const rooms = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() as any }))
            .filter(room => {
                // 2. Refined Haversine Distance
                const rLat = room.location.lat
                const rLng = room.location.lng
                
                const R = 6371 // Earth radius in km
                const dLat = (rLat - lat) * (Math.PI / 180)
                const dLng = (rLng - lng) * (Math.PI / 180)
                const a = 
                    Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(lat * (Math.PI/180)) * Math.cos(rLat * (Math.PI/180)) * 
                    Math.sin(dLng/2) * Math.sin(dLng/2)
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
                const distance = R * c
                
                room.distance = distance
                return distance <= radiusKm
            })
            .sort((a, b) => a.distance - b.distance)

        res.json({ rooms })
    } catch (error) {
        console.error('Error finding nearby rooms:', error)
        res.status(500).json({ error: 'Failed to find nearby rooms' })
    }
})

