/**
 * Frontend API client for new features
 * Voice/Video, AI Intelligence, E2E Encryption, Web3
 */

export const voiceVideoApi = {
  getAgoraToken: async (roomId: string) => {
    const res = await fetch('/api/calls/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId }),
    })
    return res.json()
  },

  startCall: async (roomId: string) => {
    const res = await fetch(`/api/calls/${roomId}/start`, {
      method: 'POST',
    })
    return res.json()
  },

  endCall: async (roomId: string) => {
    const res = await fetch(`/api/calls/${roomId}/end`, {
      method: 'POST',
    })
    return res.json()
  },

  checkActiveCall: async (roomId: string) => {
    const res = await fetch(`/api/calls/${roomId}/active`)
    return res.json()
  },
}

export const aiIntelligenceApi = {
  analyzeMessage: async (text: string, roomId: string, senderRole: string) => {
    const res = await fetch('/api/ai/analyze-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, roomId, senderRole }),
    })
    return res.json()
  },

  moderateMessage: async (text: string, roomId: string) => {
    const res = await fetch('/api/ai/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, roomId }),
    })
    return res.json()
  },

  generateDigest: async (roomId: string, messageIds: string[]) => {
    const res = await fetch('/api/ai/digest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, messageIds }),
    })
    return res.json()
  },

  smartRoute: async (text: string, roomId: string) => {
    const res = await fetch('/api/ai/smart-route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, roomId }),
    })
    return res.json()
  },
}

export const encryptionApi = {
  generateKeypair: async () => {
    const res = await fetch('/api/encryption/keypair', {
      method: 'POST',
    })
    return res.json()
  },

  getPublicKeys: async (roomId: string) => {
    const res = await fetch(`/api/encryption/public-keys/${roomId}`)
    return res.json()
  },

  encryptMessage: async (plaintext: string, recipientPublicKey: string) => {
    const res = await fetch('/api/encryption/encrypt-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plaintext, recipientPublicKey }),
    })
    return res.json()
  },

  decryptMessage: async (ciphertext: string, nonce: string, senderPublicKey: string) => {
    const res = await fetch('/api/encryption/decrypt-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ciphertext, nonce, senderPublicKey }),
    })
    return res.json()
  },
}

export const web3AuthApi = {
  getNonce: async (walletAddress: string) => {
    const res = await fetch('/auth/web3/nonce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress }),
    })
    return res.json()
  },

  verifySignature: async (walletAddress: string, signature: string, nonce: string) => {
    const res = await fetch('/auth/web3/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, signature, nonce }),
    })
    return res.json()
  },

  linkWallet: async (walletAddress: string, signature: string, nonce: string, userId: string) => {
    const res = await fetch('/auth/web3/link-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, signature, nonce, userId }),
    })
    return res.json()
  },
}
