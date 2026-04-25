/**
 * AI Intelligence API Routes
 * Deep contextual AI for routing, moderation, and summaries
 */

import { Router } from 'express'
import { auth } from '../../../middleware/auth'
import { analyzeMessageContext, analyzeForModeration, generateAIDigest } from '../../../config/llm'

const router = Router()

/**
 * POST /api/ai/analyze-message
 * Analyze message context for intelligent routing
 * Body: { text, roomId, senderRole }
 */
router.post('/analyze-message', auth, async (req, res) => {
  try {
    const { text, roomId, senderRole } = req.body

    if (!text || !roomId) {
      return res.status(400).json({ error: 'text and roomId required' })
    }

    const analysis = await analyzeMessageContext(text, senderRole || 'member', 'general')

    res.json({
      success: true,
      analysis,
      messageId: req.body.messageId || null,
    })
  } catch (error) {
    console.error('Failed to analyze message:', error)
    res.status(500).json({ error: 'Analysis failed' })
  }
})

/**
 * POST /api/ai/moderate
 * AI-powered moderation with context awareness
 * Body: { text, roomId }
 */
router.post('/moderate', auth, async (req, res) => {
  try {
    const { text, roomId } = req.body

    if (!text || !roomId) {
      return res.status(400).json({ error: 'text and roomId required' })
    }

    const decision = await analyzeForModeration(text, {
      senderRole: req.user?.role || 'member',
      roomTopic: 'general',
      history: [],
    })

    res.json({
      success: true,
      decision,
    })
  } catch (error) {
    console.error('Failed to moderate message:', error)
    res.status(500).json({ error: 'Moderation failed' })
  }
})

/**
 * POST /api/ai/digest
 * Generate AI-powered intelligent digest
 * Body: { roomId, messageIds, targetLanguage }
 */
router.post('/digest', auth, async (req, res) => {
  try {
    const { roomId, messageIds, targetLanguage = 'en' } = req.body

    if (!roomId || !messageIds || messageIds.length === 0) {
      return res.status(400).json({ error: 'roomId and messageIds required' })
    }

    // In production, would fetch messages from Firestore
    const mockMessages = messageIds.map((id: string, idx: number) => ({
      text: `Message ${idx}`,
      sender: 'User',
      createdAt: new Date(),
    }))

    const digest = await generateAIDigest(mockMessages, targetLanguage)

    res.json({
      success: true,
      digest,
      generatedAt: new Date(),
    })
  } catch (error) {
    console.error('Failed to generate AI digest:', error)
    res.status(500).json({ error: 'Digest generation failed' })
  }
})

/**
 * POST /api/ai/smart-route
 * Route message to appropriate handler/person based on AI analysis
 * Body: { text, roomId, urgencyLevel }
 */
router.post('/smart-route', auth, async (req, res) => {
  try {
    const { text, roomId, urgencyLevel } = req.body

    if (!text || !roomId) {
      return res.status(400).json({ error: 'text and roomId required' })
    }

    const analysis = await analyzeMessageContext(text, 'member', 'general')

    res.json({
      success: true,
      routing: {
        priority: analysis.priority,
        category: analysis.category,
        suggestedHandlers: [], // Would populate with team members
        escalationPath: analysis.priority === 'urgent' ? ['manager', 'lead'] : [],
      },
    })
  } catch (error) {
    console.error('Failed to route message:', error)
    res.status(500).json({ error: 'Routing failed' })
  }
})

export default router
