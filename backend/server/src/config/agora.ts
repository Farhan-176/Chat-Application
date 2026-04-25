/**
 * Agora SDK configuration for Voice & Video Calls
 */

export const agoraConfig = {
  appId: process.env.AGORA_APP_ID || '',
  appCertificate: process.env.AGORA_APP_CERTIFICATE || '',
  enabled: !!process.env.AGORA_APP_ID,
}

/**
 * Generate Agora token server-side (for security)
 * Clients request tokens from our backend, not directly from Agora
 */
export const generateAgoraToken = (
  uid: string,
  channelName: string,
  role: 'publisher' | 'subscriber' = 'publisher'
): string => {
  if (!agoraConfig.appId || !agoraConfig.appCertificate) {
    throw new Error('Agora credentials not configured')
  }

  // Placeholder - would use @agora/token-builder in production
  // This is a simplified approach; real implementation uses:
  // import { RtcTokenBuilder, RtcRole } from 'agora-access-token'
  
  const token = Buffer.from(
    JSON.stringify({
      appId: agoraConfig.appId,
      uid,
      channelName,
      role,
      timestamp: Math.floor(Date.now() / 1000),
    })
  ).toString('base64')

  return token
}

export default agoraConfig
