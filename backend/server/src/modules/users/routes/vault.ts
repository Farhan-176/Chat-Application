import { Router, Response } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../../../config/firebaseAdmin';
import { authenticateToken, AuthenticatedRequest } from '../../../middleware/auth';

const router = Router();

router.use(authenticateToken);

/**
 * GET /api/users/me/vault
 * Fetch all starred messages for the current user.
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const vaultSnapshot = await db
      .collection('users')
      .doc(uid)
      .collection('vault')
      .orderBy('savedAt', 'desc')
      .get();

    const messages = vaultSnapshot.docs.map(doc => ({
      ...doc.data(),
      messageId: doc.id,
      timestamp: doc.data().timestamp?.toDate?.() || doc.data().timestamp,
      savedAt: doc.data().savedAt?.toDate?.() || doc.data().savedAt,
    }));

    return res.json({ messages });
  } catch (error) {
    console.error('Error fetching vault:', error);
    return res.status(500).json({ error: 'Failed to fetch vault' });
  }
});

/**
 * POST /api/users/me/vault/:messageId
 * Save a message to the vault with AI tags.
 */
router.post('/:messageId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    const { messageId } = req.params;
    const { roomId, text, senderName, senderId, timestamp, tags = [], aiTags = [], notes = '' } = req.body;

    if (!uid) return res.status(401).json({ error: 'Unauthorized' });
    if (!roomId || !text) return res.status(400).json({ error: 'Missing message data' });

    const vaultRef = db.collection('users').doc(uid).collection('vault').doc(messageId);
    
    await vaultRef.set({
      roomId,
      text,
      senderName,
      senderId,
      timestamp: timestamp ? new Date(timestamp) : FieldValue.serverTimestamp(),
      tags,
      aiTags,
      notes,
      savedAt: FieldValue.serverTimestamp(),
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Error saving to vault:', error);
    return res.status(500).json({ error: 'Failed to save to vault' });
  }
});

/**
 * DELETE /api/users/me/vault/:messageId
 * Remove a message from the vault.
 */
router.delete('/:messageId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    const { messageId } = req.params;

    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    await db.collection('users').doc(uid).collection('vault').doc(messageId).delete();

    return res.json({ success: true });
  } catch (error) {
    console.error('Error removing from vault:', error);
    return res.status(500).json({ error: 'Failed to remove from vault' });
  }
});

export default router;
