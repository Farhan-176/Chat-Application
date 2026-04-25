import { db } from '../../../config/firebaseAdmin'
import { Timestamp } from 'firebase-admin/firestore'

export type AuditAction = 
  | 'member_added'
  | 'member_removed'
  | 'member_role_changed'
  | 'invitation_sent'
  | 'invitation_accepted'
  | 'invitation_declined'
  | 'workspace_created'
  | 'workspace_deleted'

export interface AuditLog {
  id?: string
  workspaceId: string
  action: AuditAction
  performedBy: string
  performedByName?: string
  targetUserId?: string
  targetEmail?: string
  changes?: Record<string, any>
  timestamp: Timestamp
  ipAddress?: string
  metadata?: Record<string, any>
}

/**
 * Log an audit event in Firestore
 * Automatically tracks who did what, when, and to whom
 */
export async function logAuditEvent(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<string> {
  try {
    const auditRef = db.collection('workspace-audit-logs').doc()
    
    const auditEntry: AuditLog = {
      ...log,
      timestamp: Timestamp.now(),
    }

    await auditRef.set(auditEntry)
    return auditRef.id
  } catch (error) {
    console.error('Error logging audit event:', error)
    throw error
  }
}

/**
 * Get audit logs for a workspace
 * Optionally filter by action or time period
 */
export async function getAuditLogs(
  workspaceId: string,
  options?: {
    limit?: number
    action?: AuditAction
    userId?: string
    startDate?: Date
    endDate?: Date
  }
) {
  try {
    let query: any = db
      .collection('workspace-audit-logs')
      .where('workspaceId', '==', workspaceId)

    if (options?.action) {
      query = query.where('action', '==', options.action)
    }

    if (options?.userId) {
      query = query.where('performedBy', '==', options.userId)
    }

    if (options?.startDate) {
      query = query.where('timestamp', '>=', Timestamp.fromDate(options.startDate))
    }

    if (options?.endDate) {
      query = query.where('timestamp', '<=', Timestamp.fromDate(options.endDate))
    }

    query = query.orderBy('timestamp', 'desc').limit(options?.limit || 100)

    const snapshot = await query.get()
    
    return snapshot.docs.map((doc: any) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.() || new Date(),
      }
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    throw error
  }
}

/**
 * Get recent member management activity
 */
export async function getTeamActivityLogs(
  workspaceId: string,
  limit: number = 50
) {
  try {
    const memberActions = ['member_added', 'member_removed', 'member_role_changed', 'invitation_sent'] as AuditAction[]
    
    const snapshot = await db
      .collection('workspace-audit-logs')
      .where('workspaceId', '==', workspaceId)
      .where('action', 'in', memberActions)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get()

    return snapshot.docs.map((doc: any) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.() || new Date(),
      }
    })
  } catch (error) {
    console.error('Error fetching team activity:', error)
    throw error
  }
}

/**
 * Get analytics about member management
 */
export async function getTeamAnalytics(workspaceId: string) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const logsSnapshot = await db
      .collection('workspace-audit-logs')
      .where('workspaceId', '==', workspaceId)
      .where('timestamp', '>=', Timestamp.fromDate(thirtyDaysAgo))
      .get()

    const logs = logsSnapshot.docs.map(doc => doc.data())

    // Count actions
    const actionCounts = {
      membersAdded: logs.filter(l => l.action === 'member_added').length,
      membersRemoved: logs.filter(l => l.action === 'member_removed').length,
      roleChanges: logs.filter(l => l.action === 'member_role_changed').length,
      invitationsSent: logs.filter(l => l.action === 'invitation_sent').length,
    }

    // Count by person
    const activityByPerson: Record<string, number> = {}
    logs.forEach(log => {
      const performer = log.performedByName || log.performedBy
      activityByPerson[performer] = (activityByPerson[performer] || 0) + 1
    })

    return {
      timeframe: '30 days',
      actions: actionCounts,
      topContributors: Object.entries(activityByPerson)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, count]) => ({ name, count })),
    }
  } catch (error) {
    console.error('Error generating team analytics:', error)
    throw error
  }
}

