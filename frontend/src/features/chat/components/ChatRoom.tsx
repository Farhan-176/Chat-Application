import {
  deleteMessage,
  editMessage,
  fetchModerationReports,
  inviteRoomMember,
  moderateDeleteMessage,
  reportMessage,
  searchMessages,
  sendMessageToServer,
  setTypingStatus,
  trackAnalyticsEvent,
  toggleMessageReaction,
  fetchRoomDigest,
  getRoomReadState,
  markRoomRead,
  fetchMessageTranslations,
  prewarmMessageTranslations,
} from '../../../core/shared/api'
import { FileUploader } from '../../../core/shared/api/fileUploader'
import { featureFlags } from '../../../core/shared/config'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { TypingIndicator } from './TypingIndicator'
import { AIPanel } from './AIPanel'
import { RoomExpiryBanner } from '../../../features/rooms/components/RoomExpiryBanner'
import { VaultInterface } from './VaultInterface'
import { useChatRoom } from '../hooks/useChatRoom'
import { ModerationReport, RoomDigest, User, VibeType } from '../../../core/shared/types'
import './ChatRoom.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Sparkles, Timer } from 'lucide-react'
import { loadVibe } from '../utils/vibeUtils'

interface ChatRoomProps {
  user: User
  roomId: string
  vibe?: VibeType
  expiresAt?: Date | null
}


