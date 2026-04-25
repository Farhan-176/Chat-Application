import { Router, Response } from 'express'
import { FieldValue } from 'firebase-admin/firestore'
import { db } from '../../../config/firebaseAdmin'
import { authenticateToken, AuthenticatedRequest } from '../../../middleware/auth'

const router = Router()
const HANDLE_REGEX = /^[a-z0-9_]{3,24}$/

const normalizeHandle = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, '_')
const buildDefaultHandle = (uid: string): string => `user_${uid.slice(0, 8)}`

const sanitizeHandleBase = (value: string): string => {
  const raw = normalizeHandle(value || '')
  const safe = raw.replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '')
  if (!safe) {
    return 'user'
  }
  return safe.slice(0, 18)
}

const buildHandleCandidates = (uid: string, displayName?: string | null, email?: string | null): string[] => {
  const emailPrefix = (email || '').split('@')[0] || ''
  const base = sanitizeHandleBase(displayName || emailPrefix || buildDefaultHandle(uid))
  const uidSuffix = uid.slice(0, 6)

  const candidates = [
    base,
    `${base}_${uidSuffix}`,
    `${base}${uidSuffix}`,
    buildDefaultHandle(uid),
  ]

  for (let i = 1; i <= 6; i += 1) {
    candidates.push(`${base}_${i}`)
  }

  return [...new Set(candidates)].map((candidate) => candidate.slice(0, 24))
}

const findHandleOwner = async (handle: string): Promise<string | null> => {
  const reservedDoc = await db.collection('user_handles').doc(handle).get()
  if (reservedDoc.exists) {
    return String(reservedDoc.data()?.uid || '') || null
  }

  const legacyMatch = await db.collection('users').where('handle', '==', handle).limit(1).get()
  if (!legacyMatch.empty) {
    return legacyMatch.docs[0].id
  }

  return null
}

const reserveHandle = async (uid: string, nextHandle: string): Promise<void> => {
  await db.runTransaction(async (tx) => {
    const userRef = db.collection('users').doc(uid)
    const userDoc = await tx.get(userRef)
    const previousHandle = String(userDoc.data()?.handle || '')

    const nextHandleRef = db.collection('user_handles').doc(nextHandle)
    const nextHandleDoc = await tx.get(nextHandleRef)
    const ownerUid = String(nextHandleDoc.data()?.uid || '')

    if (nextHandleDoc.exists && ownerUid && ownerUid !== uid) {
      throw new Error('HANDLE_TAKEN')
    }

    tx.set(nextHandleRef, {
      uid,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })

    if (previousHandle && previousHandle !== nextHandle) {
      const previousRef = db.collection('user_handles').doc(previousHandle)
      const previousDoc = await tx.get(previousRef)
      const previousOwnerUid = String(previousDoc.data()?.uid || '')
      if (previousDoc.exists && previousOwnerUid === uid) {
        tx.delete(previousRef)
      }
    }

    tx.set(userRef, {
      handle: nextHandle,
      updatedAt: new Date(),
    }, { merge: true })
  })
}

const findFirstAvailableHandle = async (uid: string, candidates: string[]): Promise<string> => {
  for (const candidate of candidates) {
    if (!HANDLE_REGEX.test(candidate)) {
      continue
    }

    const ownerUid = await findHandleOwner(candidate)
    if (!ownerUid || ownerUid === uid) {
      return candidate
    }
  }

  return `${buildDefaultHandle(uid)}_${Date.now().toString().slice(-4)}`.slice(0, 24)
}

const getIdentityStatus = async (uid: string, profile: Record<string, any>) => {
  const displayName = String(profile.displayName || '').trim()
  const handle = normalizeHandle(String(profile.handle || ''))

  const displayNameValid = displayName.length >= 2
  const handleValidFormat = HANDLE_REGEX.test(handle)

  let handleOwnedBySelf = false
  if (handleValidFormat) {
    const ownerUid = await findHandleOwner(handle)
    handleOwnedBySelf = !ownerUid || ownerUid === uid
  }

  const isProfileComplete = displayNameValid && handleValidFormat && handleOwnedBySelf
  const requiresHandleUpdate = !handleValidFormat || !handleOwnedBySelf

  const suggestedHandles = requiresHandleUpdate
    ? buildHandleCandidates(uid, displayName, String(profile.email || ''))
    : []

  return {
    isProfileComplete,
    requiresHandleUpdate,
    displayNameValid,
    handleValidFormat,
    handleOwnedBySelf,
    reason: requiresHandleUpdate ? (handleValidFormat ? 'handle_conflict' : 'invalid_handle') : undefined,
    suggestedHandles,
  }
}

