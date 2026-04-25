import { Router } from 'express'
import { authMiddleware, AuthenticatedRequest } from '../../../middleware/auth.js'
import { db } from '../../../config/firebaseAdmin.js'
import { FieldValue } from 'firebase-admin/firestore'

export const presenceRouter = Router()

// All routes require authentication
presenceRouter.use(authMiddleware)

/**
 * POST /api/presence/:roomId
 * Update user presence (online status + spatial position).
 * Body: { spatialX?: number, spatialY?: number }
 */
presenceRouter.post('/:roomId', async (req: AuthenticatedRequest, res) => {
    try {
        const { roomId } = req.params
        const { spatialX = 0.5, spatialY = 0.5 } = req.body
        const user = req.user!

        const presenceRef = db
            .collection('chatRooms')
            .doc(roomId)
            .collection('presence')
            .doc(user.uid)

        await presenceRef.set({
            uid: user.uid,
            displayName: user.displayName || 'Anonymous',
            photoURL: user.photoURL || null,
            online: true,
            spatialX: Math.min(1, Math.max(0, spatialX)),  // Clamp 0-1
            spatialY: Math.min(1, Math.max(0, spatialY)),  // Clamp 0-1
            lastSeen: FieldValue.serverTimestamp(),
        }, { merge: true })

        res.json({ success: true })

    } catch (error) {
        console.error('Error updating presence:', error)
        res.status(500).json({ error: 'Failed to update presence' })
    }
})

/**
 * DELETE /api/presence/:roomId
 * Set user offline.
 */
presenceRouter.delete('/:roomId', async (req: AuthenticatedRequest, res) => {
    try {
        const { roomId } = req.params
        const user = req.user!

        const presenceRef = db
            .collection('chatRooms')
            .doc(roomId)
            .collection('presence')
            .doc(user.uid)

        await presenceRef.update({
            online: false,
            lastSeen: FieldValue.serverTimestamp(),
        })

        res.json({ success: true })

    } catch (error) {
        console.error('Error updating presence:', error)
        res.status(500).json({ error: 'Failed to update presence' })
    }
})

/**
 * POST /api/presence/:roomId/typing
 * Set typing status.
 * Body: { isTyping: boolean }
 */
presenceRouter.post('/:roomId/typing', async (req: AuthenticatedRequest, res) => {
    try {
        const { roomId } = req.params
        const { isTyping = false } = req.body
        const user = req.user!

        const typingRef = db
            .collection('chatRooms')
            .doc(roomId)
            .collection('typing')
            .doc(user.uid)

        if (isTyping) {
            await typingRef.set({
                uid: user.uid,
                displayName: user.displayName || 'Anonymous',
                timestamp: FieldValue.serverTimestamp(),
            })
        } else {
            await typingRef.delete()
        }

        res.json({ success: true })

    } catch (error) {
        console.error('Error updating typing status:', error)
        res.status(500).json({ error: 'Failed to update typing status' })
    }
})

