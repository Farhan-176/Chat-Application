import { useState, useRef, useEffect } from 'react'
import { Ghost, Send, Paperclip, X, Lock, Wand2 } from 'lucide-react'
import TextareaAutosize from 'react-textarea-autosize'
import { featureFlags } from '../../../core/shared/config'
import { rewriteMessageTone, ToneStyle } from '../../../core/shared/api/geminiService'
import './MessageInput.css'

interface MessageInputProps {
  onSendMessage: (
    text: string,
    isGhostMode?: boolean,
    ttl?: number,
    attachments?: any[],
    sealedUntil?: Date | null,
    capsuleLabel?: string
  ) => Promise<void>
  onTyping?: (isTyping: boolean) => void
  disabled?: boolean
  editingMessage?: { id: string; text: string } | null
  onCancelEdit?: () => void
}

const TONE_OPTIONS: { id: ToneStyle; label: string; emoji: string }[] = [
  { id: 'professional', label: 'Professional', emoji: '👔' },
  { id: 'friendly',     label: 'Friendly',     emoji: '😊' },
  { id: 'shorter',      label: 'Shorter',       emoji: '✂️' },
  { id: 'direct',       label: 'Direct',        emoji: '🎯' },
  { id: 'casual',       label: 'Casual',        emoji: '😎' },
]