export const ChatRoom = ({ user, roomId, vibe = 'default', expiresAt }: ChatRoomProps) => {

  const {
    messages,
    roomName,
    roomVisibility,
    roomTranslationMode,
    roomDefaultLanguage,
    roomMemberCount,
    isRoomCreator,
    canModerateRoom,
    typingUsers,
    loading,
    loadingOlder,
    hasMoreMessages,
    onlineCount,
    error,
    vaultMessages,
    loadingVault,
    loadOlderMessages,
    saveToVault,
    removeFromVault,
    refreshVault,
  } = useChatRoom(roomId, user)
  const [editingMessage, setEditingMessage] = useState<{ id: string; text: string } | null>(null)
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isModerationOpen, setIsModerationOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<typeof messages>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [moderationReports, setModerationReports] = useState<ModerationReport[]>([])
  const [isLoadingReports, setIsLoadingReports] = useState(false)
  const [moderationError, setModerationError] = useState('')
  const [isDigestOpen, setIsDigestOpen] = useState(false)
  const [isLoadingDigest, setIsLoadingDigest] = useState(false)
  const [isMarkingRead, setIsMarkingRead] = useState(false)
  const [digestError, setDigestError] = useState('')
  const [digest, setDigest] = useState<RoomDigest | null>(null)
  const [translationEnabled, setTranslationEnabled] = useState(false)
  const [translationError, setTranslationError] = useState('')
  const [isTranslating, setIsTranslating] = useState(false)
  const [isPrewarmingTranslations, setIsPrewarmingTranslations] = useState(false)
  const [prewarmMessage, setPrewarmMessage] = useState('')
  const [translatedByMessageId, setTranslatedByMessageId] = useState<Record<string, {
    text: string
    sourceLanguage: string
    targetLanguage: string
  }>>({})
  // Phase 1 — Differentiation state
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false)
  const [isVaultOpen, setIsVaultOpen] = useState(false)
  const [ephemeralCountdown, setEphemeralCountdown] = useState<string | null>(null)

  const inviteCardRef = useRef<HTMLDivElement>(null)
  const searchCardRef = useRef<HTMLDivElement>(null)
  const moderationCardRef = useRef<HTMLDivElement>(null)
  const digestCardRef = useRef<HTMLDivElement>(null)
  const readSyncTimerRef = useRef<number | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Load vibe theme when room vibe changes
  useEffect(() => {
    if (vibe && vibe !== 'default') {
      loadVibe(vibe)
    }
  }, [vibe])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (isInviteOpen && inviteCardRef.current && !inviteCardRef.current.contains(target)) {
        setIsInviteOpen(false)
      }
      if (isSearchOpen && searchCardRef.current && !searchCardRef.current.contains(target)) {
        setIsSearchOpen(false)
      }
      if (isModerationOpen && moderationCardRef.current && !moderationCardRef.current.contains(target)) {
        setIsModerationOpen(false)
      }
      if (isDigestOpen && digestCardRef.current && !digestCardRef.current.contains(target)) {
        setIsDigestOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isDigestOpen, isInviteOpen, isModerationOpen, isSearchOpen])

  // Ephemeral room countdown ticker
  useEffect(() => {
    if (!expiresAt || !featureFlags.ephemeralRooms) {
      setEphemeralCountdown(null)
      return
    }

    const tick = () => {
      const now = Date.now()
      const diff = expiresAt.getTime() - now
      if (diff <= 0) {
        setEphemeralCountdown('Expired')
        return
      }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setEphemeralCountdown(
        h > 0 ? `⏳ ${h}h ${m}m left` : m > 0 ? `⏳ ${m}m ${s}s left` : `⏳ ${s}s left`
      )
    }

    tick()
    const interval = window.setInterval(tick, 1000)
    return () => window.clearInterval(interval)
  }, [expiresAt])


  useEffect(() => {
    if (!featureFlags.roomTranslationToggle) {
      setTranslationEnabled(false)
      return
    }

    const roomTranslationStorageKey = `flamechat:translate:${roomId}`
    const stored = window.localStorage.getItem(roomTranslationStorageKey)
    if (roomTranslationMode === 'off') {
      setTranslationEnabled(false)
      window.localStorage.removeItem(roomTranslationStorageKey)
      return
    }

    if (roomTranslationMode === 'auto') {
      setTranslationEnabled(true)
      return
    }

    setTranslationEnabled(stored === '1')
  }, [roomId, roomTranslationMode])

  useEffect(() => {
    if (!featureFlags.roomTranslationToggle) {
      return
    }

    if (roomTranslationMode === 'off') {
      return
    }

    const roomTranslationStorageKey = `flamechat:translate:${roomId}`
    window.localStorage.setItem(roomTranslationStorageKey, translationEnabled ? '1' : '0')
  }, [roomId, roomTranslationMode, translationEnabled])

  useEffect(() => {
    return () => {
      if (readSyncTimerRef.current !== null) {
        window.clearTimeout(readSyncTimerRef.current)
      }
    }
  }, [])

  const syncRoomReadState = async () => {
    if (isMarkingRead || document.visibilityState !== 'visible') {
      return
    }

    try {
      setIsMarkingRead(true)
      await markRoomRead(roomId)
    } catch (error) {
      console.error('Failed to sync room read-state:', error)
    } finally {
      setIsMarkingRead(false)
    }
  }

  useEffect(() => {
    if (readSyncTimerRef.current !== null) {
      window.clearTimeout(readSyncTimerRef.current)
    }

    readSyncTimerRef.current = window.setTimeout(() => {
      syncRoomReadState().catch((error) => {
        console.error('Initial read-state sync failed:', error)
      })
    }, 350)
  }, [roomId])

  const latestMessageKey = useMemo(() => {
    const latest = messages[messages.length - 1]
    return latest ? `${latest.id}-${latest.createdAt.getTime()}` : 'empty'
  }, [messages])

  useEffect(() => {
    if (messages.length === 0) {
      return
    }

    if (readSyncTimerRef.current !== null) {
      window.clearTimeout(readSyncTimerRef.current)
    }

    readSyncTimerRef.current = window.setTimeout(() => {
      syncRoomReadState().catch((error) => {
        console.error('Message-triggered read-state sync failed:', error)
      })
    }, 700)
  }, [latestMessageKey, messages.length])

  useEffect(() => {
    setTranslatedByMessageId({})
    setTranslationError('')
    setPrewarmMessage('')
  }, [roomId, roomDefaultLanguage])

  const translationMessageKey = useMemo(() => {
    const latest = messages[messages.length - 1]
    return latest ? `${latest.id}-${latest.createdAt.getTime()}` : 'empty'
  }, [messages])

  useEffect(() => {
    if (!featureFlags.roomTranslationToggle) {
      setIsTranslating(false)
      return
    }

    const shouldTranslate = roomTranslationMode !== 'off' && translationEnabled
    if (!shouldTranslate || messages.length === 0) {
      return
    }

    const targetLanguage = (roomDefaultLanguage || 'en').toLowerCase()
    const untranslatedIds = messages
      .filter((message) => {
        const text = String(message.text || '').trim()
        return text.length > 0 && !translatedByMessageId[message.id]
      })
      .slice(-80)
      .map((message) => message.id)

    if (untranslatedIds.length === 0) {
      return
    }

    let cancelled = false
    setIsTranslating(true)
    setTranslationError('')

    fetchMessageTranslations(roomId, untranslatedIds, targetLanguage)
      .then((response) => {
        if (cancelled) {
          return
        }

        const nextEntries: Record<string, {
          text: string
          sourceLanguage: string
          targetLanguage: string
        }> = {}

        Object.entries(response.translations || {}).forEach(([messageId, translation]) => {
          nextEntries[messageId] = {
            text: translation.text,
            sourceLanguage: translation.sourceLanguage,
            targetLanguage: translation.targetLanguage,
          }
        })

        setTranslatedByMessageId((prev) => ({
          ...prev,
          ...nextEntries,
        }))
      })
      .catch((error) => {
        console.error('Failed to fetch message translations:', error)
        if (!cancelled) {
          setTranslationError('Translation unavailable right now.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsTranslating(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [roomId, roomDefaultLanguage, roomTranslationMode, translationEnabled, translationMessageKey, translatedByMessageId, messages])

  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      const isSearchShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k'

      if (isSearchShortcut) {
        event.preventDefault()
        setIsSearchOpen(true)
        requestAnimationFrame(() => {
          searchInputRef.current?.focus()
        })
        return
      }

      if (event.key === 'Escape') {
        setIsInviteOpen(false)
        setIsSearchOpen(false)
        setIsModerationOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyboardShortcut)
    return () => window.removeEventListener('keydown', handleKeyboardShortcut)
  }, [])

  const loadModerationReports = async () => {
    try {
      setIsLoadingReports(true)
      setModerationError('')
      const response = await fetchModerationReports(roomId, 'open')
      const mapped = (response.reports || []).map((report: any) => ({
        ...report,
        createdAt: report.createdAt ? new Date(report.createdAt) : null,
      }))
      setModerationReports(mapped)
    } catch (error) {
      console.error('Failed to fetch moderation reports:', error)
      setModerationError('Could not load moderation queue.')
      setModerationReports([])
    } finally {
      setIsLoadingReports(false)
    }
  }

  useEffect(() => {
    if (isModerationOpen && isRoomCreator) {
      loadModerationReports().catch((error) => {
        console.error('Failed to load moderation reports:', error)
      })
    }
  }, [isModerationOpen, isRoomCreator, roomId])

  const activeMessages = useMemo(() => {
    const baseMessages = !searchQuery.trim() ? messages : searchResults

    if (!translationEnabled || roomTranslationMode === 'off') {
      return baseMessages
    }

    return baseMessages.map((message) => {
      const translated = translatedByMessageId[message.id]
      if (!translated || !translated.text || translated.text === message.text) {
        return message
      }

      return {
        ...message,
        translatedText: translated.text,
        translatedFromLanguage: translated.sourceLanguage,
        translatedToLanguage: translated.targetLanguage,
      }
    })
  }, [messages, searchQuery, searchResults, translationEnabled, roomTranslationMode, translatedByMessageId])

  const handleSendMessage = async (
    text: string,
    isGhostMode: boolean = false,
    ttl: number = 30,
    attachments?: any[],
    sealedUntil?: Date | null,
    capsuleLabel?: string
  ) => {
    try {
      if (editingMessage) {
        await editMessage(roomId, editingMessage.id, text)
        setEditingMessage(null)
        return
      }

      let uploadedAttachments = attachments || []
      if (attachments && attachments.length > 0) {
        const uploadQueue = attachments.filter((item) => item?._file instanceof File)
        if (uploadQueue.length > 0) {
          uploadedAttachments = []
          for (const queued of uploadQueue) {
            const validationError = FileUploader.validate(queued._file)
            if (validationError) {
              throw new Error(validationError)
            }

            const uploaded = await FileUploader.upload(queued._file, roomId)
            uploadedAttachments.push(uploaded)
          }
        }
      }

      await sendMessageToServer(roomId, text, isGhostMode, ttl, uploadedAttachments, sealedUntil, capsuleLabel)
      await trackAnalyticsEvent('message_sent', {
        has_attachments: uploadedAttachments.length > 0,
        ghost_mode: isGhostMode,
        is_sealed: !!sealedUntil,
      })
    } catch (error) {
      console.error('Error sending message:', error)

      throw error
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    await deleteMessage(roomId, messageId)
    if (editingMessage?.id === messageId) {
      setEditingMessage(null)
    }
  }

  const handleStartEdit = (messageId: string, text: string) => {
    setEditingMessage({ id: messageId, text })
  }

  const handleTyping = async (isTyping: boolean) => {
    try {
      await setTypingStatus(roomId, isTyping)
    } catch (error) {
      console.error('Error updating typing status:', error)
    }
  }

  const handleQuickInvite = async () => {
    const normalized = inviteEmail.trim().toLowerCase()
    if (!normalized) {
      setInviteMessage('Enter an email to invite.')
      return
    }

    try {
      setIsInviting(true)
      setInviteMessage('')
      await inviteRoomMember(roomId, normalized)
      setInviteEmail('')
      setInviteMessage('Member invited successfully.')
    } catch (error) {
      console.error('Invite failed:', error)
      setInviteMessage('Invite failed. Check email and try again.')
    } finally {
      setIsInviting(false)
    }
  }

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    try {
      await toggleMessageReaction(roomId, messageId, emoji)
    } catch (error) {
      console.error('Failed to toggle reaction:', error)
    }
  }

  const handleReportMessage = async (
    messageId: string,
    reason: 'spam' | 'harassment' | 'abuse' | 'off-topic' | 'other',
    note?: string
  ) => {
    await reportMessage(roomId, messageId, reason, note)
  }

  const handleModerateDelete = async (messageId: string, reportId?: string) => {
    await moderateDeleteMessage(roomId, messageId, reportId)
    if (isModerationOpen) {
      await loadModerationReports()
    }
  }

  const handleMessageSearch = async () => {
    const normalized = searchQuery.trim()
    if (!normalized) {
      setSearchError('')
      setSearchResults([])
      return
    }

    try {
      setIsSearching(true)
      setSearchError('')
      const response = await searchMessages(roomId, normalized)
      const mapped = (response.messages || []).map((message: any) => ({
        ...message,
        createdAt: message.createdAt ? new Date(message.createdAt) : new Date(),
        editedAt: message.editedAt ? new Date(message.editedAt) : null,
      }))
      setSearchResults(mapped)
    } catch (error) {
      console.error('Message search failed:', error)
      setSearchError('Search failed. Please try again.')
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setSearchError('')
  }

  const handleLoadDigest = async () => {
    if (!featureFlags.roomDigest) {
      return
    }

    try {
      setIsLoadingDigest(true)
      setDigestError('')

      const readState = await getRoomReadState(roomId)
      const response = await fetchRoomDigest(roomId, readState.lastReadAt || undefined, 120)
      setDigest(response.digest)
      setIsDigestOpen(true)
      await trackAnalyticsEvent('digest_generated', {
        room_id: roomId,
        unread_count: response.digest.unreadCount,
        mention_count: response.digest.mentionCount,
        action_items: response.digest.actionItems.length,
        since_source: response.digest.sinceSource,
      })
    } catch (error) {
      console.error('Digest generation failed:', error)
      setDigestError('Unable to generate catch-up digest right now.')
      setDigest(null)
      setIsDigestOpen(true)
      await trackAnalyticsEvent('digest_generation_failed', {
        room_id: roomId,
      })
    } finally {
      setIsLoadingDigest(false)
    }
  }

  const handleMarkReadNow = async () => {
    await syncRoomReadState()
    setIsDigestOpen(false)
  }

  const handleToggleTranslation = async () => {
    if (!featureFlags.roomTranslationToggle) {
      return
    }

    const nextEnabled = !translationEnabled
    setTranslationEnabled(nextEnabled)
    if (!nextEnabled) {
      setTranslationError('')
    }
    await trackAnalyticsEvent('translation_toggled', {
      room_id: roomId,
      enabled: nextEnabled,
      translation_mode: roomTranslationMode,
    })
  }

  const handlePrewarmTranslations = async () => {
    if (!featureFlags.roomTranslationToggle) {
      return
    }

    try {
      setIsPrewarmingTranslations(true)
      setPrewarmMessage('')

      const response = await prewarmMessageTranslations(roomId, roomDefaultLanguage, 120)
      setPrewarmMessage(`Pre-warm complete: ${response.translated} translated, ${response.cached} cached.`)
      await trackAnalyticsEvent('translation_prewarm_run', {
        room_id: roomId,
        target_language: response.targetLanguage,
        scanned: response.scanned,
        translated: response.translated,
        cached: response.cached,
      })
    } catch (error) {
      console.error('Translation pre-warm failed:', error)
      setPrewarmMessage('Pre-warm failed. Check permissions and try again.')
    } finally {
      setIsPrewarmingTranslations(false)
    }
  }

  if (error) {
    return (
      <div className="chat-room error">
        <div className="error-content">
          <h2>Room Unavailable</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry Connection</button>
        </div>
      </div>
    )
  }

  return (
    <div className={`chat-room${vibe && vibe !== 'default' ? ` vibe-${vibe}` : ''}`}>
      <header className="chat-header">
        <div className="header-content">
          <h1>
            <span className="room-hash">#</span>
            {roomName}
          </h1>
          <p className="subtitle">
            Online: <span className="subtitle-count">{onlineCount}</span>
          </p>
          <div className="room-detail-pills">
            <span className={`room-visibility-pill ${roomVisibility}`}>
              {roomVisibility === 'private' ? 'Private Room' : 'Public Room'}
            </span>
            <span className="room-members-pill">{roomMemberCount} members</span>
            <span className="room-translation-pill">
              {roomTranslationMode === 'off' ? 'Translation Off' : `Translation ${roomDefaultLanguage.toUpperCase()}`}
            </span>
            {vibe && vibe !== 'default' && (
              <span className="room-vibe-badge">
                {vibe === 'lofi' ? '🌙' : vibe === 'hype' ? '⚡' : vibe === 'focus' ? '🔥' : vibe === 'chill' ? '🌿' : '🌌'}
                {' '}{vibe}
              </span>
            )}
            {ephemeralCountdown && (
              <span className="room-countdown-badge">
                <Timer size={10} />
                {ephemeralCountdown}
              </span>
            )}
          </div>

        </div>
        <div className="chat-header-actions">
          <span className="live-badge">Live</span>

          {featureFlags.aiPanel && (
            <button
              type="button"
              className={`ai-panel-btn${isAIPanelOpen ? ' active' : ''}`}
              onClick={() => setIsAIPanelOpen((prev) => !prev)}
              title="AI Intelligence Panel"
            >
              <Sparkles size={13} />
              AI
            </button>
          )}

          <button
            type="button"
            className={`quick-invite-btn ${isVaultOpen ? 'active' : ''}`}
            onClick={() => setIsVaultOpen(true)}
            title="Message Vault"
          >
            Vault
          </button>

          {featureFlags.roomDigest && (
            <button
              type="button"
              className="quick-invite-btn"
              onClick={() => {
                handleLoadDigest().catch((digestLoadError) => {
                  console.error('Digest generation failed:', digestLoadError)
                })
              }}
              disabled={isLoadingDigest}
            >
              {isLoadingDigest ? 'Catching up...' : 'Catch up'}
            </button>
          )}

          {featureFlags.roomTranslationToggle && (
            <button
              type="button"
              className="quick-invite-btn"
              disabled={roomTranslationMode === 'off'}
              onClick={() => {
                handleToggleTranslation().catch((toggleError) => {
                  console.error('Translation toggle tracking failed:', toggleError)
                })
              }}
            >
              {translationEnabled ? 'Translate: On' : 'Translate: Off'}
            </button>
          )}

          {featureFlags.roomTranslationToggle && canModerateRoom && (
            <button
              type="button"
              className="quick-invite-btn"
              onClick={() => {
                handlePrewarmTranslations().catch((prewarmError) => {
                  console.error('Prewarm action failed:', prewarmError)
                })
              }}
              disabled={isPrewarmingTranslations}
            >
              {isPrewarmingTranslations ? 'Prewarming...' : 'Pre-warm'}
            </button>
          )}

          {featureFlags.roomTranslationToggle && isTranslating && <span className="translation-status-pill">Translating...</span>}
          {featureFlags.roomTranslationToggle && translationError && <span className="translation-status-pill error">{translationError}</span>}
          {featureFlags.roomTranslationToggle && prewarmMessage && (
            <span className={`translation-status-pill ${prewarmMessage.includes('failed') ? 'error' : 'success'}`}>
              {prewarmMessage}
            </span>
          )}

          <button
            type="button"
            className="quick-invite-btn"
            onClick={() => setIsSearchOpen((prev) => !prev)}
          >
            Search
          </button>

          {featureFlags.roomDigest && isDigestOpen && (
            <div className="quick-invite-card digest-card" ref={digestCardRef}>
              <div className="moderation-card-header">
                <label>Catch-up digest</label>
                <button type="button" onClick={() => setIsDigestOpen(false)}>Close</button>
              </div>

              {digestError && <p className="message-search-error">{digestError}</p>}

              {digest && (
                <>
                  <p className="digest-summary">{digest.summary}</p>
                  <p className="digest-metrics">
                    {digest.unreadCount} unread • {digest.mentionCount} mentions
                  </p>
                  {digest.sinceAt && (
                    <p className="digest-since-meta">
                      Since {new Date(digest.sinceAt).toLocaleString()} ({digest.sinceSource})
                    </p>
                  )}
                  {digest.actionItems.length > 0 && (
                    <div className="digest-action-items">
                      <strong>Action items</strong>
                      {digest.actionItems.map((item, index) => (
                        <p key={`${item}-${index}`}>{item}</p>
                      ))}
                    </div>
                  )}
                  {digest.highlights.length > 0 && (
                    <div className="digest-highlights">
                      {digest.highlights.map((highlight, index) => (
                        <p key={`${highlight}-${index}`}>{highlight}</p>
                      ))}
                    </div>
                  )}
                  <button type="button" onClick={() => handleMarkReadNow().catch((error) => {
                    console.error('Manual read-state sync failed:', error)
                  })}>
                    Mark As Read
                  </button>
                </>
              )}
            </div>
          )}

          {isSearchOpen && (
            <div className="quick-invite-card search-card" ref={searchCardRef}>
              <label htmlFor="messageSearch">Search messages</label>
              <div className="quick-invite-row">
                <input
                  ref={searchInputRef}
                  id="messageSearch"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => {
                    const next = event.target.value
                    setSearchQuery(next)
                    if (!next.trim()) {
                      setSearchError('')
                      setSearchResults([])
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      handleMessageSearch().catch((error) => {
                        console.error('Message search failed:', error)
                      })
                    }
                  }}
                  placeholder="keyword"
                />
                <button type="button" onClick={handleMessageSearch} disabled={isSearching}>
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
              {searchQuery.trim() && !isSearching && !searchError && (
                <p className="message-search-meta">Showing {searchResults.length} result(s)</p>
              )}
              {searchError && <p className="message-search-error">{searchError}</p>}
              {searchQuery.trim() && (
                <button type="button" className="search-clear-btn" onClick={clearSearch}>
                  Clear
                </button>
              )}
            </div>
          )}

          {canModerateRoom && (
            <button
              type="button"
              className="quick-invite-btn"
              onClick={() => {
                setModerationError('')
                setIsModerationOpen((prev) => !prev)
              }}
            >
              Moderation
            </button>
          )}

          {isModerationOpen && canModerateRoom && (
            <div className="quick-invite-card moderation-card" ref={moderationCardRef}>
              <div className="moderation-card-header">
                <label>Open reports</label>
                <button type="button" onClick={() => loadModerationReports()} disabled={isLoadingReports}>
                  Refresh
                </button>
              </div>

              {moderationError && <p className="message-search-error">{moderationError}</p>}

              {isLoadingReports ? (
                <p>Loading reports...</p>
              ) : moderationReports.length === 0 ? (
                <p>No open reports.</p>
              ) : (
                <div className="moderation-report-list">
                  {moderationReports.map((report) => (
                    <div key={report.id} className="moderation-report-item">
                      <p>
                        <strong>{report.reason}</strong> by {report.reporterName}
                      </p>
                      <p className="moderation-preview">{report.messagePreview || 'No preview available'}</p>
                      <button
                        type="button"
                        onClick={() => handleModerateDelete(report.messageId, report.id)}
                      >
                        Delete Message
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {roomVisibility === 'private' && isRoomCreator && (
            <button
              type="button"
              className="quick-invite-btn"
              onClick={() => {
                setInviteMessage('')
                setIsInviteOpen((prev) => !prev)
              }}
            >
              Quick Invite
            </button>
          )}

          {isInviteOpen && (
            <div className="quick-invite-card" ref={inviteCardRef}>
              <label htmlFor="quickInviteEmail">Invite by email</label>
              <div className="quick-invite-row">
                <input
                  id="quickInviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="teammate@company.com"
                />
                <button type="button" onClick={handleQuickInvite} disabled={isInviting}>
                  {isInviting ? 'Inviting...' : 'Invite'}
                </button>
              </div>
              {inviteMessage && <p>{inviteMessage}</p>}
            </div>
          )}
        </div>
      </header>

      {/* AI Intelligence Panel */}
      {featureFlags.aiPanel && (
        <AIPanel
          isOpen={isAIPanelOpen}
          onClose={() => setIsAIPanelOpen(false)}
          messages={activeMessages}
          roomName={roomName}
        />
      )}

      <section className="chat-main-container" aria-busy={loading}>
        {expiresAt && <RoomExpiryBanner expiresAt={expiresAt} />}
        <div className="chat-messages-section">
          <MessageList
            messages={activeMessages}
            currentUserId={user.uid}
            onDeleteMessage={handleDeleteMessage}
            onReportMessage={handleReportMessage}
            onModerateDelete={(messageId) => handleModerateDelete(messageId)}
            onStartEdit={handleStartEdit}
            onLoadOlder={loadOlderMessages}
            hasMoreMessages={!searchQuery.trim() ? hasMoreMessages : false}
            loadingOlder={loadingOlder}
            onToggleReaction={handleToggleReaction}
            canModerate={canModerateRoom}
            searchQuery={searchQuery}
            vaultMessages={vaultMessages}
            onSaveToVault={saveToVault}
            onRemoveFromVault={removeFromVault}
            targetLanguage={roomDefaultLanguage}
          />
        </div>
      </section>

      {isVaultOpen && (
        <div className="vault-overlay">
          <VaultInterface
            vaultMessages={vaultMessages}
            onClose={() => setIsVaultOpen(false)}
            onDeleteMessage={removeFromVault}
          />
        </div>
      )}

      <div className="typing-area">
        <TypingIndicator typingUsers={typingUsers} />
      </div>

      <div className="chat-input-area">
        <MessageInput
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          editingMessage={editingMessage}
          onCancelEdit={() => setEditingMessage(null)}
        />
      </div>
    </div>
  )
}

