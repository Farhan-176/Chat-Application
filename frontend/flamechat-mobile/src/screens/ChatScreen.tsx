import React, { useEffect, useMemo, useRef, useState } from 'react'
import { addDoc, collection, doc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View, FlatList } from 'react-native'
import { useRoute, type RouteProp } from '@react-navigation/native'
import { useAuthContext } from '../context/AuthContext'
import { auth, db } from '../firebase/config'
import { useMessages } from '../hooks/useMessages'
import { useTypingIndicator } from '../hooks/useTypingIndicator'
import type { RootStackParamList } from '../navigation/AppNavigator'

type ChatRoute = RouteProp<RootStackParamList, 'Chat'>

export function ChatScreen() {
  const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001/api'
  const route = useRoute<ChatRoute>()
  const { user } = useAuthContext()
  const { roomId, roomName } = route.params
  const { messages, hasMore, loadMore } = useMessages(roomId)
  const { typingUsers, setTyping } = useTypingIndicator(roomId, user)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [digestOpen, setDigestOpen] = useState(false)
  const [digestLoading, setDigestLoading] = useState(false)
  const [digestError, setDigestError] = useState('')
  const [markingRead, setMarkingRead] = useState(false)
  const [roomTranslationMode, setRoomTranslationMode] = useState<'off' | 'manual' | 'auto'>('manual')
  const [roomDefaultLanguage, setRoomDefaultLanguage] = useState('en')
  const [translationEnabled, setTranslationEnabled] = useState(false)
  const [translationLoading, setTranslationLoading] = useState(false)
  const [translationError, setTranslationError] = useState('')
  const [translatedByMessageId, setTranslatedByMessageId] = useState<Record<string, {
    text: string
    sourceLanguage: string
    targetLanguage: string
  }>>({})
  const [digest, setDigest] = useState<{
    summary: string
    unreadCount: number
    mentionCount: number
    highlights: string[]
    actionItems: string[]
    sinceAt: string | null
    sinceSource: 'query' | 'read-state' | 'none'
  } | null>(null)
  const readSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const translationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const canSend = useMemo(() => text.trim().length > 0 && !!user && !sending, [text, user, sending])

  const handleTextChange = (newText: string) => {
    setText(newText)
    
    // Update typing status
    if (newText.trim().length > 0) {
      setTyping(true)
    }
    
    // Reset typing timer
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current)
    }
    
    // Clear typing status after inactivity
    if (newText.trim().length > 0) {
      typingTimerRef.current = setTimeout(() => {
        setTyping(false)
      }, 3000)
    }
  }

  const apiFetch = async (path: string, options: RequestInit = {}) => {
    const authUser = auth.currentUser
    if (!authUser) {
      throw new Error('Not authenticated')
    }

    const token = await authUser.getIdToken()
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: `Request failed: ${response.status}` }))
      throw new Error(payload.error || 'Request failed')
    }

    return response.json()
  }

  const syncReadState = async () => {
    if (markingRead) {
      return
    }

    setMarkingRead(true)
    try {
      await apiFetch(`/rooms/${encodeURIComponent(roomId)}/read-state`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
    } catch (error) {
      console.error('Failed to sync mobile read-state:', error)
    } finally {
      setMarkingRead(false)
    }
  }

  useEffect(() => {
    const roomRef = doc(db, 'chatRooms', roomId)
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      const data = snapshot.data() || {}
      setRoomTranslationMode(
        data.translationMode === 'off' || data.translationMode === 'auto'
          ? data.translationMode
          : 'manual'
      )
      setRoomDefaultLanguage(
        typeof data.defaultLanguage === 'string' && data.defaultLanguage.trim().length > 0
          ? data.defaultLanguage.trim().toLowerCase()
          : 'en'
      )
    })

    return () => unsubscribe()
  }, [roomId])

  useEffect(() => {
    if (roomTranslationMode === 'off') {
      setTranslationEnabled(false)
      return
    }

    if (roomTranslationMode === 'auto') {
      setTranslationEnabled(true)
      return
    }

    setTranslationEnabled(false)
  }, [roomId, roomTranslationMode])

  useEffect(() => {
    setTranslatedByMessageId({})
    setTranslationError('')
  }, [roomId, roomDefaultLanguage])

  const translationMessageKey = useMemo(() => {
    const latest = messages[messages.length - 1]
    return latest ? `${latest.id}-${String((latest as any).createdAt || '')}` : 'empty'
  }, [messages])

  useEffect(() => {
    const shouldTranslate = roomTranslationMode !== 'off' && translationEnabled
    if (!shouldTranslate || messages.length === 0) {
      return
    }

    if (translationTimerRef.current) {
      clearTimeout(translationTimerRef.current)
    }

    translationTimerRef.current = setTimeout(() => {
      const targetLanguage = (roomDefaultLanguage || 'en').toLowerCase()
      const messageIds = messages
        .filter((message) => String(message.text || '').trim().length > 0 && !translatedByMessageId[message.id])
        .slice(-80)
        .map((message) => message.id)

      if (messageIds.length === 0) {
        return
      }

      setTranslationLoading(true)
      setTranslationError('')

      apiFetch(`/messages/${encodeURIComponent(roomId)}/translations`, {
        method: 'POST',
        body: JSON.stringify({
          messageIds,
          targetLanguage,
        }),
      })
        .then((response) => {
          const nextEntries: Record<string, {
            text: string
            sourceLanguage: string
            targetLanguage: string
          }> = {}

          Object.entries(response.translations || {}).forEach(([messageId, item]: [string, any]) => {
            nextEntries[messageId] = {
              text: String(item?.text || ''),
              sourceLanguage: String(item?.sourceLanguage || 'auto'),
              targetLanguage: String(item?.targetLanguage || targetLanguage),
            }
          })

          setTranslatedByMessageId((prev) => ({
            ...prev,
            ...nextEntries,
          }))
        })
        .catch((error) => {
          console.error('Mobile translation fetch failed:', error)
          setTranslationError('Translation unavailable right now.')
        })
        .finally(() => {
          setTranslationLoading(false)
        })
    }, 450)

    return () => {
      if (translationTimerRef.current) {
        clearTimeout(translationTimerRef.current)
      }
    }
  }, [roomId, roomDefaultLanguage, roomTranslationMode, translationEnabled, translationMessageKey, translatedByMessageId, messages])

  const displayMessages = useMemo(() => {
    if (!translationEnabled || roomTranslationMode === 'off') {
      return messages
    }

    return messages.map((message) => {
      const translated = translatedByMessageId[message.id]
      if (!translated || !translated.text || translated.text === message.text) {
        return message
      }

      return {
        ...message,
        translatedText: translated.text,
      }
    })
  }, [messages, translationEnabled, roomTranslationMode, translatedByMessageId])

  useEffect(() => {
    if (readSyncTimerRef.current) {
      clearTimeout(readSyncTimerRef.current)
    }

    readSyncTimerRef.current = setTimeout(() => {
      syncReadState().catch((error) => {
        console.error('Initial mobile read sync failed:', error)
      })
    }, 400)

    return () => {
      if (readSyncTimerRef.current) {
        clearTimeout(readSyncTimerRef.current)
      }
    }
  }, [roomId])

  useEffect(() => {
    if (!messages.length) {
      return
    }

    if (readSyncTimerRef.current) {
      clearTimeout(readSyncTimerRef.current)
    }

    readSyncTimerRef.current = setTimeout(() => {
      syncReadState().catch((error) => {
        console.error('Message-triggered mobile read sync failed:', error)
      })
    }, 750)
  }, [messages.length, messages[messages.length - 1]?.id])

  const handleLoadDigest = async () => {
    try {
      setDigestLoading(true)
      setDigestError('')

      const readState = await apiFetch(`/rooms/${encodeURIComponent(roomId)}/read-state`)
      const params = new URLSearchParams()
      params.set('limit', '120')
      if (readState?.lastReadAt) {
        params.set('since', readState.lastReadAt)
      }

      const response = await apiFetch(`/rooms/${encodeURIComponent(roomId)}/digest?${params.toString()}`)
      setDigest(response.digest)
      setDigestOpen(true)
    } catch (error) {
      console.error('Failed to load mobile digest:', error)
      setDigestError('Unable to generate catch-up digest right now.')
      setDigest(null)
      setDigestOpen(true)
    } finally {
      setDigestLoading(false)
    }
  }

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed || !user) {
      return
    }

    setSending(true)
    try {
      await addDoc(collection(db, 'chatRooms', roomId, 'messages'), {
        text: trimmed,
        uid: user.uid,
        displayName: user.displayName || user.email || 'Anonymous',
        photoURL: user.photoURL || null,
        createdAt: serverTimestamp(),
        edited: false,
        type: 'text',
      })
      setText('')
      
      // Clear typing indicator
      await setTyping(false)
    } finally {
      setSending(false)
    }
  }

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) {
      return
    }
    setLoadingMore(true)
    try {
      await loadMore()
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <Text style={styles.header}>#{roomName}</Text>

      <View style={styles.topActions}>
        <Pressable style={styles.catchupButton} onPress={handleLoadDigest} disabled={digestLoading}>
          <Text style={styles.catchupText}>{digestLoading ? 'Catching up...' : 'Catch up'}</Text>
        </Pressable>

        <Pressable
          style={[styles.catchupButton, roomTranslationMode === 'off' && styles.disabled]}
          onPress={() => setTranslationEnabled((prev) => !prev)}
          disabled={roomTranslationMode === 'off'}
        >
          <Text style={styles.catchupText}>{translationEnabled ? 'Translate: On' : 'Translate: Off'}</Text>
        </Pressable>
      </View>

      {translationLoading ? <Text style={styles.translationInfo}>Translating messages...</Text> : null}
      {!!translationError ? <Text style={styles.translationError}>{translationError}</Text> : null}

      {digestOpen && (
        <View style={styles.digestCard}>
          <Text style={styles.digestTitle}>Catch-up digest</Text>
          {!!digestError && <Text style={styles.digestError}>{digestError}</Text>}
          {digest && (
            <>
              <Text style={styles.digestSummary}>{digest.summary}</Text>
              <Text style={styles.digestMeta}>{digest.unreadCount} unread • {digest.mentionCount} mentions</Text>
              {!!digest.sinceAt && (
                <Text style={styles.digestSince}>Since {new Date(digest.sinceAt).toLocaleString()} ({digest.sinceSource})</Text>
              )}
              {digest.actionItems.length > 0 && (
                <View style={styles.digestListBox}>
                  <Text style={styles.digestListTitle}>Action items</Text>
                  {digest.actionItems.map((item, idx) => (
                    <Text key={`${item}-${idx}`} style={styles.digestListItem}>• {item}</Text>
                  ))}
                </View>
              )}
              {digest.highlights.length > 0 && (
                <View style={styles.digestListBox}>
                  <Text style={styles.digestListTitle}>Highlights</Text>
                  {digest.highlights.map((item, idx) => (
                    <Text key={`${item}-${idx}`} style={styles.digestListItem}>• {item}</Text>
                  ))}
                </View>
              )}
            </>
          )}

          <View style={styles.digestActions}>
            <Pressable
              style={[styles.digestActionBtn, styles.digestPrimaryBtn]}
              onPress={() => {
                syncReadState().catch((error) => {
                  console.error('Manual mobile read sync failed:', error)
                })
                setDigestOpen(false)
              }}
            >
              <Text style={styles.digestPrimaryBtnText}>Mark As Read</Text>
            </Pressable>
            <Pressable style={styles.digestActionBtn} onPress={() => setDigestOpen(false)}>
              <Text style={styles.digestActionText}>Close</Text>
            </Pressable>
          </View>
        </View>
      )}

      <FlatList
        data={displayMessages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messages}
        ListHeaderComponent={
          hasMore && displayMessages.length > 0 ? (
            <Pressable style={styles.loadMoreButton} onPress={handleLoadMore} disabled={loadingMore}>
              <Text style={styles.loadMoreText}>{loadingMore ? 'Loading...' : 'Load earlier messages'}</Text>
            </Pressable>
          ) : null
        }
        renderItem={({ item }) => {
          const mine = item.uid === user?.uid
          return (
            <View style={[styles.bubble, mine ? styles.mine : styles.other]}>
              <Text style={styles.sender}>{item.displayName}</Text>
              <Text style={styles.body}>{(item as any).translatedText || item.text}</Text>
              {(item as any).translatedText && (item as any).translatedText !== item.text ? (
                <Text style={styles.bodyOriginal}>Original: {item.text}</Text>
              ) : null}
            </View>
          )
        }}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Write a message"
          value={text}
          onChangeText={handleTextChange}
          editable={!sending}
        />
        <Pressable style={[styles.sendButton, !canSend && styles.disabled]} onPress={handleSend} disabled={!canSend}>
          <Text style={styles.sendText}>{sending ? '...' : 'Send'}</Text>
        </Pressable>
      </View>

      {typingUsers.length > 0 && (
        <View style={styles.typingIndicatorContainer}>
          <Text style={styles.typingText}>
            {typingUsers.map(u => u.displayName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  header: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 8,
  },
  catchupButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  catchupText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  translationInfo: {
    marginBottom: 6,
    color: '#1e40af',
    fontSize: 12,
    fontWeight: '600',
  },
  translationError: {
    marginBottom: 6,
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '600',
  },
  digestCard: {
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  digestTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  digestError: {
    marginTop: 6,
    color: '#b91c1c',
    fontSize: 12,
  },
  digestSummary: {
    marginTop: 8,
    color: '#0f172a',
    fontSize: 13,
    lineHeight: 18,
  },
  digestMeta: {
    marginTop: 6,
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '700',
  },
  digestSince: {
    marginTop: 6,
    color: '#64748b',
    fontSize: 11,
  },
  digestListBox: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbeafe',
    backgroundColor: '#ffffff',
    padding: 8,
    gap: 4,
  },
  digestListTitle: {
    color: '#1e3a8a',
    fontWeight: '700',
    fontSize: 12,
  },
  digestListItem: {
    color: '#1e293b',
    fontSize: 12,
  },
  digestActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  digestActionBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#93c5fd',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
  },
  digestPrimaryBtn: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  digestActionText: {
    color: '#1e40af',
    fontSize: 12,
    fontWeight: '700',
  },
  digestPrimaryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  messages: {
    paddingBottom: 12,
    gap: 8,
  },
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 8,
  },
  loadMoreText: {
    color: '#0369a1',
    fontSize: 12,
    fontWeight: '600',
  },
  bubble: {
    borderRadius: 12,
    padding: 10,
    maxWidth: '85%',
  },
  mine: {
    backgroundColor: '#0ea5e9',
    alignSelf: 'flex-end',
  },
  other: {
    backgroundColor: '#e2e8f0',
    alignSelf: 'flex-start',
  },
  sender: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  body: {
    color: '#0f172a',
  },
  bodyOriginal: {
    marginTop: 4,
    color: '#64748b',
    fontSize: 11,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sendButton: {
    backgroundColor: '#0ea5e9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sendText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  typingIndicatorContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f1f5f9',
  },
  typingText: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
  },
  disabled: {
    opacity: 0.5,
  },
})