import { Router, Response } from 'express'
import { db } from '../../../config/firebaseAdmin'
import { authenticateToken, AuthenticatedRequest } from '../../../middleware/auth'
import { canRemoveMember, canChangeRole, canDeleteWorkspace, canManageMembers, type UserRole } from '../services/permissionsValidator'
import { logAuditEvent, getTeamAnalytics, getTeamActivityLogs } from '../services/auditLogger'
import * as admin from 'firebase-admin'

const router = Router()

// Middleware to verify user token is attached
router.use(authenticateToken)

// ─── GET /workspaces - List user's workspaces ───
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get user's workspace IDs from their profile
    const userDoc = await db.collection('users').doc(uid).get()
    const workspaceIds = userDoc.data()?.workspaceIds || []

    if (workspaceIds.length === 0) {
      return res.json([])
    }

    // Fetch all workspace documents
    const workspaces = await Promise.all(
      (workspaceIds as string[]).map(id =>
        db.collection('workspaces').doc(id).get()
          .then(doc => doc.exists ? { id: doc.id, ...doc.data() } : null)
      )
    )

    res.json(workspaces.filter(Boolean))
  } catch (error) {
    console.error('Error fetching workspaces:', error)
    res.status(500).json({ error: 'Failed to fetch workspaces' })
  }
})

// ─── GET /workspaces/:id - Get single workspace ───
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid
    const { id } = req.params

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Verify user is member of workspace
    const memberDoc = await db
      .collection('workspace-members')
      .doc(`${id}/${uid}`)
      .get()

    if (!memberDoc.exists) {
      return res.status(403).json({ error: 'Not a member of this workspace' })
    }

    const workspaceDoc = await db.collection('workspaces').doc(id).get()
    if (!workspaceDoc.exists) {
      return res.status(404).json({ error: 'Workspace not found' })
    }

    res.json({ id: workspaceDoc.id, ...workspaceDoc.data() })
  } catch (error) {
    console.error('Error fetching workspace:', error)
    res.status(500).json({ error: 'Failed to fetch workspace' })
  }
})

// ─── GET /workspaces/:id/user-role - Get current user's role in workspace ───
router.get('/:id/user-role', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid
    const { id } = req.params

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get user's membership record
    const memberDoc = await db
      .collection('workspace-members')
      .doc(`${id}/${uid}`)
      .get()

    if (!memberDoc.exists || memberDoc.data()?.inviteStatus !== 'active') {
      return res.status(403).json({ error: 'Not a member of this workspace' })
    }

    const role = memberDoc.data()?.role || 'member'
    res.json({ role })
  } catch (error) {
    console.error('Error fetching user role:', error)
    res.status(500).json({ error: 'Failed to fetch user role' })
  }
})

// ─── POST /workspaces - Create new workspace ───
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid
    const userDisplay = req.user?.displayName || 'Unknown'

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { name, description, isPrivate } = req.body

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Workspace name is required' })
    }

    const now = new Date()
    const workspaceRef = db.collection('workspaces').doc()

    // Create workspace
    await workspaceRef.set({
      name: name.trim(),
      description: description || '',
      ownerId: uid,
      ownerName: userDisplay,
      createdAt: now,
      updatedAt: now,
      memberCount: 1,
      isPrivate: isPrivate || false,
    })

    // Add owner as workspace member with owner role
    await db.collection('workspace-members')
      .doc(`${workspaceRef.id}/${uid}`)
      .set({
        userId: uid,
        workspaceId: workspaceRef.id,
        role: 'owner',
        joinedAt: now,
        inviteStatus: 'active',
      })

    // Add workspace ID to user's profile
    const admin = require('firebase-admin')
    await db.collection('users').doc(uid).update({
      workspaceIds: admin.firestore.FieldValue.arrayUnion(workspaceRef.id),
      updatedAt: now,
    })

    res.status(201).json({
      id: workspaceRef.id,
      name,
      description,
      ownerId: uid,
      ownerName: userDisplay,
      createdAt: now,
      updatedAt: now,
      memberCount: 1,
      isPrivate: isPrivate || false,
    })
  } catch (error) {
    console.error('Error creating workspace:', error)
    res.status(500).json({ error: 'Failed to create workspace' })
  }
})

