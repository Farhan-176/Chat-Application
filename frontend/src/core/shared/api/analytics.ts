import { isSupported, getAnalytics, logEvent } from 'firebase/analytics'
import { app } from '../config'

type AnalyticsParams = Record<string, string | number | boolean>

let supportCheckPromise: Promise<boolean> | null = null
let analyticsInstancePromise: Promise<ReturnType<typeof getAnalytics> | null> | null = null

const isAnalyticsEnabled = () => {
  return typeof window !== 'undefined' && !!import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

const getAnalyticsInstance = async () => {
  if (!isAnalyticsEnabled()) {
    return null
  }

  if (!supportCheckPromise) {
    supportCheckPromise = isSupported().catch(() => false)
  }

  const supported = await supportCheckPromise
  if (!supported) {
    return null
  }

  if (!analyticsInstancePromise) {
    analyticsInstancePromise = Promise.resolve(getAnalytics(app))
  }

  return analyticsInstancePromise
}

export async function trackAnalyticsEvent(name: string, params: AnalyticsParams = {}) {
  try {
    const analytics = await getAnalyticsInstance()
    if (!analytics) {
      return
    }

    logEvent(analytics, name, params)
  } catch (error) {
    console.warn('[Analytics] Event tracking skipped:', error)
  }
}
