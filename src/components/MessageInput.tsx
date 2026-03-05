import { useState } from 'react'
import './MessageInput.css'

interface MessageInputProps {
  onSendMessage: (text: string, isGhostMode?: boolean, ttl?: number) => Promise<void>
  onTyping?: (isTyping: boolean) => void
  disabled?: boolean
}

export const MessageInput = ({ onSendMessage, onTyping, disabled = false }: MessageInputProps) => {
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGhostMode, setIsGhostMode] = useState(false)
  const [ttl, setTtl] = useState(30) // Default 30s
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedMessage = message.trim()
    if (!trimmedMessage) {
      return
    }

    try {
      setIsLoading(true)

      // Stop typing immediately when sending
      if (typingTimeout) {
        clearTimeout(typingTimeout)
        setTypingTimeout(null)
      }
      onTyping?.(false)

      await onSendMessage(trimmedMessage, isGhostMode, ttl)
      setMessage('')
      // Don't reset ghost mode, user might want to send multiple
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setMessage(val)

    if (onTyping) {
      if (!typingTimeout) {
        onTyping(true)
      } else {
        clearTimeout(typingTimeout)
      }

      const timeout = setTimeout(() => {
        onTyping(false)
        setTypingTimeout(null)
      }, 2500)

      setTypingTimeout(timeout)
    }
  }

  return (
    <form className="message-input-form" onSubmit={handleSubmit}>
      <div className={`message-input-container ${isGhostMode ? 'ghost-mode' : ''}`}>
        <button
          type="button"
          className={`ghost-toggle ${isGhostMode ? 'active' : ''}`}
          onClick={() => setIsGhostMode(!isGhostMode)}
          title={isGhostMode ? "Disable Ghost Mode" : "Enable Ghost Mode"}
          disabled={disabled || isLoading}
        >
          <span className="ghost-icon">👻</span>
        </button>

        {isGhostMode && (
          <div className="ttl-selector">
            {[5, 30, 60].map((value) => (
              <button
                key={value}
                type="button"
                className={`ttl-option ${ttl === value ? 'selected' : ''}`}
                onClick={() => setTtl(value)}
                disabled={disabled || isLoading}
              >
                {value}s
              </button>
            ))}
          </div>
        )}

        <textarea
          className="message-input"
          placeholder={isGhostMode ? "Whisper a secret..." : "Sync your thoughts..."}
          value={message}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          disabled={disabled || isLoading}
          rows={1}
        />
        <button
          type="submit"
          className="send-button"
          disabled={!message.trim() || disabled || isLoading}
        >
          <svg className="send-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </form>
  )
}
