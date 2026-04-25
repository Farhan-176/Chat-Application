import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { onDocumentCreated, onDocumentDeleted } from 'firebase-functions/v2/firestore'
import { logger } from 'firebase-functions'
import { user } from 'firebase-functions/v1/auth'

initializeApp()

/**
 * Cloud Function: cleanup user-linked Firestore data when Auth user is deleted.
 * Extend this function as your data model evolves.
 */
export const cleanupDeletedUserData = user().onDelete(async (deletedUser) => {
  const uid = deletedUser.uid
  const email = deletedUser.email || null

  if (!uid) {
    logger.warn('User deletion event received without uid')
    return
  }

  const db = getFirestore()
  const batch = db.batch()

  // Remove main profile
  batch.delete(db.doc(`users/${uid}`))

  // NOTE: workspace-members is modeled as workspace-members/{workspaceId}/{uid}.
  // Because subcollection names are dynamic workspace IDs, bulk lookup by uid
  // requires either maintaining a reverse index or iterating known workspaces.
  // Add that logic here once workspace indexing is available.

  // Remove room presence + typing records for this user
  const roomsSnapshot = await db.collection('chatRooms').get()
  roomsSnapshot.docs.forEach((roomDoc) => {
    batch.delete(roomDoc.ref.collection('presence').doc(uid))
    batch.delete(roomDoc.ref.collection('typing').doc(uid))
  })

  // Remove pending invitations for this email when available
  if (email) {
    const invites = await db.collection('workspace-invitations').where('email', '==', email).get()
    invites.docs.forEach((inviteDoc) => batch.delete(inviteDoc.ref))
  }

  await batch.commit()
  logger.info('Completed cleanup for deleted user', { uid })
})

async function syncRoomMemberCount(roomId: string) {
  const db = getFirestore()
  const roomRef = db.collection('chatRooms').doc(roomId)
  const membersSnapshot = await roomRef.collection('members').get()

  await roomRef.set({
    memberCount: membersSnapshot.size,
    updatedAt: new Date(),
  }, { merge: true })

  logger.info('Synced memberCount', { roomId, memberCount: membersSnapshot.size })
}

/**
 * Keep chat room member counts in sync.
 */
export const onRoomMemberAdded = onDocumentCreated('chatRooms/{roomId}/members/{memberId}', async (event) => {
  const roomId = event.params.roomId
  await syncRoomMemberCount(roomId)
})

export const onRoomMemberRemoved = onDocumentDeleted('chatRooms/{roomId}/members/{memberId}', async (event) => {
  const roomId = event.params.roomId
  await syncRoomMemberCount(roomId)
})

/**
 * Send push notifications when a new message arrives.
 * Expects tokens in users/{uid}/devices/{deviceId} with { token, notificationsEnabled }.
 */
export const onMessageCreatedPush = onDocumentCreated('chatRooms/{roomId}/messages/{messageId}', async (event) => {
  const messageData = event.data?.data()
  const roomId = event.params.roomId
  const messageId = event.params.messageId

  if (!messageData) {
    return
  }

  const senderUid = String(messageData.uid || '')
  if (!senderUid) {
    logger.warn('Message without sender UID, skipping push', { roomId, messageId })
    return
  }

  const db = getFirestore()
  const roomRef = db.collection('chatRooms').doc(roomId)
  const roomDoc = await roomRef.get()
  if (!roomDoc.exists) {
    return
  }

  const roomName = String(roomDoc.data()?.name || 'Room')
  const membersSnapshot = await roomRef.collection('members').get()
  const recipientUids = membersSnapshot.docs
    .map((memberDoc) => memberDoc.id)
    .filter((uid) => uid !== senderUid)

  if (recipientUids.length === 0) {
    return
  }

  type TokenRecord = { token: string; refPath: string }
  const tokenRecords: TokenRecord[] = []

  await Promise.all(recipientUids.map(async (uid) => {
    const devicesSnapshot = await db.collection('users').doc(uid).collection('devices').get()
    devicesSnapshot.docs.forEach((deviceDoc) => {
      const data = deviceDoc.data()
      const token = String(data.token || '')
      const notificationsEnabled = data.notificationsEnabled !== false
      if (token && notificationsEnabled) {
        tokenRecords.push({ token, refPath: deviceDoc.ref.path })
      }
    })
  }))

  if (tokenRecords.length === 0) {
    logger.info('No recipient device tokens for push event', { roomId, messageId })
    return
  }

  const uniqueTokens = [...new Set(tokenRecords.map((item) => item.token))]
  const messageText = String(messageData.text || '').trim()
  const body = messageText.length > 0
    ? messageText.slice(0, 120)
    : 'Shared an attachment'

  const messaging = getMessaging()
  const response = await messaging.sendEachForMulticast({
    tokens: uniqueTokens,
    notification: {
      title: `${roomName} · ${messageData.displayName || 'New message'}`,
      body,
    },
    data: {
      roomId,
      messageId,
      senderUid,
      type: 'chat_message',
    },
  })

  logger.info('Push dispatch completed', {
    roomId,
    messageId,
    successCount: response.successCount,
    failureCount: response.failureCount,
  })

  const invalidTokens = response.responses
    .map((result, index) => ({ result, token: uniqueTokens[index] }))
    .filter(({ result }) => !result.success)
    .filter(({ result }) => {
      const code = result.error?.code || ''
      return code.includes('registration-token-not-registered') || code.includes('invalid-argument')
    })
    .map(({ token }) => token)

  if (invalidTokens.length === 0) {
    return
  }

  const invalidTokenSet = new Set(invalidTokens)
  const staleRefs = tokenRecords
    .filter((record) => invalidTokenSet.has(record.token))
    .map((record) => db.doc(record.refPath))

  if (staleRefs.length === 0) {
    return
  }

  const chunkSize = 400
  for (let i = 0; i < staleRefs.length; i += chunkSize) {
    const batch = db.batch()
    staleRefs.slice(i, i + chunkSize).forEach((docRef) => batch.delete(docRef))
    await batch.commit()
  }

  logger.info('Removed stale device tokens', { removed: staleRefs.length })
})
