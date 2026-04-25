/**
 * Voice & Video Calls API Routes
 * Using Agora for WebRTC infrastructure
 */

import { Router } from 'express'
import { auth } from '../../../middleware/auth'
import { generateAgoraToken } from '../../../config/agora'

const router = Router()

/**
 * POST /api/calls/token
 * Request Agora token to join a video call
 * Body: { roomId, userId }
 */
router.post('/token', auth, async (req, res) => {
  try {
    const { roomId } = req.body
    const userId = req.user?.uid

    if (!roomId || !userId) {
      return res.status(400).json({ error: 'roomId and userId required' })
    }

    const token = generateAgoraToken(userId, `room_${roomId}`, 'publisher')

    res.json({
      token,
      channelName: `room_${roomId}`,
      uid: userId,
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
    })
  } catch (error) {
    console.error('Failed to generate Agora token:', error)
    res.status(500).json({ error: 'Token generation failed' })
  }
})

/**
 * POST /api/calls/:roomId/start
 * Initiate a voice/video call in a room
 */
router.post('/:roomId/start', auth, async (req, res) => {
  try {
    const { roomId } = req.params
    const userId = req.user?.uid

    // Log call initiation event
    console.log(`Call initiated in room ${roomId} by ${userId}`)

    res.json({
      success: true,
      callId: `call_${Date.now()}`,
      roomId,
      initiator: userId,
    })
  } catch (error) {
    console.error('Failed to start call:', error)
    res.status(500).json({ error: 'Call start failed' })
  }
})

/**
 * POST /api/calls/:roomId/end
 * End an active voice/video call
 */
router.post('/:roomId/end', auth, async (req, res) => {
  try {
    const { roomId } = req.params
    const userId = req.user?.uid

    console.log(`Call ended in room ${roomId} by ${userId}`)

    res.json({
      success: true,
      roomId,
      endedBy: userId,
    })
  } catch (error) {
    console.error('Failed to end call:', error)
    res.status(500).json({ error: 'Call end failed' })
  }
})

/**
 * GET /api/calls/:roomId/active
 * Check if a call is currently active in a room
 */
router.get('/:roomId/active', auth, async (req, res) => {
  try {
    const { roomId } = req.params

    // In production, would check Agora channel status
    res.json({
      active: false,
      participantCount: 0,
      channelName: `room_${roomId}`,
    })
  } catch (error) {
    console.error('Failed to check call status:', error)
    res.status(500).json({ error: 'Status check failed' })
  }
})

export default router
