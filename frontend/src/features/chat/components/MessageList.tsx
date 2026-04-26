import { useEffect, useMemo, useRef, useState } from 'react'
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso'
import { File as FileIcon, ExternalLink, MoreHorizontal, Pencil, Trash2, Flag, ShieldAlert, SmilePlus, Calendar, CheckCircle, MapPin, AlertTriangle } from 'lucide-react'
import { Message } from '../../../core/shared/types'
import { isMessageSealed } from '../utils/sealUtils'
import SealedMessageBubble from './SealedMessageBubble'
import StarButton from './StarButton'
import TranslateButton from './TranslateButton'
import { VaultMessage, isMessageVaulted } from '../utils/vaultUtils'
import './MessageList.css'

const REACTION_OPTIONS = ['👍', '❤️', '😂', '🔥', '🎉', '😮', '😢', '👏']

interface MessageListProps {
  messages: Message[]
  currentUserId: string
  onDeleteMessage?: (messageId: string) => Promise<void>
  onReportMessage?: (messageId: string, reason: 'spam' | 'harassment' | 'abuse' | 'off-topic' | 'other', note?: string) => Promise<void>
  onModerateDelete?: (messageId: string) => Promise<void>
  onStartEdit?: (messageId: string, text: string) => void
  onLoadOlder?: () => Promise<void>
  hasMoreMessages?: boolean
  loadingOlder?: boolean
  onToggleReaction?: (messageId: string, emoji: string) => Promise<void>
  canModerate?: boolean
  searchQuery?: string
  vaultMessages?: VaultMessage[]
  onSaveToVault?: (message: Message, tags: string[], aiTags: string[]) => Promise<void>
  onRemoveFromVault?: (messageId: string) => Promise<void>
  targetLanguage?: string
}

