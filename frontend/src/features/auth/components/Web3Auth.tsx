import { useState } from 'react'
import { Wallet, LogOut } from 'lucide-react'

interface Web3AuthProps {
  onAuthSuccess: (walletAddress: string) => void
  isLoading?: boolean
}

export const Web3Auth = ({ onAuthSuccess, isLoading = false }: Web3AuthProps) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  const connectWallet = async () => {
    setIsConnecting(true)
    setError(null)

    try {
      // Check if MetaMask is available
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed')
      }

      // Request accounts
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      })

      const address = accounts[0]
      setWalletAddress(address)

      // Get nonce from backend
      const nonceResponse = await fetch('/auth/web3/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      })

      const { message } = await nonceResponse.json()

      // Sign message
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address],
      })

      // Verify signature on backend
      const verifyResponse = await fetch('/auth/web3/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          signature,
          nonce: message.split(': ')[1],
        }),
      })

      if (!verifyResponse.ok) {
        throw new Error('Failed to verify signature')
      }

      onAuthSuccess(address)
    } catch (err) {
      console.error('Web3 auth failed:', err)
      setError(err instanceof Error ? err.message : 'Web3 authentication failed')
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setWalletAddress(null)
    setError(null)
  }

  if (walletAddress) {
    return (
      <div style={{ padding: '12px', background: 'rgba(31, 95, 255, 0.1)', borderRadius: '8px', border: '1px solid rgba(31, 95, 255, 0.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#d4e6ff', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wallet size={16} />
            <span>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
          </div>
          <button
            onClick={disconnectWallet}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#d4e6ff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <LogOut size={14} />
            Disconnect
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '16px', background: '#0f1e36', borderRadius: '12px', border: '1px solid rgba(140, 170, 219, 0.35)' }}>
      <h3 style={{ margin: '0 0 12px', color: '#ecf3ff', fontSize: '14px' }}>Web3 Authentication</h3>
      <p style={{ margin: '0 0 12px', color: '#a8b7cd', fontSize: '12px' }}>
        Connect your Ethereum wallet for secure, blockchain-backed authentication.
      </p>

      <button
        onClick={connectWallet}
        disabled={isConnecting || isLoading}
        style={{
          width: '100%',
          padding: '10px',
          background: isConnecting ? '#64748b' : 'linear-gradient(135deg, #1f5fff, #327eff)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: isConnecting ? 'not-allowed' : 'pointer',
          fontSize: '13px',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        <Wallet size={16} />
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {error && (
        <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(220, 38, 38, 0.15)', borderRadius: '4px', color: '#fca5a5', fontSize: '12px' }}>
          {error}
        </div>
      )}
    </div>
  )
}

// Extend Window interface for MetaMask
declare global {
  interface Window {
    ethereum?: any
  }
}
