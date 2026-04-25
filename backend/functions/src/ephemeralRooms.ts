/**
 * Cloud Function to auto-delete expired ephemeral rooms
 * Runs every 5 minutes via Cloud Scheduler
 * Deletes rooms where expiresAt < now() and autoDelete = true
 * 
 * Deploy: firebase deploy --only functions
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

/**
 * Delete an expired room and all its subcollections
 * Uses batch operations to delete up to 500 docs at a time
 */
async function deleteExpiredRoom(roomId: string, db: admin.firestore.Firestore): Promise<void> {
  const roomRef = db.collection('chatRooms').doc(roomId);
  const batch = db.batch();

  // Delete all messages and their subcollections
  const messagesSnapshot = await roomRef.collection('messages').get();
  for (const msgDoc of messagesSnapshot.docs) {
    batch.delete(msgDoc.ref);
  }

  // Delete presence collection
  const presenceSnapshot = await roomRef.collection('presence').get();
  for (const presenceDoc of presenceSnapshot.docs) {
    batch.delete(presenceDoc.ref);
  }

  // Delete typing collection
  const typingSnapshot = await roomRef.collection('typing').get();
  for (const typingDoc of typingSnapshot.docs) {
    batch.delete(typingDoc.ref);
  }

  // Delete the room itself
  batch.delete(roomRef);

  // Commit batch
  await batch.commit();

  console.log(`Deleted expired room: ${roomId}`);
}

/**
 * Cloud Function: Delete expired ephemeral rooms
 * Scheduled to run every 5 minutes
 */
export const deleteExpiredRooms = functions
  .pubsub
  .schedule('every 5 minutes')
  .onRun(async (context: functions.EventContext) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    try {
      // Query rooms that are expired and marked for auto-deletion
      const expiredRoomsSnapshot = await db
        .collection('chatRooms')
        .where('expiresAt', '<', now)
        .where('autoDelete', '==', true)
        .get();

      if (expiredRoomsSnapshot.empty) {
        console.log('No expired rooms found');
        return;
      }

      console.log(`Found ${expiredRoomsSnapshot.size} expired rooms to delete`);

      // Delete each expired room
      const deletePromises = expiredRoomsSnapshot.docs.map((doc) =>
        deleteExpiredRoom(doc.id, db)
          .catch((error) => {
            console.error(`Failed to delete room ${doc.id}:`, error);
          })
      );

      await Promise.all(deletePromises);

      console.log(`Successfully processed ${expiredRoomsSnapshot.size} expired rooms`);
    } catch (error) {
      console.error('Error in deleteExpiredRooms function:', error);
      throw error;
    }
  });

/**
 * Cloud Function: Clean up old sealed messages (optional)
 * Deletes sealed messages that expired more than 30 days ago
 * Runs once per day at 2 AM UTC
 */
export const cleanupOldSealedMessages = functions
  .pubsub
  .schedule('0 2 * * *') // Daily at 2 AM UTC
  .onRun(async (context: functions.EventContext) => {
    const db = admin.firestore();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoTimestamp = admin.firestore.Timestamp.fromDate(thirtyDaysAgo);

    try {
      // Query all rooms
      const roomsSnapshot = await db.collection('chatRooms').get();

      let deletedCount = 0;

      for (const roomDoc of roomsSnapshot.docs) {
        // Query sealed messages that are older than 30 days
        const oldSealedMessagesSnapshot = await roomDoc.ref
          .collection('messages')
          .where('sealedUntil', '<', thirtyDaysAgoTimestamp)
          .get();

        if (!oldSealedMessagesSnapshot.empty) {
          const batch = db.batch();

          for (const msgDoc of oldSealedMessagesSnapshot.docs) {
            batch.delete(msgDoc.ref);
            deletedCount++;

            // Firestore batch limit is 500 docs
            if (deletedCount % 450 === 0) {
              await batch.commit();
              console.log(`Cleanup: Deleted ${deletedCount} old sealed messages so far...`);
            }
          }

          if (deletedCount > 0) {
            await batch.commit();
          }
        }
      }

      console.log(`Cleanup complete: Deleted ${deletedCount} old sealed messages`);
    } catch (error) {
      console.error('Error in cleanupOldSealedMessages function:', error);
      throw error;
    }
  });
