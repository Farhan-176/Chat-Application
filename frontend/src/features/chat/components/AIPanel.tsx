/**
 * AI Intelligence Panel
 * Floating panel with three AI-powered actions:
 *  1. Catch Me Up    — summarizes the last N messages
 *  2. Mood Read      — detects the emotional temperature of the room
 *  3. Key Points     — extracts decisions, action items, links & open questions
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Brain, Zap, FileText, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { catchMeUp, readRoomMood, extractKeyPoints, CatchMeUpResult, MoodReadResult, KeyPointsResult } from '../../../core/shared/api/geminiService'
import { Message } from '../../../core/shared/types'
import './AIPanel.css'

interface AIPanelProps {
  isOpen: boolean
  onClose: () => void
  messages: Message[]
  roomName: string
}

type Tab = 'catchup' | 'mood' | 'keypoints'

type LoadState = 'idle' | 'loading' | 'done' | 'error'

export const AIPanel = ({ isOpen, onClose, messages, roomName }: AIPanelProps) => {
  const [activeTab, setActiveTab] = useState<Tab>('catchup')

  const [catchUpState, setCatchUpState] = useState<LoadState>('idle')
  const [catchUpResult, setCatchUpResult] = useState<CatchMeUpResult | null>(null)
  const [catchUpError, setCatchUpError] = useState('')

  const [moodState, setMoodState] = useState<LoadState>('idle')
  const [moodResult, setMoodResult] = useState<MoodReadResult | null>(null)
  const [moodError, setMoodError] = useState('')

  const [keyState, setKeyState] = useState<LoadState>('idle')
  const [keyResult, setKeyResult] = useState<KeyPointsResult | null>(null)
  const [keyError, setKeyError] = useState('')

  const simpleMessages = messages.map((m) => ({
    displayName: m.displayName,
    text: m.text,
    createdAt: m.createdAt,
  }))

  const handleCatchUp = async () => {
    if (catchUpState === 'loading') return
    setCatchUpState('loading')
    setCatchUpError('')
    try {
      const result = await catchMeUp(simpleMessages)
      setCatchUpResult(result)
      setCatchUpState('done')
    } catch (err) {
      setCatchUpError(err instanceof Error ? err.message : 'AI request failed.')
      setCatchUpState('error')
    }
  }

  const handleMoodRead = async () => {
    if (moodState === 'loading') return
    setMoodState('loading')
    setMoodError('')
    try {
      const result = await readRoomMood(simpleMessages)
      setMoodResult(result)
      setMoodState('done')
    } catch (err) {
      setMoodError(err instanceof Error ? err.message : 'AI request failed.')
      setMoodState('error')
    }
  }

  const handleKeyPoints = async () => {
    if (keyState === 'loading') return
    setKeyState('loading')
    setKeyError('')
    try {
      const result = await extractKeyPoints(simpleMessages)
      setKeyResult(result)
      setKeyState('done')
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : 'AI request failed.')
      setKeyState('error')
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; action: () => void }[] = [
    { id: 'catchup',   label: 'Catch Me Up',  icon: <Brain size={14} />,    action: handleCatchUp },
    { id: 'mood',      label: 'Mood Read',     icon: <Sparkles size={14} />, action: handleMoodRead },
    { id: 'keypoints', label: 'Key Points',    icon: <FileText size={14} />, action: handleKeyPoints },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="ai-panel"
          initial={{ opacity: 0, x: 40, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 40, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          {/* Header */}
          <div className="ai-panel-header">
            <div className="ai-panel-title">
              <Zap size={16} className="ai-panel-zap" />
              <span>AI Intelligence</span>
            </div>
            <div className="ai-panel-room-tag">#{roomName}</div>
            <button className="ai-panel-close" onClick={onClose} aria-label="Close AI panel">
              <X size={15} />
            </button>
          </div>

          {/* Tabs */}
          <div className="ai-panel-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`ai-panel-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="ai-panel-body">
            {/* ── Catch Me Up ── */}
            {activeTab === 'catchup' && (
              <div className="ai-tab-content">
                <p className="ai-tab-description">
                  Summarizes the last {Math.min(messages.length, 60)} messages so you never miss context.
                </p>
                <button
                  className="ai-action-btn"
                  onClick={handleCatchUp}
                  disabled={catchUpState === 'loading' || messages.length === 0}
                >
                  {catchUpState === 'loading' ? (
                    <><span className="ai-spinner" /> Analyzing conversation...</>
                  ) : (
                    <><Brain size={14} /> {catchUpState === 'done' ? 'Refresh Summary' : 'Catch Me Up'}</>
                  )}
                </button>

                {messages.length === 0 && (
                  <p className="ai-empty">No messages to analyze yet.</p>
                )}

                {catchUpState === 'error' && (
                  <div className="ai-error">
                    <AlertTriangle size={14} />
                    {catchUpError}
                  </div>
                )}

                {catchUpState === 'done' && catchUpResult && (
                  <motion.div
                    className="ai-result"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="ai-result-section">
                      <label>Summary</label>
                      <p>{catchUpResult.summary}</p>
                    </div>
                    {catchUpResult.keyFacts.length > 0 && (
                      <div className="ai-result-section">
                        <label>Key Facts</label>
                        <ul>
                          {catchUpResult.keyFacts.map((fact, i) => (
                            <li key={i}>{fact}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="ai-result-atmosphere">
                      <span>Vibe:</span> {catchUpResult.atmosphere}
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* ── Mood Read ── */}
            {activeTab === 'mood' && (
              <div className="ai-tab-content">
                <p className="ai-tab-description">
                  Reads the emotional temperature of this room right now.
                </p>
                <button
                  className="ai-action-btn"
                  onClick={handleMoodRead}
                  disabled={moodState === 'loading' || messages.length === 0}
                >
                  {moodState === 'loading' ? (
                    <><span className="ai-spinner" /> Reading the room...</>
                  ) : (
                    <><Sparkles size={14} /> {moodState === 'done' ? 'Re-read Mood' : 'Read the Room'}</>
                  )}
                </button>

                {messages.length === 0 && (
                  <p className="ai-empty">No messages to read yet.</p>
                )}

                {moodState === 'error' && (
                  <div className="ai-error">
                    <AlertTriangle size={14} />
                    {moodError}
                  </div>
                )}

                {moodState === 'done' && moodResult && (
                  <motion.div
                    className="ai-mood-result"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <div
                      className="ai-mood-card"
                      style={{ '--mood-color': moodResult.color } as React.CSSProperties}
                    >
                      <span className="ai-mood-emoji">{moodResult.emoji}</span>
                      <span className="ai-mood-label">{moodResult.mood}</span>
                    </div>
                    <p className="ai-mood-description">{moodResult.description}</p>
                    {moodResult.warning && (
                      <div className="ai-mood-warning">
                        <AlertTriangle size={13} />
                        {moodResult.warning}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            )}

            {/* ── Key Points ── */}
            {activeTab === 'keypoints' && (
              <div className="ai-tab-content">
                <p className="ai-tab-description">
                  Extracts decisions, tasks, links, and open questions from this conversation.
                </p>
                <button
                  className="ai-action-btn"
                  onClick={handleKeyPoints}
                  disabled={keyState === 'loading' || messages.length === 0}
                >
                  {keyState === 'loading' ? (
                    <><span className="ai-spinner" /> Extracting points...</>
                  ) : (
                    <><FileText size={14} /> {keyState === 'done' ? 'Re-extract' : 'Extract Key Points'}</>
                  )}
                </button>

                {messages.length === 0 && (
                  <p className="ai-empty">No messages to extract from yet.</p>
                )}

                {keyState === 'error' && (
                  <div className="ai-error">
                    <AlertTriangle size={14} />
                    {keyError}
                  </div>
                )}

                {keyState === 'done' && keyResult && (
                  <motion.div
                    className="ai-result"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <KeySection title="✅ Decisions" items={keyResult.decisions} emptyText="No decisions recorded." />
                    <KeySection title="📋 Action Items" items={keyResult.actionItems} emptyText="No action items found." />
                    <KeySection title="🔗 Links" items={keyResult.links} emptyText="No links shared." />
                    <KeySection title="❓ Open Questions" items={keyResult.questions} emptyText="No open questions." />
                  </motion.div>
                )}
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="ai-panel-footer">
            <Sparkles size={11} />
            Powered by Gemini 1.5 Flash · Context window: last 60 msgs
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Helper sub-component for key points sections
function KeySection({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  const [expanded, setExpanded] = useState(true)
  const hasItems = items.length > 0

  return (
    <div className="key-section">
      <button className="key-section-header" onClick={() => setExpanded(!expanded)}>
        <span>{title}</span>
        <span className="key-section-count">{items.length}</span>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {expanded && (
        hasItems ? (
          <ul>
            {items.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        ) : (
          <p className="key-section-empty">{emptyText}</p>
        )
      )}
    </div>
  )
}
