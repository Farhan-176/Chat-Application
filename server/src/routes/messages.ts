import { Router } from 'express'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js'
import { db } from '../index.js'
import { analyzeMood } from '../services/moodAnalyzer.js'
import { ephemeralManager } from '../services/ephemeralManager.js'
import { FieldValue } from 'firebase-admin/firestore'

export const messagesRouter = Router()

// All routes require authentication
messagesRouter.use(authMiddleware)

/**
 * POST /api/messages/:roomId
 * Send a message with AI mood analysis.
 * Body: { text: string, isEphemeral?: boolean, ttl?: number }
 */
messagesRouter.post('/:roomId', async (req: AuthenticatedRequest, res) => {
    try {
        const { roomId } = req.params
        const { text, isEphemeral = false, ttl = 30 } = req.body
        const user = req.user!

        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            res.status(400).json({ error: 'Message text is required' })
            return
        }

        if (text.length > 2000) {
            res.status(400).json({ error: 'Message too long (max 2000 characters)' })
            return
        }

        // Run mood analysis via Gemini
        const moodResult = await analyzeMood(text.trim())

        // Build the message document
        const messageData: Record<string, any> = {
            text: text.trim(),
            uid: user.uid,
            displayName: user.displayName || 'Anonymous',
            photoURL: user.photoURL || null,
            createdAt: FieldValue.serverTimestamp(),
            mood: moodResult.mood,
            moodEmoji: moodResult.emoji,
            moodColor: moodResult.color,
            moodConfidence: moodResult.confidence,
        }

        // Add ephemeral fields if ghost mode is on
        if (isEphemeral) {
            const clampedTTL = Math.min(Math.max(ttl, 5), 300) // 5s to 5min
            messageData.isEphemeral = true
            messageData.ttl = clampedTTL
            messageData.dissolved = false
        }

        // Write to Firestore
        const messagesRef = db.collection('chatRooms').doc(roomId).collection('messages')
        const docRef = await messagesRef.add(messageData)

        // If ephemeral, schedule server-side destruction
        if (isEphemeral) {
            ephemeralManager.scheduleDestruction(roomId, docRef.id, messageData.ttl)
        }

        res.status(201).json({
            id: docRef.id,
            mood: moodResult,
            isEphemeral: isEphemeral,
        })

    } catch (error) {
        console.error('Error sending message:', error)
        res.status(500).json({ error: 'Failed to send message' })
    }
})

/**
 * DELETE /api/messages/:roomId/:messageId
 * Delete own message.
 */
messagesRouter.delete('/:roomId/:messageId', async (req: AuthenticatedRequest, res) => {
    try {
        const { roomId, messageId } = req.params
        const user = req.user!

        const messageRef = db.collection('chatRooms').doc(roomId).collection('messages').doc(messageId)
        const doc = await messageRef.get()

        if (!doc.exists) {
            res.status(404).json({ error: 'Message not found' })
            return
        }

        if (doc.data()?.uid !== user.uid) {
            res.status(403).json({ error: 'You can only delete your own messages' })
            return
        }

        await messageRef.delete()
        res.json({ success: true })

    } catch (error) {
        console.error('Error deleting message:', error)
        res.status(500).json({ error: 'Failed to delete message' })
    }
})