// ─── PUT /workspaces/:id - Update workspace (owner/admin only) ───
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid
    const { id } = req.params
    const { name, description } = req.body

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check if user is owner or admin
    const memberDoc = await db
      .collection('workspace-members')
      .doc(`${id}/${uid}`)
      .get()

    const memberData = memberDoc.data()
    if (!memberDoc.exists || !['owner', 'admin'].includes(memberData?.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    const updateData: any = {
      updatedAt: new Date(),
    }

    if (name && name.trim().length > 0) {
      updateData.name = name.trim()
    }

    if (description !== undefined) {
      updateData.description = description
    }

    await db.collection('workspaces').doc(id).update(updateData)

    res.json({ id, ...updateData })
  } catch (error) {
    console.error('Error updating workspace:', error)
    res.status(500).json({ error: 'Failed to update workspace' })
  }
})

// ─── DELETE /workspaces/:id - Delete workspace (owner only) ───
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid
    const { id } = req.params

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check if user is owner
    const memberDoc = await db
      .collection('workspace-members')
      .doc(`${id}/${uid}`)
      .get()

    const memberData = memberDoc.data()
    if (!memberDoc.exists || memberData?.role !== 'owner') {
      return res.status(403).json({ error: 'Only owner can delete workspace' })
    }

    // Delete workspace
    await db.collection('workspaces').doc(id).delete()

    // Workspace document is removed here; deep cleanup of workspace-linked
    // collections is handled separately to avoid accidental destructive deletes.

    res.json({ message: 'Workspace deleted' })
  } catch (error) {
    console.error('Error deleting workspace:', error)
    res.status(500).json({ error: 'Failed to delete workspace' })
  }
})

// ─── GET /workspaces/:id/members - List workspace members ───
router.get('/:id/members', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid
    const { id } = req.params

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Verify user is member (can list members if you can access workspace)
    const memberDoc = await db
      .collection('workspace-members')
      .doc(`${id}/${uid}`)
      .get()

    if (!memberDoc.exists) {
      return res.status(403).json({ error: 'Not a member of this workspace' })
    }

    // Get all members
    const membersSnapshot = await db
      .collectionGroup('workspace-members')
      .where('workspaceId', '==', id)
      .get()

    const members = membersSnapshot.docs.map(doc => ({
      ...doc.data(),
    }))

    res.json(members)
  } catch (error) {
    console.error('Error fetching workspace members:', error)
    res.status(500).json({ error: 'Failed to fetch members' })
  }
})

// ─── DELETE /workspaces/:id/members/:memberId - Remove member (owner/admin only) ───
router.delete('/:id/members/:memberId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid
    const { id, memberId } = req.params

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get requester's role
    const requesterDoc = await db
      .collection('workspace-members')
      .doc(`${id}/${uid}`)
      .get()

    const requesterData = requesterDoc.data()
    if (!requesterDoc.exists) {
      return res.status(403).json({ error: 'Not a member of this workspace' })
    }

    const requesterRole = requesterData?.role as UserRole

    // Get target member's role
    const memberDoc = await db
      .collection('workspace-members')
      .doc(`${id}/${memberId}`)
      .get()

    const memberData = memberDoc.data()
    if (!memberDoc.exists) {
      return res.status(404).json({ error: 'Member not found' })
    }

    const memberRole = memberData?.role as UserRole

    // Check if requester can remove this member
    if (!canRemoveMember(requesterRole, memberRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to remove this member' })
    }

    // Remove member
    await db.collection('workspace-members')
      .doc(`${id}/${memberId}`)
      .delete()

    // Remove workspace from member's profile
    await db.collection('users').doc(memberId).update({
      workspaceIds: admin.firestore.FieldValue.arrayRemove(id),
      updatedAt: new Date(),
    })

    // Decrement member count
    const workspaceDoc = await db.collection('workspaces').doc(id).get()
    const currentCount = workspaceDoc.data()?.memberCount || 1
    await db.collection('workspaces').doc(id).update({
      memberCount: Math.max(0, currentCount - 1),
    })

    // Log audit event
    await logAuditEvent({
      workspaceId: id,
      action: 'member_removed',
      performedBy: uid,
      performedByName: req.user?.displayName || 'Unknown',
      targetUserId: memberId,
      changes: {
        role: memberRole,
      },
    })

    res.json({ message: 'Member removed' })
  } catch (error) {
    console.error('Error removing member:', error)
    res.status(500).json({ error: 'Failed to remove member' })
  }
})

