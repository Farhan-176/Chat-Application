import { useEffect, useState } from 'react'
import {
  collection,
  DocumentData,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot,
  QueryDocumentSnapshot,
  startAfter,
  doc as firestoreDoc,
} from 'firebase/firestore'
import { db } from '../../../core/shared/config'
import { Message, User } from '../../../core/shared/types'
import { updatePresence, setOffline, fetchVaultMessages, saveMessageToVault, removeMessageFromVault } from '../../../core/shared/api'
import { VaultMessage } from '../utils/vaultUtils'

/**
 * Custom hook to handle chat room logic.
 * Encapsulates messages, room metadata, presence, and typing.
 */
export const useChatRoom = (roomId: string, user: User) => {
  const PAGE_SIZE = 50

  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [roomName, setRoomName] = useState(roomId)
  const [roomVisibility, setRoomVisibility] = useState<'public' | 'private'>('public')
  const [roomTranslationMode, setRoomTranslationMode] = useState<'off' | 'manual' | 'auto'>('manual')
  const [roomDefaultLanguage, setRoomDefaultLanguage] = useState('en')
  const [roomMemberCount, setRoomMemberCount] = useState(0)
  const [isRoomCreator, setIsRoomCreator] = useState(false)
  const [canModerateRoom, setCanModerateRoom] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [onlineCount, setOnlineCount] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [oldestCursor, setOldestCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [vaultMessages, setVaultMessages] = useState<VaultMessage[]>([])
  const [loadingVault, setLoadingVault] = useState(false)

  // 1. Fetch room name and basic metadata
  useEffect(() => {
    const roomRef = firestoreDoc(db, 'chatRooms', roomId)
    const unsubscribe = onSnapshot(
      roomRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data()
          setRoomName(data.name || roomId)
          setRoomVisibility(data.visibility === 'private' ? 'private' : 'public')
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
          setRoomMemberCount(typeof data.memberCount === 'number' ? data.memberCount : 0)
          setIsRoomCreator(data.createdBy === user.uid)

          const resolveModerationPermission = async () => {
            if (data.createdBy === user.uid) {
              setCanModerateRoom(true)
              return
            }

            const memberRef = firestoreDoc(db, 'chatRooms', roomId, 'members', user.uid)
            const memberSnap = await getDoc(memberRef)
            const role = String(memberSnap.data()?.role || '')
            setCanModerateRoom(role === 'owner' || role === 'admin' || role === 'moderator')
          }

          resolveModerationPermission().catch((err) => {
            console.error('Failed to resolve moderation permission:', err)
            setCanModerateRoom(false)
          })

          const enforcePrivateAccess = async () => {
            if (data.visibility !== 'private' || data.createdBy === user.uid) {
              setError(null)
              return
            }

            const memberRef = firestoreDoc(db, 'chatRooms', roomId, 'members', user.uid)
            const memberSnap = await getDoc(memberRef)
            if (!memberSnap.exists()) {
              setError('This private room is invite-only.')
            } else {
              setError(null)
            }
          }

          enforcePrivateAccess().catch((err) => {
            console.error('Private room access check failed:', err)
            setError('Room metadata unavailable')
          })
        }
      },
      (err) => {
        console.error('Failed to fetch room name:', err)
        setError('Room metadata unavailable')
      }
    )
    return () => unsubscribe()
  }, [roomId, user.uid])

  // 2. Real-time message listener
  useEffect(() => {
    setLoading(true)
    setLoadingOlder(false)
    setHasMoreMessages(true)
    setOldestCursor(null)

    const messagesCollection = collection(db, 'chatRooms', roomId, 'messages')
    const q = query(messagesCollection, orderBy('createdAt', 'desc'), limit(PAGE_SIZE))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs
        const messagesData: Message[] = []

        docs
          .slice()
          .reverse()
          .forEach((doc) => {
          const data = doc.data()
          messagesData.push({
            id: doc.id,
            text: data.text,
            uid: data.uid,
            displayName: data.displayName,
            photoURL: data.photoURL,
            createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
            edited: !!data.edited,
            editedAt: data.editedAt ? data.editedAt.toDate() : null,
            mood: data.mood,
            moodEmoji: data.moodEmoji,
            moodColor: data.moodColor,
            moodConfidence: data.moodConfidence,
            isEphemeral: data.isEphemeral || false,
            ttl: data.ttl,
            attachments: data.attachments || [],
            reactions: data.reactions || {},
            sealedUntil: data.sealedUntil ? data.sealedUntil.toDate() : null,
            capsuleLabel: data.capsuleLabel || '',
            smartActions: data.smartActions || [],
          })
        })

        setMessages(messagesData)
        setHasMoreMessages(docs.length === PAGE_SIZE)
        setOldestCursor(docs.length > 0 ? docs[docs.length - 1] : null)
        setLoading(false)
      },
      (err) => {
        console.error('Error fetching messages:', err)
        setError('Messages could not be synced')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [roomId])

  const loadOlderMessages = async () => {
    if (!oldestCursor || loadingOlder || !hasMoreMessages) {
      return
    }

    setLoadingOlder(true)
    try {
      const messagesCollection = collection(db, 'chatRooms', roomId, 'messages')
      const olderQuery = query(
        messagesCollection,
        orderBy('createdAt', 'desc'),
        startAfter(oldestCursor),
        limit(PAGE_SIZE)
      )

      const olderSnapshot = await getDocs(olderQuery)
      const docs = olderSnapshot.docs

      const olderMessages: Message[] = docs
        .slice()
        .reverse()
        .map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            text: data.text,
            uid: data.uid,
            displayName: data.displayName,
            photoURL: data.photoURL,
            createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
            edited: !!data.edited,
            editedAt: data.editedAt ? data.editedAt.toDate() : null,
            mood: data.mood,
            moodEmoji: data.moodEmoji,
            moodColor: data.moodColor,
            moodConfidence: data.moodConfidence,
            isEphemeral: data.isEphemeral || false,
            ttl: data.ttl,
            attachments: data.attachments || [],
            reactions: data.reactions || {},
            sealedUntil: data.sealedUntil ? data.sealedUntil.toDate() : null,
            capsuleLabel: data.capsuleLabel || '',
            smartActions: data.smartActions || [],
          }
        })

      setMessages((prev) => {
        const deduped = new Map<string, Message>()
        ;[...olderMessages, ...prev].forEach((message) => {
          deduped.set(message.id, message)
        })
        return Array.from(deduped.values()).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      })

      setHasMoreMessages(docs.length === PAGE_SIZE)
      if (docs.length > 0) {
        setOldestCursor(docs[docs.length - 1])
      }
    } catch (err) {
      console.error('Error loading older messages:', err)
      setError('Older messages could not be loaded')
    } finally {
      setLoadingOlder(false)
    }
  }

  // 3. Real-time typing listener
  useEffect(() => {
    const typingCollection = collection(db, 'chatRooms', roomId, 'typing')
    const unsubscribe = onSnapshot(typingCollection, (snapshot) => {
      const users: string[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        if (doc.id !== user.uid) {
          users.push(data.displayName || 'Anonymous')
        }
      })
      setTypingUsers(users)
    })
    return () => unsubscribe()
  }, [roomId, user.uid])

  // 3b. Real-time presence count for online users
  useEffect(() => {
    const presenceCollection = collection(db, 'chatRooms', roomId, 'presence')
    const unsubscribe = onSnapshot(
      presenceCollection,
      (snapshot) => {
        setOnlineCount(Math.max(1, snapshot.size))
      },
      () => {
        setOnlineCount(1)
      }
    )

    return () => unsubscribe()
  }, [roomId])

  // 4. Presence management
  useEffect(() => {
    updatePresence(roomId).catch((err: any) => console.error('Presence error:', err))
    return () => {
      setOffline(roomId).catch((err: any) => console.error('Offline error:', err))
    }
  }, [roomId])

  // 5. Vault management
  const loadVault = async () => {
    try {
      setLoadingVault(true)
      const response = await fetchVaultMessages()
      setVaultMessages(response.messages || [])
    } catch (err) {
      console.error('Failed to load vault:', err)
    } finally {
      setLoadingVault(false)
    }
  }

  useEffect(() => {
    loadVault()
  }, [])

  const handleSaveToVault = async (message: Message, tags: string[] = [], aiTags: string[] = []) => {
    try {
      await saveMessageToVault({
        messageId: message.id,
        roomId,
        text: message.text,
        senderName: message.displayName || 'Unknown',
        senderId: message.uid,
        timestamp: message.createdAt,
        tags,
        aiTags,
      })
      await loadVault()
    } catch (err) {
      console.error('Failed to save message to vault:', err)
      throw err
    }
  }

  const handleRemoveFromVault = async (messageId: string) => {
    try {
      await removeMessageFromVault(messageId)
      await loadVault()
    } catch (err) {
      console.error('Failed to remove message from vault:', err)
      throw err
    }
  }

  return {
    messages,
    setMessages,
    loading,
    loadingOlder,
    hasMoreMessages,
    roomName,
    roomVisibility,
    roomTranslationMode,
    roomDefaultLanguage,
    roomMemberCount,
    isRoomCreator,
    canModerateRoom,
    typingUsers,
    onlineCount,
    error,
    vaultMessages,
    loadingVault,
    loadOlderMessages,
    saveToVault: handleSaveToVault,
    removeFromVault: handleRemoveFromVault,
    refreshVault: loadVault,
  }
}