export const MessageInput = ({
  onSendMessage,
  onTyping,
  disabled = false,
  editingMessage = null,
  onCancelEdit,
}: MessageInputProps) => {
  const [message, setMessage]             = useState('')
  const [isLoading, setIsLoading]         = useState(false)
  const [isGhostMode, setIsGhostMode]     = useState(false)
  const [ttl, setTtl]                     = useState(30)
  const [typingTimeout, setTypingTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [pendingFile, setPendingFile]     = useState<File | null>(null)

  // Time Capsule state
  const [isCapsuleMode, setIsCapsuleMode]     = useState(false)
  const [capsuleDate, setCapsuleDate]          = useState('')     // datetime-local value
  const [capsuleLabel, setCapsuleLabel]        = useState('')
  const [isCapsuleOpen, setIsCapsuleOpen]      = useState(false)
  const capsuleRef                             = useRef<HTMLDivElement>(null)

  // Tone Rewriter state
  const [isToneOpen, setIsToneOpen]           = useState(false)
  const [isRewriting, setIsRewriting]         = useState(false)
  const [rewriteError, setRewriteError]       = useState('')
  const toneRef                               = useRef<HTMLDivElement>(null)

  const textareaRef  = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Populate textarea when editing
  useEffect(() => {
    if (editingMessage) {
      setMessage(editingMessage.text)
      setIsGhostMode(false)
      setIsCapsuleMode(false)
      setPendingFile(null)
      requestAnimationFrame(() => textareaRef.current?.focus())
    }
  }, [editingMessage])

  // Close popups on outside click
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (isCapsuleOpen && capsuleRef.current && !capsuleRef.current.contains(e.target as Node)) {
        setIsCapsuleOpen(false)
      }
      if (isToneOpen && toneRef.current && !toneRef.current.contains(e.target as Node)) {
        setIsToneOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isCapsuleOpen, isToneOpen])

  // ── Submit ──────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedMessage = message.trim()
    if ((!trimmedMessage && !pendingFile) || isLoading) return

    // Validate capsule date
    let sealedUntil: Date | null = null
    if (isCapsuleMode && capsuleDate) {
      sealedUntil = new Date(capsuleDate)
      if (isNaN(sealedUntil.getTime()) || sealedUntil <= new Date()) {
        setIsCapsuleOpen(true)
        return
      }
    }

    try {
      setIsLoading(true)
      let attachments: any[] = []
      if (pendingFile) {
        attachments = [{ _file: pendingFile, name: pendingFile.name }]
      }
      if (typingTimeout) {
        clearTimeout(typingTimeout)
        setTypingTimeout(null)
      }
      onTyping?.(false)

      await onSendMessage(
        trimmedMessage,
        isGhostMode,
        ttl,
        attachments,
        sealedUntil,
        capsuleLabel.trim() || undefined
      )

      setMessage('')
      setPendingFile(null)
      setIsCapsuleMode(false)
      setCapsuleDate('')
      setCapsuleLabel('')
      if (editingMessage) onCancelEdit?.()
    } catch (err) {
      console.error('Error sending message:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // ── File ────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setPendingFile(file)
  }

  // ── Keyboard ────────────────────────────────────────────────
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setMessage(val)
    setRewriteError('')

    if (onTyping) {
      onTyping(true)
      if (typingTimeout) clearTimeout(typingTimeout)
      const timeout = setTimeout(() => {
        onTyping(false)
        setTypingTimeout(null)
      }, 2500)
      setTypingTimeout(timeout)
    }
  }

  // ── Tone Rewriter ───────────────────────────────────────────
  const handleRewriteTone = async (tone: ToneStyle) => {
    if (!message.trim() || isRewriting) return
    setIsRewriting(true)
    setRewriteError('')
    setIsToneOpen(false)
    try {
      const rewritten = await rewriteMessageTone(message.trim(), tone)
      setMessage(rewritten)
      textareaRef.current?.focus()
    } catch (err) {
      setRewriteError('AI rewrite failed — check your Gemini API key.')
    } finally {
      setIsRewriting(false)
    }
  }

  // ── Helpers ─────────────────────────────────────────────────
  const minDateTime = new Date()
  minDateTime.setMinutes(minDateTime.getMinutes() + 1)
  const minDateStr = minDateTime.toISOString().slice(0, 16)

  const capsuleDateFormatted = capsuleDate
    ? new Date(capsuleDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <form className="chat-input-area" onSubmit={handleSubmit}>

      {/* Edit Banner */}
      {editingMessage && (
        <div className="edit-banner">
          <span>Editing message</span>
          <button type="button" onClick={() => onCancelEdit?.()}>Cancel</button>
        </div>
      )}

      {/* Capsule active banner */}
      {isCapsuleMode && capsuleDateFormatted && !editingMessage && (
        <div className="capsule-banner">
          <span>🔒</span>
          <span>Sealed until <strong>{capsuleDateFormatted}</strong>{capsuleLabel ? ` · "${capsuleLabel}"` : ''}</span>
          <button type="button" onClick={() => { setIsCapsuleMode(false); setCapsuleDate(''); setCapsuleLabel('') }}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* Tone rewrite error */}
      {rewriteError && (
        <div className="tone-error">
          <span>⚠️ {rewriteError}</span>
          <button type="button" onClick={() => setRewriteError('')}><X size={12} /></button>
        </div>
      )}

      {/* File preview */}
      {pendingFile && (
        <div className="file-preview-strip">
          <div className="file-chip">
            <span className="file-name">{pendingFile.name}</span>
            <button type="button" onClick={() => setPendingFile(null)} className="remove-file">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className={`input-island ${isGhostMode ? 'ghost-mode' : ''} ${isCapsuleMode ? 'capsule-mode' : ''}`}>
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="image/*,.pdf,.doc,.docx"
          onChange={handleFileSelect}
        />

        {/* Attachment button */}
        <button
          type="button"
          className="attachment-button"
          onClick={() => fileInputRef.current?.click()}
          title="Attach File"
          disabled={disabled || isLoading}
        >
          <Paperclip size={18} />
        </button>

        {/* Ghost Mode button */}
        <button
          type="button"
          className={`ghost-toggle ${isGhostMode ? 'active' : ''}`}
          onClick={() => { setIsGhostMode(!isGhostMode); if (isCapsuleMode) setIsCapsuleMode(false) }}
          title={isGhostMode ? 'Disable Ghost Mode' : 'Enable Ghost Mode'}
          disabled={disabled || isLoading || !!editingMessage}
        >
          <Ghost size={18} />
        </button>

        {/* Ghost TTL selector */}
        {isGhostMode && !editingMessage && (
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

        {/* ── Time Capsule button ── */}
        {featureFlags.timeCapsule && !editingMessage && (
          <div className="capsule-wrapper" ref={capsuleRef}>
            <button
              type="button"
              className={`capsule-toggle ${isCapsuleMode ? 'active' : ''}`}
              onClick={() => { setIsCapsuleOpen(!isCapsuleOpen); if (isGhostMode) setIsGhostMode(false) }}
              title="Seal as Time Capsule"
              disabled={disabled || isLoading}
            >
              <Lock size={16} />
            </button>

            {isCapsuleOpen && (
              <div className="capsule-popover">
                <div className="capsule-popover-header">
                  <Lock size={13} />
                  <span>Seal as Time Capsule</span>
                </div>
                <p className="capsule-popover-desc">
                  This message will be hidden until the reveal date.
                </p>
                <label htmlFor="capsuleDateInput">Reveal on</label>
                <input
                  id="capsuleDateInput"
                  type="datetime-local"
                  value={capsuleDate}
                  min={minDateStr}
                  onChange={(e) => setCapsuleDate(e.target.value)}
                  className="capsule-date-input"
                />
                <label htmlFor="capsuleLabelInput">Label <span>(optional)</span></label>
                <input
                  id="capsuleLabelInput"
                  type="text"
                  value={capsuleLabel}
                  onChange={(e) => setCapsuleLabel(e.target.value)}
                  placeholder="e.g. Open on my birthday 🎂"
                  className="capsule-label-input"
                  maxLength={60}
                />
                <div className="capsule-popover-actions">
                  <button
                    type="button"
                    className="capsule-cancel-btn"
                    onClick={() => setIsCapsuleOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="capsule-confirm-btn"
                    disabled={!capsuleDate}
                    onClick={() => {
                      if (capsuleDate) {
                        setIsCapsuleMode(true)
                        setIsCapsuleOpen(false)
                      }
                    }}
                  >
                    Seal It 🔒
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Textarea ── */}
        <TextareaAutosize
          ref={textareaRef}
          className="chat-textarea"
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyPress}
          placeholder={
            editingMessage   ? 'Update your message...' :
            isGhostMode      ? 'Type a disappearing message...' :
            isCapsuleMode    ? 'Type your time capsule message...' :
                               'Type a message...'
          }
          disabled={disabled || isLoading || isRewriting}
          minRows={1}
          maxRows={8}
        />

        {/* ── Tone Rewriter button ── */}
        {featureFlags.aiPanel && !editingMessage && (
          <div className="tone-wrapper" ref={toneRef}>
            <button
              type="button"
              className={`tone-toggle ${isToneOpen ? 'active' : ''} ${isRewriting ? 'rewriting' : ''}`}
              onClick={() => setIsToneOpen(!isToneOpen)}
              title="Rewrite with AI"
              disabled={disabled || isLoading || isRewriting || !message.trim()}
            >
              {isRewriting ? <span className="input-spinner" /> : <Wand2 size={16} />}
            </button>

            {isToneOpen && (
              <div className="tone-popover">
                <div className="tone-popover-header">
                  <Wand2 size={12} />
                  <span>Rewrite Tone</span>
                </div>
                {TONE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className="tone-option"
                    onClick={() => handleRewriteTone(opt.id)}
                  >
                    <span>{opt.emoji}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Send button ── */}
        <button
          type="submit"
          className={`send-button ${isCapsuleMode ? 'capsule-send' : ''}`}
          disabled={disabled || isLoading || isRewriting || !message.trim()}
          title={editingMessage ? 'Save message' : isCapsuleMode ? 'Seal & Send' : 'Send message'}
        >
          {editingMessage ? 'Save' : isCapsuleMode ? <><Lock size={14} /> Seal</> : <Send size={18} />}
        </button>
      </div>
    </form>
  )
}