export const MessageList = ({
  messages,
  currentUserId,
  onDeleteMessage,
  onReportMessage,
  onModerateDelete,
  onStartEdit,
  onLoadOlder,
  hasMoreMessages = false,
  loadingOlder = false,
  onToggleReaction,
  canModerate = false,
  searchQuery = '',
  vaultMessages = [],
  onSaveToVault,
  onRemoveFromVault,
  targetLanguage = 'English',
}: MessageListProps) => {
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const [busyActionId, setBusyActionId] = useState<string | null>(null)
  const [pickerMessageId, setPickerMessageId] = useState<string | null>(null)
  const [actionMenuMessageId, setActionMenuMessageId] = useState<string | null>(null)

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Element
      // Ensure clicks outside of actions menu close the popups
      if (!target.closest('.message-actions-menu') && !target.closest('.message-actions-trigger') && !target.closest('.reaction-picker')) {
        setActionMenuMessageId(null)
        setPickerMessageId(null)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const formatTime = (date: Date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return ''
    }
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  const removeMessage = async (messageId: string) => {
    if (!onDeleteMessage) return
    if (!window.confirm('Delete this message?')) return
    try {
      setBusyActionId(messageId)
      await onDeleteMessage(messageId)
    } finally {
      setBusyActionId(null)
    }
  }

  const reportMessage = async (messageId: string) => {
    if (!onReportMessage) return
    const reasonInput = window.prompt('Reason (spam, harassment, abuse, off-topic, other)', 'spam')
    if (!reasonInput) return

    const normalized = reasonInput.trim().toLowerCase()
    const allowedReasons = ['spam', 'harassment', 'abuse', 'off-topic', 'other']
    if (!allowedReasons.includes(normalized)) {
      window.alert('Invalid reason. Use: spam, harassment, abuse, off-topic, other.')
      return
    }

    const note = window.prompt('Optional note for moderators (max 300 chars)') || undefined
    try {
      setBusyActionId(messageId)
      await onReportMessage(messageId, normalized as 'spam' | 'harassment' | 'abuse' | 'off-topic' | 'other', note)
      window.alert('Message reported. Moderators have been notified.')
    } finally {
      setBusyActionId(null)
    }
  }

  const moderateDelete = async (messageId: string) => {
    if (!onModerateDelete) return
    if (!window.confirm('Delete this message as moderator?')) return

    try {
      setBusyActionId(messageId)
      await onModerateDelete(messageId)
    } finally {
      setBusyActionId(null)
    }
  }

  const sequenceMeta = useMemo(() => {
    return messages.map((msg, index) => {
      const prevMsg = messages[index - 1]
      const nextMsg = messages[index + 1]

      const TIME_THRESHOLD = 5 * 60 * 1000 // 5 minutes

      const isSameUserAsPrev = prevMsg && prevMsg.uid === msg.uid
      const isSameUserAsNext = nextMsg && nextMsg.uid === msg.uid

      const timeDiffPrev = prevMsg ? new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() : Infinity
      const timeDiffNext = nextMsg ? new Date(nextMsg.createdAt).getTime() - new Date(msg.createdAt).getTime() : Infinity

      const isGroupedWithPrev = isSameUserAsPrev && timeDiffPrev < TIME_THRESHOLD
      const isGroupedWithNext = isSameUserAsNext && timeDiffNext < TIME_THRESHOLD

      let position: 'top' | 'middle' | 'bottom' | 'standalone' = 'standalone'
      if (!isGroupedWithPrev && isGroupedWithNext) position = 'top'
      if (isGroupedWithPrev && isGroupedWithNext) position = 'middle'
      if (isGroupedWithPrev && !isGroupedWithNext) position = 'bottom'

      return {
        message: { ...msg, clusterPosition: position },
        position,
        isFirstInSequence: !isGroupedWithPrev,
      }
    })
  }, [messages])

  const highlightMessageText = (text: string) => {
    const normalizedQuery = searchQuery.trim()
    if (!normalizedQuery) {
      return text
    }

    const escaped = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(${escaped})`, 'ig')
    const segments = text.split(regex)

    return segments.map((segment, index) => {
      const isMatch = segment.toLowerCase() === normalizedQuery.toLowerCase()
      if (isMatch) {
        return <mark key={`${segment}-${index}`} className="search-highlight">{segment}</mark>
      }
      return <span key={`${segment}-${index}`}>{segment}</span>
    })
  }

  return (
    <div className="message-list-container" style={{ flex: 1, height: '100%', minHeight: 0, width: '100%' }}>
      {messages.length === 0 ? (
        <div className="no-messages message-list">
          <p>This is the beginning of your legendary conversation.</p>
        </div>
      ) : (
        <Virtuoso
          ref={virtuosoRef}
          data={sequenceMeta}
          className="message-list"
          initialTopMostItemIndex={sequenceMeta.length - 1}
          followOutput="smooth"
          startReached={() => {
            if (hasMoreMessages && !loadingOlder && onLoadOlder) {
              onLoadOlder().catch(console.error)
            }
          }}
          components={{
            Header: () => (
              <>
                {loadingOlder && (
                  <div className="older-loader" role="status" aria-live="polite">
                    Loading older messages...
                  </div>
                )}
                {!hasMoreMessages && messages[0]?.id && (
                  <div className="older-loader done">Start of conversation</div>
                )}
              </>
            )
          }}
          itemContent={(_index, { message, position, isFirstInSequence }) => {
            // Check if message is sealed
            const messageIsSealed = isMessageSealed(message.sealedUntil);
            
            if (messageIsSealed) {
              return (
                <SealedMessageBubble
                  key={message.id}
                  text={message.text}
                  senderName={message.displayName || 'Unknown'}
                  sealedUntil={message.sealedUntil || new Date()}
                  isOwn={message.uid === currentUserId}
                />
              );
            }
            
            return (
              <div
                key={message.id}
                className={`message-wrapper ${message.uid === currentUserId ? 'own' : 'other'} cluster-${position} ${message.isEphemeral ? 'ephemeral' : ''} ${message.dissolved ? 'dissolved' : ''} ${isFirstInSequence ? '' : 'continued'} new-message ${message.isOptimistic ? 'optimistic-sending' : ''}`}
              >
              {message.uid !== currentUserId && (
                <div className="message-avatar-wrapper">
                  {isFirstInSequence ? (
                    <>
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
                    </>
                  ) : (
                    <div className="message-avatar-placeholder" />
                  )}
                </div>
              )}
              
              <div className="message-content-wrapper">
                {message.uid !== currentUserId && isFirstInSequence && (
                  <div className="message-sender">{message.displayName}</div>
                )}
                <div
                  className={`message-bubble bubble-${position} ${message.uid === currentUserId ? 'own' : 'other'} ${message.mood ? `mood-${message.mood}` : ''} ${message.isEphemeral ? 'ghostly' : ''}`}
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
                  <div className="message-content-row">
                    <div className="message-content">
                      {highlightMessageText(message.translatedText || message.text)}
                      {message.translatedText && message.translatedText !== message.text && (
                        <div className="message-original-text">
                          Original: {message.text}
                        </div>
                      )}
                    </div>

                    {(!message.attachments || message.attachments.length === 0) && (
                      <div className="message-meta message-meta-inline">
                        {message.edited ? <span className="message-edited">(edited)</span> : null}
                        <span className="message-time">{formatTime(message.createdAt)}</span>
                      </div>
                    )}
                  </div>

                  {/* Smart Actions */}
                  {message.smartActions && message.smartActions.length > 0 && (
                    <div className="smart-actions-container">
                      {message.smartActions.map((action, idx) => (
                        <button 
                          key={idx} 
                          className={`smart-action-btn action-${action.type}`}
                          onClick={() => console.log(`Triggered ${action.type}:`, action.payload)}
                        >
                          {action.type === 'calendar' && <Calendar size={12} />}
                          {action.type === 'task' && <CheckCircle size={12} />}
                          {action.type === 'map' && <MapPin size={12} />}
                          {action.type === 'link' && <ExternalLink size={12} />}
                          <span>{action.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {message.attachments && message.attachments.length > 0 && (
                    <div className="message-attachments">
                      {message.attachments.map((file, idx) => (
                        <div key={idx} className="attachment-item">
                          {file.type.startsWith('image/') ? (
                            <img 
                              src={file.url} 
                              alt={file.name} 
                              className="attachment-image"
                              onClick={() => window.open(file.url, '_blank')}
                            />
                          ) : (
                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="attachment-file-card">
                              <FileIcon size={16} />
                              <span className="file-info">
                                <span className="name">{file.name}</span>
                                <span className="size">{(file.size / 1024).toFixed(1)} KB</span>
                              </span>
                              <ExternalLink size={14} className="external-icon" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {message.attachments && message.attachments.length > 0 && (
                    <div className="message-meta">
                      {message.edited ? <span className="message-edited">(edited)</span> : null}
                      <span className="message-time">{formatTime(message.createdAt)}</span>
                    </div>
                  )}

                  {(message.reactions && Object.keys(message.reactions).length > 0) || pickerMessageId === message.id ? (
                    <div className="message-reactions compact">
                      {message.reactions &&
                        Object.entries(message.reactions).map(([emoji, users]) => (
                          <button
                            key={`${message.id}-${emoji}`}
                            type="button"
                            className={`reaction-chip ${users.includes(currentUserId) ? 'active' : ''}`}
                            onClick={() => onToggleReaction?.(message.id, emoji)}
                          >
                            <span>{emoji}</span>
                            <span>{users.length}</span>
                          </button>
                        ))}

                      {pickerMessageId === message.id && (
                        <div className="reaction-picker">
                          {REACTION_OPTIONS.map((emoji) => (
                            <button
                              key={`${message.id}-pick-${emoji}`}
                              type="button"
                              className="reaction-picker-btn"
                              onClick={() => {
                                setPickerMessageId(null)
                                onToggleReaction?.(message.id, emoji)
                              }}
                              title={`React with ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div className="message-bubble-tools">
                    <TranslateButton
                      messageId={message.id}
                      messageText={message.text}
                      targetLanguage={targetLanguage}
                    />
                    <StarButton
                      messageId={message.id}
                      messageText={message.text}
                      isSaved={isMessageVaulted(message.id, vaultMessages)}
                      onSave={(tags, aiTags) => onSaveToVault?.(message, tags, aiTags)}
                      onRemove={() => onRemoveFromVault?.(message.id)}
                    />
                  </div>

                  <div className="message-actions">
                    <button
                      type="button"
                      className="message-actions-trigger"
                      aria-label="Message actions"
                      aria-expanded={actionMenuMessageId === message.id}
                      onClick={() => {
                        setPickerMessageId(null)
                        setActionMenuMessageId((prev) => (prev === message.id ? null : message.id))
                      }}
                      disabled={busyActionId === message.id}
                    >
                      <MoreHorizontal size={14} />
                    </button>

                    {actionMenuMessageId === message.id && (
                      <div
                        className={`message-actions-menu ${message.uid === currentUserId ? 'own' : 'other'}`}
                        role="menu"
                      >
                        {message.uid === currentUserId ? (
                          <>
                            <button
                              type="button"
                              className="message-action-item"
                              role="menuitem"
                              onClick={() => {
                                setActionMenuMessageId(null)
                                setPickerMessageId((prev) => (prev === message.id ? null : message.id))
                              }}
                              disabled={busyActionId === message.id}
                            >
                              <SmilePlus size={14} className="message-action-icon" aria-hidden="true" />
                              <span>Add reaction</span>
                            </button>
                            <button
                              type="button"
                              className="message-action-item"
                              role="menuitem"
                              onClick={() => {
                                setActionMenuMessageId(null)
                                onStartEdit?.(message.id, message.text)
                              }}
                              disabled={busyActionId === message.id}
                            >
                              <Pencil size={14} className="message-action-icon" aria-hidden="true" />
                              <span>Edit message</span>
                            </button>
                            <div className="message-action-divider" role="separator" />
                            <button
                              type="button"
                              className="message-action-item danger"
                              role="menuitem"
                              onClick={() => {
                                setActionMenuMessageId(null)
                                void removeMessage(message.id)
                              }}
                              disabled={busyActionId === message.id}
                            >
                              <Trash2 size={14} className="message-action-icon" aria-hidden="true" />
                              <span>Delete message</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="message-action-item"
                              role="menuitem"
                              onClick={() => {
                                setActionMenuMessageId(null)
                                setPickerMessageId((prev) => (prev === message.id ? null : message.id))
                              }}
                              disabled={busyActionId === message.id}
                            >
                              <SmilePlus size={14} className="message-action-icon" aria-hidden="true" />
                              <span>Add reaction</span>
                            </button>
                            <button
                              type="button"
                              className="message-action-item"
                              role="menuitem"
                              onClick={() => {
                                setActionMenuMessageId(null)
                                void reportMessage(message.id)
                              }}
                              disabled={busyActionId === message.id}
                            >
                              <Flag size={14} className="message-action-icon" aria-hidden="true" />
                              <span>Report message</span>
                            </button>
                            {canModerate && (
                              <>
                                <div className="message-action-divider" role="separator" />
                                <button
                                  type="button"
                                  className="message-action-item danger"
                                  role="menuitem"
                                  onClick={() => {
                                    setActionMenuMessageId(null)
                                    void moderateDelete(message.id)
                                  }}
                                  disabled={busyActionId === message.id}
                                >
                                  <ShieldAlert size={14} className="message-action-icon" aria-hidden="true" />
                                  <span>Moderator delete</span>
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {message.uid === currentUserId && (
                <div className="message-avatar-wrapper">
                  {isFirstInSequence ? (
                    <>
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
                    </>
                  ) : (
                    <div className="message-avatar-placeholder" />
                  )}
                </div>
              )}
            </div>
            );
          }}
        />
      )}
    </div>
  )
}

