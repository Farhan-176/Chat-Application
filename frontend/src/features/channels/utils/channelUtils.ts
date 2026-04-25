/**
 * Creator Channels Utilities
 * Handles channel management, subscriptions, and stripe integration
 */

export interface Channel {
  id: string;
  creatorId: string;
  creatorName: string;
  name: string;
  description: string;
  avatar?: string;
  members: string[]; // UIDs of subscribed members
  price: number; // Monthly price in cents
  isPublic: boolean;
  stripeProductId?: string;
  stripePriceId?: string;
  memberLimit: number; // Max subscribers
  createdAt: Date;
  updatedAt: Date;
}

export interface ChannelSubscription {
  id: string;
  userId: string;
  channelId: string;
  stripeSubscriptionId?: string;
  status: 'active' | 'cancelled' | 'expired';
  startDate: Date;
  renewalDate?: Date;
  cancelledAt?: Date;
}

export interface ChannelMembership {
  userId: string;
  channelId: string;
  joinedAt: Date;
  role: 'creator' | 'subscriber';
  isActive: boolean;
}

/**
 * Format price for display (cents to dollars)
 */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Format channel name for URL slug
 */
export function createChannelSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Check if user is channel creator
 */
export function isChannelCreator(userId: string, channel: Channel): boolean {
  return channel.creatorId === userId;
}

/**
 * Check if user is subscribed to channel
 */
export function isChannelSubscriber(userId: string, channel: Channel): boolean {
  return channel.members.includes(userId);
}

/**
 * Check if channel is at capacity
 */
export function isChannelFull(channel: Channel): boolean {
  return channel.members.length >= channel.memberLimit;
}

/**
 * Get remaining subscription days
 */
export function getRemainingDays(renewalDate: Date | undefined): number | null {
  if (!renewalDate) return null;
  
  const now = new Date();
  const renewal = new Date(renewalDate);
  const diff = renewal.getTime() - now.getTime();
  
  if (diff <= 0) return 0;
  
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Format subscription status for display
 */
export function formatSubscriptionStatus(subscription: ChannelSubscription): string {
  if (subscription.status === 'cancelled') {
    return 'Cancelled';
  }
  
  if (subscription.status === 'expired') {
    return 'Expired';
  }
  
  if (subscription.renewalDate) {
    const days = getRemainingDays(subscription.renewalDate);
    if (days === null) return 'Active';
    if (days === 0) return 'Renewing today';
    if (days === 1) return 'Renews tomorrow';
    return `Renews in ${days} days`;
  }
  
  return 'Active';
}

/**
 * Validate channel creation input
 */
export function validateChannelInput(data: {
  name?: string;
  description?: string;
  price?: number;
  memberLimit?: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.name || data.name.trim().length === 0) {
    errors.push('Channel name is required');
  } else if (data.name.length > 50) {
    errors.push('Channel name must be 50 characters or less');
  }
  
  if (!data.description || data.description.trim().length === 0) {
    errors.push('Channel description is required');
  } else if (data.description.length > 500) {
    errors.push('Channel description must be 500 characters or less');
  }
  
  if (data.price === undefined) {
    errors.push('Price is required');
  } else if (data.price < 0.99) {
    errors.push('Price must be at least $0.99');
  } else if (data.price > 999.99) {
    errors.push('Price must be less than $1000');
  }
  
  if (!data.memberLimit || data.memberLimit < 1) {
    errors.push('Member limit must be at least 1');
  } else if (data.memberLimit > 10000) {
    errors.push('Member limit must be 10000 or less');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Calculate revenue from subscriptions
 */
export function calculateChannelRevenue(
  channel: Channel,
  activeSubscriptions: ChannelSubscription[]
): number {
  const activeCount = activeSubscriptions.filter(s => s.status === 'active').length;
  return (channel.price * activeCount) / 100; // Convert cents to dollars
}

/**
 * Get channel statistics
 */
export function getChannelStats(
  channel: Channel,
  subscriptions: ChannelSubscription[]
) {
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const cancelledCount = subscriptions.filter(s => s.status === 'cancelled').length;
  
  return {
    totalMembers: channel.members.length,
    activeSubscriptions: activeSubscriptions.length,
    cancelledSubscriptions: cancelledCount,
    monthlyRevenue: calculateChannelRevenue(channel, subscriptions),
    capacityUsed: Math.round((channel.members.length / channel.memberLimit) * 100),
    joinRate: channel.members.length > 0 ? 'Active' : 'No members yet'
  };
}

/**
 * Stripe price tier suggestions
 */
export const PRICE_TIERS = [
  { amount: 499, label: '$4.99/month', tier: 'starter' },
  { amount: 999, label: '$9.99/month', tier: 'professional' },
  { amount: 1999, label: '$19.99/month', tier: 'premium' },
  { amount: 4999, label: '$49.99/month', tier: 'enterprise' }
];

/**
 * Member limit suggestions
 */
export const MEMBER_LIMITS = [
  { value: 10, label: '10 members' },
  { value: 50, label: '50 members' },
  { value: 100, label: '100 members' },
  { value: 500, label: '500 members' },
  { value: 1000, label: '1000 members' },
  { value: 5000, label: '5000 members' }
];
