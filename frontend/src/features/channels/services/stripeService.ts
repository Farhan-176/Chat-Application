/**
 * Stripe Payment Integration Service
 * Handles channel subscriptions and payments
 */

interface StripeConfig {
  publishableKey: string;
  apiEndpoint: string;
}

/**
 * Initialize Stripe configuration
 */
export function initializeStripe(): StripeConfig | null {
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  const apiEndpoint = import.meta.env.VITE_STRIPE_API_ENDPOINT;

  if (!publishableKey || !apiEndpoint) {
    console.warn('Stripe configuration missing. Please set VITE_STRIPE_PUBLISHABLE_KEY and VITE_STRIPE_API_ENDPOINT');
    return null;
  }

  return { publishableKey, apiEndpoint };
}

/**
 * Create a checkout session for channel subscription
 */
export async function createCheckoutSession(
  channelId: string,
  stripePriceId: string,
  userId: string
): Promise<{ sessionId: string; url?: string }> {
  const config = initializeStripe();
  if (!config) {
    throw new Error('Stripe not configured');
  }

  try {
    const response = await fetch(`${config.apiEndpoint}/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId,
        stripePriceId,
        userId,
        successUrl: `${window.location.origin}/channels/${channelId}?session={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/channels`
      })
    });

    if (!response.ok) {
      throw new Error(`Stripe error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Checkout session error:', error);
    throw error;
  }
}

/**
 * Create a billing portal session for managing subscriptions
 */
export async function createBillingPortalSession(userId: string): Promise<{ url: string }> {
  const config = initializeStripe();
  if (!config) {
    throw new Error('Stripe not configured');
  }

  try {
    const response = await fetch(`${config.apiEndpoint}/create-portal-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        returnUrl: `${window.location.origin}/account`
      })
    });

    if (!response.ok) {
      throw new Error(`Portal error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Portal session error:', error);
    throw error;
  }
}

/**
 * Validate subscription status
 */
export async function validateSubscription(
  userId: string,
  channelId: string
): Promise<{ isActive: boolean; expiresAt?: Date }> {
  const config = initializeStripe();
  if (!config) {
    return { isActive: false };
  }

  try {
    const response = await fetch(
      `${config.apiEndpoint}/validate-subscription?userId=${userId}&channelId=${channelId}`
    );

    if (!response.ok) {
      return { isActive: false };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Subscription validation error:', error);
    return { isActive: false };
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  userId: string,
  channelId: string
): Promise<{ success: boolean; message: string }> {
  const config = initializeStripe();
  if (!config) {
    throw new Error('Stripe not configured');
  }

  try {
    const response = await fetch(`${config.apiEndpoint}/cancel-subscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        channelId
      })
    });

    if (!response.ok) {
      throw new Error(`Cancel error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Cancel subscription error:', error);
    throw error;
  }
}

/**
 * Get payment methods for user
 */
export async function getPaymentMethods(userId: string): Promise<any[]> {
  const config = initializeStripe();
  if (!config) {
    return [];
  }

  try {
    const response = await fetch(`${config.apiEndpoint}/payment-methods?userId=${userId}`);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.paymentMethods || [];
  } catch (error) {
    console.error('Get payment methods error:', error);
    return [];
  }
}

/**
 * Check if user has active subscription to channel
 */
export async function hasActiveSubscription(
  userId: string,
  channelId: string
): Promise<boolean> {
  const result = await validateSubscription(userId, channelId);
  return result.isActive;
}

/**
 * Environment variable keys needed for Stripe
 */
export const REQUIRED_ENV_VARS = [
  'VITE_STRIPE_PUBLISHABLE_KEY',
  'VITE_STRIPE_API_ENDPOINT'
];

/**
 * Check if all Stripe environment variables are set
 */
export function isStripeConfigured(): boolean {
  return REQUIRED_ENV_VARS.every(key => import.meta.env[key]);
}

/**
 * Get Stripe configuration status
 */
export function getStripeStatus(): { configured: boolean; missingVars: string[] } {
  const missingVars = REQUIRED_ENV_VARS.filter(key => !import.meta.env[key]);
  return {
    configured: missingVars.length === 0,
    missingVars
  };
}
