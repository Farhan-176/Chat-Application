import { db } from '../config/firebaseAdmin.js'
import { FieldValue } from 'firebase-admin/firestore'

interface EphemeralEntry {
    roomId: string
    messageId: string
    expiresAt: number  // Unix timestamp in ms
    timer: ReturnType<typeof setTimeout>
}

class EphemeralManager {
    private activeTimers: Map<string, EphemeralEntry> = new Map()

    /**
     * Register an ephemeral message that will self-destruct after `ttlSeconds`.
     */
    scheduleDestruction(roomId: string, messageId: string, ttlSeconds: number): void {
        const expiresAt = Date.now() + (ttlSeconds * 1000)
        const key = `${roomId}/${messageId}`

        // Clear any existing timer for this message
        this.cancelTimer(key)

        const timer = setTimeout(async () => {
            await this.destroyMessage(roomId, messageId)
            this.activeTimers.delete(key)
        }, ttlSeconds * 1000)

        this.activeTimers.set(key, { roomId, messageId, expiresAt, timer })

        console.log(`👻 Ephemeral message ${messageId} scheduled to dissolve in ${ttlSeconds}s`)
    }

    /**
     * Delete the message from Firestore and write a dissolution event.
     */
    private async destroyMessage(roomId: string, messageId: string): Promise<void> {
        try {
            const messageRef = db.collection('chatRooms').doc(roomId).collection('messages').doc(messageId)

            // Mark the message as dissolved (clients listen for this to trigger animation)
            await messageRef.update({
                dissolved: true,
                dissolvedAt: FieldValue.serverTimestamp(),
            })

            // After a short delay (for clients to animate), delete it permanently
            setTimeout(async () => {
                try {
                    await messageRef.delete()
                    console.log(`👻 Ephemeral message ${messageId} permanently deleted`)
                } catch (err) {
                    console.error(`Failed to delete ephemeral message ${messageId}:`, err)
                }
            }, 3000) // 3s for clients to show the dissolve animation

        } catch (error) {
            console.error(`Failed to dissolve message ${messageId}:`, error)
        }
    }

    /** Cancel a scheduled timer */
    private cancelTimer(key: string): void {
        const entry = this.activeTimers.get(key)
        if (entry) {
            clearTimeout(entry.timer)
            this.activeTimers.delete(key)
        }
    }

    /** Get count of active ephemeral messages */
    get activeCount(): number {
        return this.activeTimers.size
    }

    /** Clean up all timers (for shutdown) */
    shutdown(): void {
        for (const [key, entry] of this.activeTimers) {
            clearTimeout(entry.timer)
        }
        this.activeTimers.clear()
    }
}

// Singleton instance
export const ephemeralManager = new EphemeralManager()
