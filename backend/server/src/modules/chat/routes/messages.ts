import { Router } from 'express'
import { authMiddleware, AuthenticatedRequest } from '../../../middleware/auth.js'
import { db } from '../../../config/firebaseAdmin.js'
import { analyzeMood } from '../services/moodAnalyzer.js'
import { ephemeralManager } from '../services/ephemeralManager.js'
import { DocumentReference, FieldValue } from 'firebase-admin/firestore'
import { sanitizeLanguageCode, translateText } from '../services/translator.js'
import { featureFlags } from '../../../config/featureFlags.js'

export const messagesRouter = Router()

// All routes require authentication
messagesRouter.use(authMiddleware)

interface AttachmentPayload {
    name: string
    url: string
    type: string
    size: number
}

interface ModerationReportPayload {
    id: string
    roomId: string
    messageId: string
    reason: string
    status: 'open' | 'resolved'
    reporterUid: string
    reporterName: string
    createdAt: string | null
    messagePreview: string
    reportedUid?: string
    reportedDisplayName?: string
}

const sanitizeAttachments = (attachments: unknown): AttachmentPayload[] => {
    if (!Array.isArray(attachments)) {
        return []
    }

    return attachments
        .filter((item): item is AttachmentPayload => {
            return !!item
                && typeof item === 'object'
                && typeof (item as AttachmentPayload).name === 'string'
                && typeof (item as AttachmentPayload).url === 'string'
                && typeof (item as AttachmentPayload).type === 'string'
                && typeof (item as AttachmentPayload).size === 'number'
        })
        .slice(0, 8)
}

const REPORT_REASONS = ['spam', 'harassment', 'abuse', 'off-topic', 'other'] as const

const canAccessPrivateRoom = async (roomId: string, uid: string) => {
    const roomRef = db.collection('chatRooms').doc(roomId)
    const roomDoc = await roomRef.get()

    if (!roomDoc.exists) {
        return { roomRef, roomData: null as Record<string, any> | null, allowed: false }
    }

    const roomData = roomDoc.data() as Record<string, any>
    if (roomData.visibility !== 'private' || roomData.createdBy === uid) {
        return { roomRef, roomData, allowed: true }
    }

    const memberDoc = await roomRef.collection('members').doc(uid).get()
    return { roomRef, roomData, allowed: memberDoc.exists }
}

const hasModerationAccess = async (roomRef: DocumentReference, roomData: Record<string, any>, uid: string) => {
    if (roomData.createdBy === uid) {
        return true
    }

    const memberDoc = await roomRef.collection('members').doc(uid).get()
    if (!memberDoc.exists) {
        return false
    }

    const memberRole = memberDoc.data()?.role
    return memberRole === 'owner' || memberRole === 'admin' || memberRole === 'moderator'
}

/**
 * POST /api/messages/:roomId
 * Send a message with AI mood analysis.
 * Body: { text: string, isEphemeral?: boolean, ttl?: number }
 */
