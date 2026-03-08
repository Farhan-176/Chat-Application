import { useEffect, useRef } from 'react'
import { Message } from '../../../shared/types'
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
              className={`message-wrapper ${message.uid === currentUserId ? 'own' : 'other'} ${message.isEphemeral ? 'ephemeral' : ''} ${message.dissolved ? 'dissolved' : ''}`}
            >
              {message.uid !== currentUserId && (
                <div className="message-avatar-wrapper">
                  {message.photoURL ? (
                    <img 
                      src={message.photoURL} 
                      alt={message.displayName}
                      className="message-avatar"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className="message-avatar-fallback" style={message.photoURL ? { display: 'none' } : {}}>
                    {message.displayName?.[0]?.toUpperCase() || '?'}
                  </div>
                </div>
              )}
              
              <div className="message-content-wrapper">
                <div
                  className={`message-bubble ${message.uid === currentUserId ? 'own' : 'other'} ${message.mood ? `mood-${message.mood}` : ''} ${message.isEphemeral ? 'ghostly' : ''}`}
                  style={message.moodColor ? { '--mood-color': message.moodColor } as React.CSSProperties : {}}
                >
                  {message.isEphemeral && !message.dissolved && (
                    <div className="ghost-indicator" title="Self-destructing message">
                      👻
                    </div>
                  )}
                  {message.moodEmoji && (
                    <div className="mood-emoji-badge" title={message.mood}>
                      {message.moodEmoji}
                    </div>
                  )}
                  {message.uid !== currentUserId && (
                    <div className="message-sender">{message.displayName}</div>
                  )}
                  <div className="message-content">{message.text}</div>
                  <div className="message-time">{formatTime(message.createdAt)}</div>
                </div>
              </div>

              {message.uid === currentUserId && (
                <div className="message-avatar-wrapper">
                  {message.photoURL ? (
                    <img 
                      src={message.photoURL} 
                      alt={message.displayName}
                      className="message-avatar own"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className="message-avatar-fallback own" style={message.photoURL ? { display: 'none' } : {}}>
                    {message.displayName?.[0]?.toUpperCase() || '?'}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </>
      )}
    </div>
  )
}
