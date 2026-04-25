/**
 * Time Capsule Message Utilities
 * Functions for checking, formatting, and managing sealed messages
 */

/**
 * Check if a message is currently sealed (hidden until future date)
 */
export function isMessageSealed(sealedUntil: Date | string | null | undefined): boolean {
  if (!sealedUntil) return false;
  
  const sealDate = typeof sealedUntil === 'string' 
    ? new Date(sealedUntil)
    : sealedUntil;
  
  return sealDate > new Date();
}

/**
 * Get time remaining until message unseals
 * Returns human-readable format: "6 hours, 23 minutes" or "47 seconds"
 */
export function getTimeRemaining(sealedUntil: Date | string | null | undefined): string {
  if (!sealedUntil) return '';
  
  const sealDate = typeof sealedUntil === 'string'
    ? new Date(sealedUntil)
    : sealedUntil;
  
  const now = new Date();
  const diffMs = sealDate.getTime() - now.getTime();
  
  if (diffMs <= 0) return 'Unsealing...';
  
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
 * Format seal date for display
 * Returns: "May 24 at 2:30 PM" or "Tomorrow at 3:45 PM"
 */
export function formatUnsealTime(sealedUntil: Date | string | null | undefined): string {
  if (!sealedUntil) return '';
  
  const sealDate = typeof sealedUntil === 'string'
    ? new Date(sealedUntil)
    : sealedUntil;
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const sealDateOnly = new Date(sealDate.getFullYear(), sealDate.getMonth(), sealDate.getDate());
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  if (sealDateOnly.getTime() === today.getTime()) {
    return `Today at ${sealDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  }
  
  if (sealDateOnly.getTime() === tomorrow.getTime()) {
    return `Tomorrow at ${sealDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  }
  
  return formatter.format(sealDate);
}

/**
 * Calculate seal date from duration
 * @param duration - Duration in hours (24, 168, 720, etc.) or 'custom'
 * @param customDate - If duration is 'custom', use this date
 */
export function calculateSealDate(duration: number | 'custom', customDate?: Date): Date {
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
 * Get predefined seal durations
 */
export const SEAL_DURATIONS = [
  { label: '1 Day', hours: 24, emoji: '🕐' },
  { label: '1 Week', hours: 168, emoji: '📅' },
  { label: '1 Month', hours: 720, emoji: '📆' },
  { label: 'Custom', hours: 'custom' as const, emoji: '⚙️' }
];