messagesRouter.post('/:roomId', async (req: AuthenticatedRequest, res) => {
    try {
        const { roomId } = req.params
        const { 
            text, 
            isEphemeral = false, 
            ttl = 30, 
            attachments = [],
            sealedUntil = null,
            capsuleLabel = ''
        } = req.body
        const user = req.user!

        const normalizedAttachments = sanitizeAttachments(attachments)

        if ((!text || typeof text !== 'string' || text.trim().length === 0) && normalizedAttachments.length === 0) {
            res.status(400).json({ error: 'Message text is required' })
            return
        }

        if (text && text.length > 2000) {
            res.status(400).json({ error: 'Message too long (max 2000 characters)' })
            return
        }

        const { roomRef, roomData, allowed } = await canAccessPrivateRoom(roomId, user.uid)

        if (!roomData) {
            res.status(404).json({ error: 'Room not found' })
            return
        }

        if (!allowed) {
            res.status(403).json({ error: 'Invite-only room access denied' })
            return
        }

        const workspaceId = roomData.workspaceId

        const normalizedText = typeof text === 'string' ? text.trim() : ''
        const normalizedSealedUntil = sealedUntil ? new Date(sealedUntil) : null

        // Build the base message document (immediately deliverable)
        const messageData: Record<string, any> = {
            text: normalizedText,
            uid: user.uid,
            displayName: user.displayName || 'Anonymous',
            photoURL: user.photoURL || null,
            createdAt: FieldValue.serverTimestamp(),
            // AI enrichment will happen after initial write
            mood: 'Neutral',
            moodEmoji: '😐',
            moodColor: '#94a3b8',
            moodConfidence: 0.1,
            aiProcessed: false,
            reactions: {},
            sealedUntil: normalizedSealedUntil,
            capsuleLabel: typeof capsuleLabel === 'string' ? capsuleLabel.trim().slice(0, 50) : '',
        }

        if (normalizedAttachments.length > 0) {
            messageData.attachments = normalizedAttachments
        }

        // Add workspaceId to message if room has one
        if (workspaceId) {
            messageData.workspaceId = workspaceId
        }

        // Add ephemeral fields if ghost mode is on
        if (isEphemeral) {
            const clampedTTL = Math.min(Math.max(ttl, 5), 300) // 5s to 5min
            messageData.isEphemeral = true
            messageData.ttl = clampedTTL
            messageData.status = 'active'
        }

        // Write to Firestore (Phase 1: Delivery)
        const messageRef = roomRef.collection('messages').doc();
        await messageRef.set(messageData);

        // Async Phase 2: AI Enrichment & Ephemeral Scheduling
        // This prevents the user from waiting 1-3s for Gemini to respond
        (async () => {
            try {
                // 1. Run mood analysis via Gemini
                if (normalizedText.length === 0) {
                    await messageRef.update({ aiProcessed: true })
                    return
                }

                const moodResult = await analyzeMood(normalizedText.slice(0, 2000));
                
                // 2. Update message with AI results
                await messageRef.update({
                    mood: moodResult.mood,
                    moodEmoji: moodResult.emoji,
                    moodColor: moodResult.color,
                    moodConfidence: moodResult.confidence,
                    aiProcessed: true,
                });

                // 3. If ephemeral, schedule server-side destruction
                if (isEphemeral) {
                    await ephemeralManager.scheduleDestruction(roomId, messageRef.id, messageData.ttl);
                }
                
                console.log(`✅ Message ${messageRef.id} enriched and scheduled (async)`);
            } catch (err) {
                console.error(`❌ Async message enrichment failed for ${messageRef.id}:`, err);
            }
        })();

        res.status(201).json({
            id: messageRef.id,
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

/**
 * PUT /api/messages/:roomId/:messageId
 * Edit own message text.
 * Body: { text: string }
 */
messagesRouter.put('/:roomId/:messageId', async (req: AuthenticatedRequest, res) => {
    try {
        const { roomId, messageId } = req.params
        const { text } = req.body
        const user = req.user!

        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            res.status(400).json({ error: 'Message text is required' })
            return
        }

        if (text.length > 2000) {
            res.status(400).json({ error: 'Message too long (max 2000 characters)' })
            return
        }

        const messageRef = db.collection('chatRooms').doc(roomId).collection('messages').doc(messageId)
        const doc = await messageRef.get()

        if (!doc.exists) {
            res.status(404).json({ error: 'Message not found' })
            return
        }

        if (doc.data()?.uid !== user.uid) {
            res.status(403).json({ error: 'You can only edit your own messages' })
            return
        }

        await messageRef.update({
            text: text.trim(),
            edited: true,
            editedAt: FieldValue.serverTimestamp(),
        })

        res.json({ success: true })
    } catch (error) {
        console.error('Error editing message:', error)
        res.status(500).json({ error: 'Failed to edit message' })
    }
})

/**
 * POST /api/messages/:roomId/:messageId/reactions
 * Toggle reaction for current user on message.
 * Body: { emoji: string }
 */
messagesRouter.post('/:roomId/:messageId/reactions', async (req: AuthenticatedRequest, res) => {
    try {
        const { roomId, messageId } = req.params
        const { emoji } = req.body
        const user = req.user!

        if (!emoji || typeof emoji !== 'string' || emoji.trim().length === 0) {
            res.status(400).json({ error: 'Emoji is required' })
            return
        }

        const normalizedEmoji = emoji.trim().slice(0, 16)
        const messageRef = db.collection('chatRooms').doc(roomId).collection('messages').doc(messageId)
        const messageDoc = await messageRef.get()

        if (!messageDoc.exists) {
            res.status(404).json({ error: 'Message not found' })
            return
        }

        const data = messageDoc.data() || {}
        const currentReactions = (data.reactions || {}) as Record<string, string[]>
        const currentUsers = Array.isArray(currentReactions[normalizedEmoji]) ? currentReactions[normalizedEmoji] : []
        const alreadyReacted = currentUsers.includes(user.uid)

        const nextUsers = alreadyReacted
            ? currentUsers.filter((uid) => uid !== user.uid)
            : [...new Set([...currentUsers, user.uid])]

        const nextReactions = {
            ...currentReactions,
            [normalizedEmoji]: nextUsers,
        }

        if (nextUsers.length === 0) {
            delete nextReactions[normalizedEmoji]
        }

        await messageRef.update({
            reactions: nextReactions,
        })

        res.json({ success: true })
    } catch (error) {
        console.error('Error toggling message reaction:', error)
        res.status(500).json({ error: 'Failed to update message reaction' })
    }
})

/**
 * GET /api/messages/:roomId/search?q=...&maxResults=100
 * Basic full-text style search over recent room messages.
 */
messagesRouter.get('/:roomId/search', async (req: AuthenticatedRequest, res) => {
    try {
        const { roomId } = req.params
        const user = req.user!
        const q = String(req.query.q || '').trim().toLowerCase()
        const maxResultsRaw = Number(req.query.maxResults || 100)
        const maxResults = Number.isFinite(maxResultsRaw) ? Math.min(Math.max(maxResultsRaw, 1), 200) : 100

        if (!q) {
            res.json({ messages: [] })
            return
        }

        const { roomRef, roomData, allowed } = await canAccessPrivateRoom(roomId, user.uid)

        if (!roomData) {
            res.status(404).json({ error: 'Room not found' })
            return
        }

        if (!allowed) {
            res.status(403).json({ error: 'Invite-only room access denied' })
            return
        }

        const snapshot = await roomRef
            .collection('messages')
            .orderBy('createdAt', 'desc')
            .limit(1000)
            .get()

        const queryTokens = q.split(/\s+/).filter((token) => token.length > 1)
        const scoredMatches: Array<(Record<string, any> & { _score: number }) | null> = snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, any>))
            .map((message) => {
                const text = typeof message.text === 'string' ? message.text : ''
                const normalizedText = text.toLowerCase()
                const normalizedName = String(message.displayName || '').toLowerCase()

                let score = 0
                if (normalizedText.includes(q)) {
                    score += 10
                }

                queryTokens.forEach((token) => {
                    if (normalizedText.includes(token)) {
                        score += 3
                    }
                    if (normalizedName.includes(token)) {
                        score += 1
                    }
                })

                if (score === 0) {
                    return null
                }

                return {
                    ...message,
                    _score: score,
                    createdAt: message.createdAt?.toDate?.()?.toISOString() || null,
                    editedAt: message.editedAt?.toDate?.()?.toISOString() || null,
                }
            })

        const matches = scoredMatches
            .filter((message): message is Record<string, any> & { _score: number } => !!message)
            .sort((a, b) => {
                if ((b._score || 0) !== (a._score || 0)) {
                    return (b._score || 0) - (a._score || 0)
                }
                return String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
            })
            .slice(0, maxResults)
            .map(({ _score, ...message }) => message)

        res.json({ messages: matches })
    } catch (error) {
        console.error('Error searching messages:', error)
        res.status(500).json({ error: 'Failed to search messages' })
    }
})

/**
 * POST /api/messages/:roomId/translations
 * Translate a batch of messages and cache translated variants on message docs.
 * Body: { messageIds: string[], targetLanguage: string }
 */
messagesRouter.post('/:roomId/translations', async (req: AuthenticatedRequest, res) => {
    try {
        if (!featureFlags.roomTranslationToggle) {
            res.status(404).json({ error: 'Translation feature is disabled' })
            return
        }

        const { roomId } = req.params
        const user = req.user!
        const messageIds = Array.isArray(req.body?.messageIds)
            ? req.body.messageIds.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
            : []
        const requestedTargetLanguage = String(req.body?.targetLanguage || 'en')
        const targetLanguage = sanitizeLanguageCode(requestedTargetLanguage)

        if (messageIds.length === 0) {
            res.status(400).json({ error: 'messageIds must contain at least one id' })
            return
        }

        if (messageIds.length > 120) {
            res.status(400).json({ error: 'messageIds limit exceeded (max 120)' })
            return
        }

        const { roomRef, roomData, allowed } = await canAccessPrivateRoom(roomId, user.uid)
        if (!roomData) {
            res.status(404).json({ error: 'Room not found' })
            return
        }
        if (!allowed) {
            res.status(403).json({ error: 'Invite-only room access denied' })
            return
        }

        const translations: Record<string, { text: string; sourceLanguage: string; targetLanguage: string; cached: boolean }> = {}

        for (const messageId of messageIds) {
            const messageRef = roomRef.collection('messages').doc(messageId)
            const messageDoc = await messageRef.get()
            if (!messageDoc.exists) {
                continue
            }

            const messageData = messageDoc.data() || {}
            const messageText = String(messageData.text || '').trim()
            if (!messageText) {
                continue
            }

            const cachedEntry = messageData.translations?.[targetLanguage]
            const cachedText = String(cachedEntry?.text || '').trim()
            if (cachedText) {
                translations[messageId] = {
                    text: cachedText,
                    sourceLanguage: String(cachedEntry?.sourceLanguage || 'auto'),
                    targetLanguage,
                    cached: true,
                }
                continue
            }

            const translated = await translateText(messageText, targetLanguage)
            translations[messageId] = {
                text: translated.text,
                sourceLanguage: translated.sourceLanguage,
                targetLanguage: translated.targetLanguage,
                cached: false,
            }

            await messageRef.set({
                [`translations.${targetLanguage}`]: {
                    text: translated.text,
                    sourceLanguage: translated.sourceLanguage,
                    targetLanguage: translated.targetLanguage,
                    provider: translated.provider,
                    translatedAt: FieldValue.serverTimestamp(),
                },
            }, { merge: true })
        }

        res.json({
            roomId,
            targetLanguage,
            translations,
        })
    } catch (error) {
        console.error('Error translating messages:', error)
        res.status(500).json({ error: 'Failed to translate messages' })
    }
})

/**
 * POST /api/messages/:roomId/translations/prewarm
 * Pre-warm cached translations for recent room messages.
 * Body: { targetLanguage?: string, limit?: number }
 * Access: room creator/admin/moderator only.
 */
messagesRouter.post('/:roomId/translations/prewarm', async (req: AuthenticatedRequest, res) => {
    try {
        if (!featureFlags.roomTranslationToggle) {
            res.status(404).json({ error: 'Translation feature is disabled' })
            return
        }

        const { roomId } = req.params
        const user = req.user!
        const requestedTargetLanguage = String(req.body?.targetLanguage || '')
        const limitRaw = Number(req.body?.limit || 120)
        const maxMessages = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 120

        const { roomRef, roomData } = await canAccessPrivateRoom(roomId, user.uid)
        if (!roomData) {
            res.status(404).json({ error: 'Room not found' })
            return
        }

        const canModerate = await hasModerationAccess(roomRef, roomData, user.uid)
        if (!canModerate) {
            res.status(403).json({ error: 'Moderation access denied' })
            return
        }

        const fallbackLanguage = String(roomData.defaultLanguage || 'en')
        const targetLanguage = sanitizeLanguageCode(requestedTargetLanguage || fallbackLanguage)

        const snapshot = await roomRef
            .collection('messages')
            .orderBy('createdAt', 'desc')
            .limit(maxMessages)
            .get()

        let translatedCount = 0
        let cachedCount = 0
        let skippedCount = 0

        for (const docSnap of snapshot.docs) {
            const messageRef = docSnap.ref
            const messageData = docSnap.data() || {}
            const messageText = String(messageData.text || '').trim()

            if (!messageText) {
                skippedCount += 1
                continue
            }

            const cachedEntry = messageData.translations?.[targetLanguage]
            const cachedText = String(cachedEntry?.text || '').trim()
            if (cachedText) {
                cachedCount += 1
                continue
            }

            const translated = await translateText(messageText, targetLanguage)
            await messageRef.set({
                [`translations.${targetLanguage}`]: {
                    text: translated.text,
                    sourceLanguage: translated.sourceLanguage,
                    targetLanguage: translated.targetLanguage,
                    provider: translated.provider,
                    translatedAt: FieldValue.serverTimestamp(),
                },
            }, { merge: true })

            translatedCount += 1
        }

        res.json({
            success: true,
            roomId,
            targetLanguage,
            scanned: snapshot.size,
            translated: translatedCount,
            cached: cachedCount,
            skipped: skippedCount,
        })
    } catch (error) {
        console.error('Error prewarming message translations:', error)
        res.status(500).json({ error: 'Failed to prewarm translations' })
    }
})

/**
 * POST /api/messages/:roomId/:messageId/report
 * Report a message for moderation review.
 * Body: { reason: 'spam' | 'harassment' | 'abuse' | 'off-topic' | 'other', note?: string }
 */
messagesRouter.post('/:roomId/:messageId/report', async (req: AuthenticatedRequest, res) => {
    try {
        const { roomId, messageId } = req.params
        const user = req.user!
        const reasonRaw = String(req.body?.reason || '').trim().toLowerCase()
        const noteRaw = String(req.body?.note || '').trim()

        if (!REPORT_REASONS.includes(reasonRaw as (typeof REPORT_REASONS)[number])) {
            res.status(400).json({ error: 'Invalid report reason' })
            return
        }

        const { roomRef, roomData, allowed } = await canAccessPrivateRoom(roomId, user.uid)
        if (!roomData) {
            res.status(404).json({ error: 'Room not found' })
            return
        }
        if (!allowed) {
            res.status(403).json({ error: 'Invite-only room access denied' })
            return
        }

        const messageRef = roomRef.collection('messages').doc(messageId)
        const messageDoc = await messageRef.get()
        if (!messageDoc.exists) {
            res.status(404).json({ error: 'Message not found' })
            return
        }

        const messageData = messageDoc.data() || {}
        const reportId = `${roomId}_${messageId}_${user.uid}`
        const reportRef = db.collection('messageReports').doc(reportId)
        await reportRef.set({
            roomId,
            messageId,
            reason: reasonRaw,
            note: noteRaw.slice(0, 300),
            status: 'open',
            reporterUid: user.uid,
            reporterName: user.displayName || user.email || 'Anonymous',
            reportedUid: messageData.uid || null,
            reportedDisplayName: messageData.displayName || 'Unknown',
            messagePreview: String(messageData.text || '').slice(0, 220),
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true })

        res.status(201).json({ success: true, reportId })
    } catch (error) {
        console.error('Error reporting message:', error)
        res.status(500).json({ error: 'Failed to report message' })
    }
})

/**
 * GET /api/messages/:roomId/reports?status=open
 * List moderation reports for a room. Creator/admin/moderator only.
 */
messagesRouter.get('/:roomId/reports', async (req: AuthenticatedRequest, res) => {
    try {
        const { roomId } = req.params
        const user = req.user!
        const status = String(req.query.status || 'open').toLowerCase() === 'resolved' ? 'resolved' : 'open'

        const { roomRef, roomData } = await canAccessPrivateRoom(roomId, user.uid)
        if (!roomData) {
            res.status(404).json({ error: 'Room not found' })
            return
        }

        const canModerate = await hasModerationAccess(roomRef, roomData, user.uid)
        if (!canModerate) {
            res.status(403).json({ error: 'Moderation access denied' })
            return
        }

        const snapshot = await db
            .collection('messageReports')
            .where('roomId', '==', roomId)
            .where('status', '==', status)
            .orderBy('createdAt', 'desc')
            .limit(150)
            .get()

        const reports: ModerationReportPayload[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data()
            return {
                id: docSnap.id,
                roomId,
                messageId: data.messageId,
                reason: data.reason,
                status: data.status,
                reporterUid: data.reporterUid,
                reporterName: data.reporterName || 'Unknown',
                createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
                messagePreview: data.messagePreview || '',
                reportedUid: data.reportedUid,
                reportedDisplayName: data.reportedDisplayName,
            }
        })

        res.json({ reports })
    } catch (error) {
        console.error('Error fetching moderation reports:', error)
        res.status(500).json({ error: 'Failed to fetch moderation reports' })
    }
})

/**
 * POST /api/messages/:roomId/:messageId/moderate-delete
 * Delete a reported message (creator/admin/moderator) and resolve associated reports.
 * Body: { reportId?: string }
 */
messagesRouter.post('/:roomId/:messageId/moderate-delete', async (req: AuthenticatedRequest, res) => {
    try {
        const { roomId, messageId } = req.params
        const user = req.user!
        const reportId = String(req.body?.reportId || '').trim()

        const { roomRef, roomData } = await canAccessPrivateRoom(roomId, user.uid)
        if (!roomData) {
            res.status(404).json({ error: 'Room not found' })
            return
        }

        const canModerate = await hasModerationAccess(roomRef, roomData, user.uid)
        if (!canModerate) {
            res.status(403).json({ error: 'Moderation access denied' })
            return
        }

        const messageRef = roomRef.collection('messages').doc(messageId)
        const messageDoc = await messageRef.get()
        if (!messageDoc.exists) {
            res.status(404).json({ error: 'Message not found' })
            return
        }

        await messageRef.delete()

        const reportRefs: DocumentReference[] = []
        if (reportId) {
            reportRefs.push(db.collection('messageReports').doc(reportId))
        } else {
            const reportsSnapshot = await db.collection('messageReports')
                .where('roomId', '==', roomId)
                .where('messageId', '==', messageId)
                .where('status', '==', 'open')
                .limit(150)
                .get()
            reportsSnapshot.docs.forEach((docSnap) => reportRefs.push(docSnap.ref))
        }

        if (reportRefs.length > 0) {
            const batch = db.batch()
            reportRefs.forEach((reportRef) => {
                batch.set(reportRef, {
                    status: 'resolved',
                    resolvedBy: user.uid,
                    resolvedAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                }, { merge: true })
            })
            await batch.commit()
        }

        res.json({ success: true })
    } catch (error) {
        console.error('Error moderating message:', error)
        res.status(500).json({ error: 'Failed to moderate message' })
    }
})