const ensureProfile = async (req: AuthenticatedRequest, uid: string) => {
  const userRef = db.collection('users').doc(uid)
  let userDoc = await userRef.get()

  if (!userDoc.exists) {
    const now = new Date()
    const handle = await findFirstAvailableHandle(
      uid,
      buildHandleCandidates(uid, req.user?.displayName, req.user?.email)
    )

    const profile = {
      uid,
      email: req.user?.email || '',
      displayName: req.user?.displayName || 'User',
      photoURL: req.user?.photoURL || null,
      bio: '',
      role: 'user',
      workspaceIds: [],
      handle,
      isEmailVerified: false,
      createdAt: now,
      updatedAt: now,
    }

    await userRef.set(profile)
    await db.collection('user_handles').doc(handle).set({
      uid,
      updatedAt: now,
    }, { merge: true })

    userDoc = await userRef.get()
  }

  const profile = userDoc.data() || {}
  const normalizedHandle = normalizeHandle(String(profile.handle || ''))

  if (!HANDLE_REGEX.test(normalizedHandle)) {
    const replacement = await findFirstAvailableHandle(
      uid,
      buildHandleCandidates(uid, String(profile.displayName || req.user?.displayName || ''), String(profile.email || req.user?.email || ''))
    )
    await reserveHandle(uid, replacement)
    userDoc = await userRef.get()
  } else {
    const ownerUid = await findHandleOwner(normalizedHandle)
    if (!ownerUid || ownerUid === uid) {
      await db.collection('user_handles').doc(normalizedHandle).set({
        uid,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true })
    }
  }

  return userDoc.data() || {}
}

router.use(authenticateToken)

router.get('/me', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const profile = await ensureProfile(req, uid)
    const identity = await getIdentityStatus(uid, profile)

    return res.json({ uid, ...profile, identity })
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return res.status(500).json({ error: 'Failed to fetch profile' })
  }
})

router.get('/handle/:handle/availability', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const requesterUid = req.user?.uid
    if (!requesterUid) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const requested = normalizeHandle(req.params.handle || '')
    if (!HANDLE_REGEX.test(requested)) {
      return res.status(400).json({
        available: false,
        reason: 'Handle must be 3-24 characters, lowercase letters, numbers, or underscore.',
      })
    }

    const ownerUid = await findHandleOwner(requested)
    const available = !ownerUid || ownerUid === requesterUid

    return res.json({
      available,
      handle: requested,
      reason: available ? undefined : 'Handle is already in use.',
    })
  } catch (error) {
    console.error('Error checking handle availability:', error)
    return res.status(500).json({ error: 'Failed to check handle availability' })
  }
})

router.get('/:uid', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { uid } = req.params

    const userDoc = await db.collection('users').doc(uid).get()

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' })
    }

    const data = userDoc.data()
    return res.json({
      uid,
      displayName: data?.displayName,
      photoURL: data?.photoURL,
      bio: data?.bio,
      handle: data?.handle,
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return res.status(500).json({ error: 'Failed to fetch user' })
  }
})

router.put('/me', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { displayName, bio, photoURL, handle } = req.body

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (displayName !== undefined) {
      if (typeof displayName !== 'string' || displayName.trim().length < 2) {
        return res.status(400).json({ error: 'Display name must be at least 2 characters.' })
      }
      updateData.displayName = displayName.trim()
    }

    if (bio !== undefined) {
      updateData.bio = typeof bio === 'string' ? bio.slice(0, 160) : ''
    }

    if (photoURL !== undefined) {
      updateData.photoURL = photoURL
    }

    if (handle !== undefined) {
      if (typeof handle !== 'string') {
        return res.status(400).json({ error: 'Handle must be a string.' })
      }

      const normalizedHandle = normalizeHandle(handle)
      if (!HANDLE_REGEX.test(normalizedHandle)) {
        return res.status(400).json({
          error: 'Handle must be 3-24 characters and contain only lowercase letters, numbers, or underscore.',
        })
      }

      const existingOwner = await findHandleOwner(normalizedHandle)
      if (existingOwner && existingOwner !== uid) {
        const candidatePool = buildHandleCandidates(uid, String(displayName || req.user?.displayName || ''), String(req.user?.email || ''))
        const suggestedHandles: string[] = []

        for (const candidate of candidatePool) {
          const ownerUid = await findHandleOwner(candidate)
          if (!ownerUid || ownerUid === uid) {
            suggestedHandles.push(candidate)
          }
          if (suggestedHandles.length >= 4) {
            break
          }
        }

        return res.status(409).json({
          error: 'Handle is already taken.',
          suggestedHandles,
        })
      }

      await reserveHandle(uid, normalizedHandle)
      updateData.handle = normalizedHandle
    }

    await db.collection('users').doc(uid).set(updateData, { merge: true })

    const updated = await db.collection('users').doc(uid).get()
    const updatedData = updated.data() || {}
    const identity = await getIdentityStatus(uid, updatedData)

    return res.json({ uid, ...updatedData, identity })
  } catch (error) {
    if ((error as Error).message === 'HANDLE_TAKEN') {
      return res.status(409).json({ error: 'Handle is already taken.' })
    }
    console.error('Error updating profile:', error)
    return res.status(500).json({ error: 'Failed to update profile' })
  }
})

router.post('/:uid/verify-email', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const requestingUid = req.user?.uid
    if (!requestingUid) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const requesterDoc = await db.collection('users').doc(requestingUid).get()
    const requesterRole = requesterDoc.data()?.role
    if (requesterRole !== 'admin' && requesterRole !== 'owner') {
      return res.status(403).json({ error: 'Only admins can verify user emails' })
    }

    const { uid } = req.params

    await db.collection('users').doc(uid).update({
      isEmailVerified: true,
      updatedAt: new Date(),
    })

    return res.json({ message: 'Email verified' })
  } catch (error) {
    console.error('Error verifying email:', error)
    return res.status(500).json({ error: 'Failed to verify email' })
  }
})

export default router
