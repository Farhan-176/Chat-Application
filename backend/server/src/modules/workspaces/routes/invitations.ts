import { Router, Response } from 'express'
import * as admin from 'firebase-admin'
import { db } from '../../../config/firebaseAdmin'
import { authenticateToken, AuthenticatedRequest } from '../../../middleware/auth'
import { canManageMembers, type UserRole } from '../services/permissionsValidator'
import { logAuditEvent } from '../services/auditLogger'

const router = Router()

// Middleware to verify user token is attached
router.use(authenticateToken)

// ─── POST /workspaces/:workspaceId/invitations - Send invite ───
router.post('/:workspaceId/invitations', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid
    const userDisplay = req.user?.displayName || 'User'
    const { workspaceId } = req.params
    const { email, role } = req.body

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Verify requester can manage members
    const memberDoc = await db
      .collection('workspace-members')
      .doc(`${workspaceId}/${uid}`)
      .get()

    const memberData = memberDoc.data()
    if (!memberDoc.exists) {
      return res.status(403).json({ error: 'Not a member of this workspace' })
    }

    const userRole = memberData?.role as UserRole
    if (!canManageMembers(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to send invitations' })
    }

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email address' })
    }

    const validRoles = ['member', 'moderator', 'admin']
    const inviteRole = validRoles.includes(role) ? role : 'member'

    const now = new Date()
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days

    const inviteRef = db.collection('workspace-invitations').doc()
    await inviteRef.set({
      id: inviteRef.id,
      workspaceId,
      email: email.toLowerCase(),
      role: inviteRole,
      status: 'pending',
      invitedBy: uid,
      invitedByName: userDisplay,
      invitedAt: now,
      expiresAt,
    })

    // Log audit event
    await logAuditEvent({
      workspaceId,
      action: 'invitation_sent',
      performedBy: uid,
      performedByName: userDisplay,
      targetEmail: email.toLowerCase(),
      changes: {
        role: inviteRole,
      },
    })

    res.status(201).json({
      id: inviteRef.id,
      workspaceId,
      email: email.toLowerCase(),
      role: inviteRole,
      status: 'pending',
      invitedBy: uid,
      invitedByName: userDisplay,
      invitedAt: now,
      expiresAt,
    })
  } catch (error) {
    console.error('Error sending invitation:', error)
    res.status(500).json({ error: 'Failed to send invitation' })
  }
})

// ─── GET /workspaces/:workspaceId/invitations/pending - List pending invites ───
router.get('/:workspaceId/invitations/pending', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid
    const { workspaceId } = req.params

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Verify user is member of workspace
    const memberDoc = await db
      .collection('workspace-members')
      .doc(`${workspaceId}/${uid}`)
      .get()

    if (!memberDoc.exists) {
      return res.status(403).json({ error: 'Not a member of this workspace' })
    }

    // Check if user has permission to view pending invitations
    const memberData = memberDoc.data()
    const userRole = memberData?.role as UserRole
    if (!canManageMembers(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to view invitations' })
    }

    // Get pending invitations for this workspace
    const invitesSnapshot = await db
      .collection('workspace-invitations')
      .where('workspaceId', '==', workspaceId)
      .where('status', '==', 'pending')
      .orderBy('invitedAt', 'desc')
      .get()

    const invites = invitesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))

    res.json(invites)
  } catch (error) {
    console.error('Error fetching pending invitations:', error)
    res.status(500).json({ error: 'Failed to fetch invitations' })
  }
})

// ─── GET /invitations/for-me - Get my pending invitations ───
router.get('/me/pending', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid
    const userEmail = req.user?.email

    if (!uid || !userEmail) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get pending invitations for this email
    const invitesSnapshot = await db
      .collection('workspace-invitations')
      .where('email', '==', userEmail.toLowerCase())
      .where('status', '==', 'pending')
      .orderBy('invitedAt', 'desc')
      .get()

    const invites = invitesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))

    res.json(invites)
  } catch (error) {
    console.error('Error fetching my invitations:', error)
    res.status(500).json({ error: 'Failed to fetch invitations' })
  }
})

// ─── POST /invitations/:inviteId/accept - Accept invitation ───
router.post('/:inviteId/accept', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid
    const userEmail = req.user?.email
    const displayName = req.user?.displayName || 'User'
    const { inviteId } = req.params

    if (!uid || !userEmail) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get invitation
    const inviteDoc = await db.collection('workspace-invitations').doc(inviteId).get()

    if (!inviteDoc.exists) {
      return res.status(404).json({ error: 'Invitation not found' })
    }

    const inviteData = inviteDoc.data()

    // Verify email matches
    if (inviteData?.email !== userEmail.toLowerCase()) {
      return res.status(403).json({ error: 'This invitation is for a different email' })
    }

    // Verify invitation is still pending
    if (inviteData?.status !== 'pending') {
      return res.status(400).json({ error: 'Invitation is no longer valid' })
    }

    const now = new Date()
    const workspaceId = inviteData?.workspaceId

    // Add user to workspace
    await db.collection('workspace-members')
      .doc(`${workspaceId}/${uid}`)
      .set({
        userId: uid,
        workspaceId,
        role: inviteData?.role || 'member',
        joinedAt: now,
        inviteStatus: 'active',
        invitedBy: inviteData?.invitedBy,
      })

    // Add workspace to user's profile
    const admin = require('firebase-admin')
    await db.collection('users').doc(uid).update({
      workspaceIds: admin.firestore.FieldValue.arrayUnion(workspaceId),
      displayName, // Update display name if not set
      updatedAt: now,
    })

    // Update invitation status
    await db.collection('workspace-invitations').doc(inviteId).update({
      status: 'accepted',
      acceptedAt: now,
    })

    // Increment workspace member count
    await db.collection('workspaces').doc(workspaceId).update({
      memberCount: admin.firestore.FieldValue.increment(1),
    })

    res.json({
      message: 'Invitation accepted',
      workspaceId,
    })
  } catch (error) {
    console.error('Error accepting invitation:', error)
    res.status(500).json({ error: 'Failed to accept invitation' })
  }
})

// ─── POST /invitations/:inviteId/decline - Decline invitation ───
router.post('/:inviteId/decline', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid
    const userEmail = req.user?.email
    const { inviteId } = req.params

    if (!uid || !userEmail) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get invitation
    const inviteDoc = await db.collection('workspace-invitations').doc(inviteId).get()

    if (!inviteDoc.exists) {
      return res.status(404).json({ error: 'Invitation not found' })
    }

    const inviteData = inviteDoc.data()

    // Verify email matches
    if (inviteData?.email !== userEmail.toLowerCase()) {
      return res.status(403).json({ error: 'This invitation is for a different email' })
    }

    // Update invitation status
    await db.collection('workspace-invitations').doc(inviteId).update({
      status: 'declined',
      declinedAt: new Date(),
    })

    res.json({ message: 'Invitation declined' })
  } catch (error) {
    console.error('Error declining invitation:', error)
    res.status(500).json({ error: 'Failed to decline invitation' })
  }
})

export default router

