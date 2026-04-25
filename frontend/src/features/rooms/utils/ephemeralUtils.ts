/**
 * Ephemeral Room Utilities
 * Functions for managing self-destructing rooms with countdown timers
 */

/**
 * Check if a room is currently ephemeral (has active expiry time)
 */
export function isRoomEphemeral(expiresAt: Date | string | null | undefined): boolean {
  if (!expiresAt) return false;
  
  const expireDate = typeof expiresAt === 'string'
    ? new Date(expiresAt)
    : expiresAt;
  
  return expireDate > new Date();
}

/**
 * Get time remaining until room expires
 * Returns human-readable format: "23 hours, 45 minutes" or "12 seconds"
 */
export function getTimeUntilExpiry(expiresAt: Date | string | null | undefined): string {
  if (!expiresAt) return '';
  
  const expireDate = typeof expiresAt === 'string'
    ? new Date(expiresAt)
    : expiresAt;
  
  const now = new Date();
  const diffMs = expireDate.getTime() - now.getTime();
  
  if (diffMs <= 0) return 'Expiring...';
  
  const totalSeconds = Math.floor(diffMs / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  
  if (days > 0) {
    const remainingHours = totalHours % 24;
    return `${days}d ${remainingHours}h`;
  }
  
  if (totalHours > 0) {
    const remainingMinutes = totalMinutes % 60;
    return `${totalHours}h ${remainingMinutes}m`;
  }
  
  if (totalMinutes > 0) {
    const remainingSeconds = totalSeconds % 60;
    return `${totalMinutes}m ${remainingSeconds}s`;
  }
  
  return `${totalSeconds}s`;
}

/**
 * Format expiry date for display
 * Returns: "Expires in 6 hours" or "Expires tomorrow at 3:45 PM"
 */
export function formatExpiryTime(expiresAt: Date | string | null | undefined): string {
  if (!expiresAt) return '';
  
  const expireDate = typeof expiresAt === 'string'
    ? new Date(expiresAt)
    : expiresAt;
  
  const now = new Date();
  const diffMs = expireDate.getTime() - now.getTime();
  
  if (diffMs <= 0) return 'Expired';
  
  const totalSeconds = Math.floor(diffMs / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  
  if (days > 0) {
    if (days === 1) {
      return `Expires tomorrow at ${expireDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    }
    return `Expires in ${days} days`;
  }
  
  if (totalHours > 0) {
    return `Expires in ${totalHours} hour${totalHours > 1 ? 's' : ''}`;
  }
  
  if (totalMinutes > 0) {
    return `Expires in ${totalMinutes} minute${totalMinutes > 1 ? 's' : ''}`;
  }
  
  return `Expires in ${totalSeconds} second${totalSeconds > 1 ? 's' : ''}`;
}

/**
 * Calculate expiry date from duration
 * @param duration - Duration in hours (1, 6, 24, 48) or 'custom'
 * @param customDate - If duration is 'custom', use this date
 */
export function calculateExpiryDate(duration: number | 'custom', customDate?: Date): Date {
  const now = new Date();
  
  if (duration === 'custom' && customDate) {
    return customDate;
  }
  
  if (typeof duration === 'number') {
    return new Date(now.getTime() + duration * 60 * 60 * 1000);
  }
  
  return now;
}

/**
 * Get predefined ephemeral room durations
 */
export const EPHEMERAL_DURATIONS = [
  { label: '1 Hour', hours: 1, emoji: '⏱️' },
  { label: '6 Hours', hours: 6, emoji: '⏰' },
  { label: '24 Hours', hours: 24, emoji: '📅' },
  { label: '48 Hours', hours: 48, emoji: '📆' },
  { label: 'Custom', hours: 'custom' as const, emoji: '⚙️' }
];

/**
 * Check if room is in critical state (< 5 minutes until expiry)
 */
export function isRoomCritical(expiresAt: Date | string | null | undefined): boolean {
  if (!expiresAt) return false;
  
  const expireDate = typeof expiresAt === 'string'
    ? new Date(expiresAt)
    : expiresAt;
  
  const now = new Date();
  const diffMs = expireDate.getTime() - now.getTime();
  const minutes = diffMs / (1000 * 60);
  
  return minutes > 0 && minutes < 5;
}
