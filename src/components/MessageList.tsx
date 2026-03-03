import { useEffect, useRef } from 'react'
import { Message } from '../types'
import './MessageList.css'

interface MessageListProps {
  messages: Message[]
  currentUserId: string
}

export const MessageList = ({ messages, currentUserId }: MessageListProps) => {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Auto-scroll to bottom with smooth behavior
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 0)
  }, [messages])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  return (
    <div className="message-list">
      {messages.length === 0 ? (
        <div className="no-messages">
          <p>No messages yet. Start the conversation!</p>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message-wrapper ${message.uid === currentUserId ? 'own' : 'other'}`}
            >
              <div className={`message-bubble ${message.uid === currentUserId ? 'own' : 'other'}`}>
                {message.uid !== currentUserId && (
                  <div className="message-sender">{message.displayName}</div>
                )}
                <div className="message-content">{message.text}</div>
                <div className="message-time">{formatTime(message.createdAt)}</div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </>
      )}
    </div>
  )
}
