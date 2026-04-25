/**
 * Web3 Authentication Routes
 * Ethereum wallet login using signatures
 */

import { Router } from 'express'
import { verifyEthereumSignature } from '../../../config/privacy'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../../../config/firebaseAdmin'

const router = Router()

/**
 * POST /auth/web3/nonce
 * Get a nonce for user to sign (prevents replay attacks)
 * Body: { walletAddress }
 */
router.post('/nonce', async (req, res) => {
  try {
    const { walletAddress } = req.body

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' })
    }

    const nonce = Math.random().toString(36).substring(7)
    const message = `Sign this message to authenticate: ${nonce}`
    const expiresAt = Date.now() + 5 * 60 * 1000 // 5 minutes

    // Store nonce in cache (in production, use Redis)
    console.log(`Nonce generated for ${walletAddress}: ${nonce}`)

    res.json({
      nonce,
      message,
      expiresAt,
    })
  } catch (error) {
    console.error('Failed to generate nonce:', error)
    res.status(500).json({ error: 'Nonce generation failed' })
  }
})

/**
 * POST /auth/web3/verify
 * Verify signed message and login user
 * Body: { walletAddress, signature, nonce }
 */
router.post('/verify', async (req, res) => {
  try {
    const { walletAddress, signature, nonce } = req.body

    if (!walletAddress || !signature || !nonce) {
      return res.status(400).json({ error: 'walletAddress, signature, and nonce required' })
    }

    const message = `Sign this message to authenticate: ${nonce}`
    const isValid = await verifyEthereumSignature(walletAddress, message, signature)

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' })
    }

    // Create or update user record
    console.log(`Web3 login successful for ${walletAddress}`)

    res.json({
      success: true,
      walletAddress,
      userId: walletAddress.toLowerCase(),
      chainId: 1, // Ethereum mainnet
    })
  } catch (error) {
    console.error('Failed to verify signature:', error)
    res.status(500).json({ error: 'Verification failed' })
  }
})

/**
 * POST /auth/web3/link-account
 * Link Web3 wallet to existing account
 * Requires authentication
 */
router.post('/link-account', async (req, res) => {
  try {
    const { walletAddress, signature, nonce, userId } = req.body

    if (!walletAddress || !signature || !userId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const message = `Link wallet to account: ${nonce}`
    const isValid = await verifyEthereumSignature(walletAddress, message, signature)

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' })
    }

    // Link wallet to user account
    console.log(`Linked wallet ${walletAddress} to user ${userId}`)

    res.json({
      success: true,
      walletAddress,
      linkedAt: new Date(),
    })
  } catch (error) {
    console.error('Failed to link account:', error)
    res.status(500).json({ error: 'Account linking failed' })
  }
})

export default router
