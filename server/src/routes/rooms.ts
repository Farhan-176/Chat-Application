import { Router } from 'express'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js'
import { db } from '../config/firebaseAdmin.js'
import { FieldValue } from 'firebase-admin/firestore'

export const roomsRouter = Router()

// All routes require authentication
roomsRouter.use(authMiddleware)

/**
 * GET /api/rooms
 * List all chat rooms.
 */
roomsRouter.get('/', async (_req: AuthenticatedRequest, res) => {
    try {
        const snapshot = await db.collection('chatRooms').orderBy('createdAt', 'desc').get()

        const rooms: Array<Record<string, any>> = snapshot.docs.map(doc => ({
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
 * Body: { name: string, description?: string }
 */
roomsRouter.post('/', async (req: AuthenticatedRequest, res) => {
    try {
        const { name, description = '' } = req.body
        const user = req.user!

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            res.status(400).json({ error: 'Room name is required' })
            return
        }

        if (name.length > 50) {
            res.status(400).json({ error: 'Room name too long (max 50 characters)' })
            return
        }

        // Create a URL-safe ID from the name
        const roomId = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

        // Check if room already exists
        const existingRoom = await db.collection('chatRooms').doc(roomId).get()
        if (existingRoom.exists) {
            res.status(409).json({ error: 'A room with this name already exists' })
            return
        }

        const roomData = {
            name: name.trim(),
            description: description.trim(),
            createdAt: FieldValue.serverTimestamp(),
            createdBy: user.uid,
            createdByName: user.displayName || 'Anonymous',
            memberCount: 1,
        }

        await db.collection('chatRooms').doc(roomId).set(roomData)

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