// ─── PUT /workspaces/:id/members/:memberId/role - Change member role ───
router.put('/:id/members/:memberId/role', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid
    const { id, memberId } = req.params
    const { role: newRole } = req.body

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Validate role
    if (!['member', 'moderator', 'admin', 'owner'].includes(newRole)) {
      return res.status(400).json({ error: 'Invalid role' })
    }

    // Get requester's role
    const requesterDoc = await db
      .collection('workspace-members')
      .doc(`${id}/${uid}`)
      .get()

    const requesterData = requesterDoc.data()
    if (!requesterDoc.exists) {
      return res.status(403).json({ error: 'Not a member of this workspace' })
    }

    const requesterRole = requesterData?.role as UserRole

    // Get target member's current role
    const memberDoc = await db
      .collection('workspace-members')
      .doc(`${id}/${memberId}`)
      .get()

    const memberData = memberDoc.data()
    if (!memberDoc.exists) {
      return res.status(404).json({ error: 'Member not found' })
    }

    const currentRole = memberData?.role as UserRole

    // Cannot change owner's role
    if (currentRole === 'owner') {
      return res.status(400).json({ error: 'Cannot change owner role' })
    }

    // Check if requester can change this member's role
    if (!canChangeRole(requesterRole, currentRole, newRole as UserRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to change this member\'s role' })
    }

    // Update role
    await db.collection('workspace-members')
      .doc(`${id}/${memberId}`)
      .update({
        role: newRole,
        updatedAt: new Date(),
      })

    // Log audit event
    await logAuditEvent({
      workspaceId: id,
      action: 'member_role_changed',
      performedBy: uid,
      performedByName: req.user?.displayName || 'Unknown',
      targetUserId: memberId,
      changes: {
        from: currentRole,
        to: newRole,
      },
    })

    res.json({ userId: memberId, role: newRole, message: 'Role updated' })
  } catch (error) {
    console.error('Error updating member role:', error)
    res.status(500).json({ error: 'Failed to update member role' })
  }
})

// ─── GET /workspaces/:id/analytics - Get team analytics ───
router.get('/:id/analytics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid
    const { id } = req.params

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Verify user is member and has permission to view
    const memberDoc = await db
      .collection('workspace-members')
      .doc(`${id}/${uid}`)
      .get()

    if (!memberDoc.exists) {
      return res.status(403).json({ error: 'Not a member of this workspace' })
    }

    const userRole = memberDoc.data()?.role as UserRole
    if (!canManageMembers(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to view analytics' })
    }

    const analytics = await getTeamAnalytics(id)
    res.json(analytics)
  } catch (error) {
    console.error('Error fetching team analytics:', error)
    res.status(500).json({ error: 'Failed to fetch analytics' })
  }
})

// ─── GET /workspaces/:id/activity-log - Get team activity log ───
router.get('/:id/activity-log', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid
    const { id } = req.params

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Verify user is member and has permission to view
    const memberDoc = await db
      .collection('workspace-members')
      .doc(`${id}/${uid}`)
      .get()

    if (!memberDoc.exists) {
      return res.status(403).json({ error: 'Not a member of this workspace' })
    }

    const userRole = memberDoc.data()?.role as UserRole
    if (!canManageMembers(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to view activity log' })
    }

    const activities = await getTeamActivityLogs(id)
    res.json(activities)
  } catch (error) {
    console.error('Error fetching activity log:', error)
    res.status(500).json({ error: 'Failed to fetch activity log' })
  }
})

export default router

