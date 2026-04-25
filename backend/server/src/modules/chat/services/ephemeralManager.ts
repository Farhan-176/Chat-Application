import { db } from '../../../config/firebaseAdmin.js'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'

interface EphemeralConfig {
    roomId: string
    messageId: string
    expiresAt: number  // Unix timestamp in ms
}

class EphemeralManager {
    private checkInterval: NodeJS.Timeout | null = null;
    private isScanning = false;

    constructor() {
        // Start the persistence-safe cleanup loop
        this.startCleanupLoop();
    }

    /**
     * Start a periodic scan for expired messages.
     * This is scalable across server restarts.
     */
    private startCleanupLoop(): void {
        if (this.checkInterval) return;

        // Check every 10 seconds for expired messages
        this.checkInterval = setInterval(() => this.scanAndBurn(), 10000);
        console.log('👻 Ephemeral Cleanup Loop started (persistence-safe)');
    }

    /**
     * Register an ephemeral message with a persistent expiry date in Firestore.
     */
    async scheduleDestruction(roomId: string, messageId: string, ttlSeconds: number): Promise<void> {
        const expiresAt = Date.now() + (ttlSeconds * 1000);
        const expiresAtDate = new Date(expiresAt);

        try {
            const messageRef = db.collection('chatRooms').doc(roomId).collection('messages').doc(messageId);
            
            // Set the expiry metadata on the message itself
            await messageRef.update({
                isEphemeral: true,
                expiresAt: Timestamp.fromDate(expiresAtDate),
                status: 'active'
            });

            console.log(`👻 Ephemeral message ${messageId} scheduled to expire at ${expiresAtDate.toISOString()}`);
        } catch (error) {
            console.error(`Failed to schedule destruction for ${messageId}:`, error);
        }
    }

    /**
     * Scans Firestore for messages that have passed their 'expiresAt' time.
     */
    private async scanAndBurn(): Promise<void> {
        if (this.isScanning) return;
        this.isScanning = true;

        try {
            const now = Timestamp.now();
            
            // Query for all ephemeral messages across ALL rooms that have expired
            // NOTE: This requires a composite index on [isEphemeral, expiresAt, status]
            const expiredMessages = await db.collectionGroup('messages')
                .where('isEphemeral', '==', true)
                .where('status', '==', 'active')
                .where('expiresAt', '<=', now)
                .limit(50) // Batch processing for safety
                .get();

            if (expiredMessages.empty) {
                this.isScanning = false;
                return;
            }

            console.log(`👻 Found ${expiredMessages.size} expired messages to dissolve...`);

            const promises = expiredMessages.docs.map(doc => {
                const roomId = doc.ref.parent.parent?.id;
                if (!roomId) return Promise.resolve();
                return this.destroyMessage(roomId, doc.id);
            });

            await Promise.all(promises);

        } catch (error) {
            console.error('👻 Cleanup loop error:', error);
        } finally {
            this.isScanning = false;
        }
    }

    /**
     * Delete the message from Firestore and write a dissolution event.
     */
    private async destroyMessage(roomId: string, messageId: string): Promise<void> {
        try {
            const messageRef = db.collection('chatRooms').doc(roomId).collection('messages').doc(messageId);

            // 1. Mark as dissolved so clients can animate
            await messageRef.update({
                status: 'dissolved',
                dissolvedAt: FieldValue.serverTimestamp(),
            });

            // 2. Permanently delete after a short buffer (for animation)
            // In a multi-node setup, we'd use a TTL index or a separate queue,
            // but for this hardening, a short-lived local timer for the "burn" is acceptable
            // as the status='dissolved' prevents it from being picked up by 'scanAndBurn' again.
            setTimeout(async () => {
                try {
                    await messageRef.delete();
                    console.log(`👻 Message ${messageId} permanently burned.`);
                } catch (err) {
                    // Silently fail if already deleted
                }
            }, 5000);

        } catch (error) {
            console.error(`Failed to dissolve message ${messageId}:`, error);
        }
    }

    shutdown(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}

// Singleton instance
export const ephemeralManager = new EphemeralManager()

