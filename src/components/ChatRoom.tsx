import { useEffect, useState } from 'react'
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase'
import { User, Message } from '../types'
import { sendMessageToServer, setTypingStatus, updatePresence, setOffline } from '../api'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { MoodCore } from './MoodCore'
import { TypingIndicator } from './TypingIndicator'
import './ChatRoom.css'

const MESSAGES_LIMIT = 50

interface ChatRoomProps {
  user: User
  roomId: string
}

export const ChatRoom = ({ user, roomId }: ChatRoomProps) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [roomName, setRoomName] = useState(roomId)
  const [typingUsers, setTypingUsers] = useState<string[]>([])

  // Fetch room name
  useEffect(() => {
    const roomRef = collection(db, 'chatRooms')
    const unsubscribe = onSnapshot(
      roomRef,
      (snapshot) => {
        const room = snapshot.docs.find((doc) => doc.id === roomId)
        if (room) {
          setRoomName(room.data().name || roomId)
        }
      }
    )
    return () => unsubscribe()
  }, [roomId])

  // Real-time message listener
  useEffect(() => {
    const messagesCollection = collection(db, 'chatRooms', roomId, 'messages')
    const q = query(messagesCollection, orderBy('createdAt', 'asc'), limit(MESSAGES_LIMIT))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const messagesData: Message[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()

          messagesData.push({
            id: doc.id,
            text: data.text,
            uid: data.uid,
            displayName: data.displayName,
            photoURL: data.photoURL,
            createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
            // Mood fields
            mood: data.mood,
            moodEmoji: data.moodEmoji,
            moodColor: data.moodColor,
            moodConfidence: data.moodConfidence,
            // Ephemeral fields
            isEphemeral: data.isEphemeral || false,
            ttl: data.ttl,
            dissolved: data.dissolved || false,
          })
        })
        setMessages(messagesData)
        setLoading(false)
      },
      (error) => {
        console.error('Error fetching messages:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [roomId])

  // Real-time typing listener
  useEffect(() => {
    const typingCollection = collection(db, 'chatRooms', roomId, 'typing')

    const unsubscribe = onSnapshot(typingCollection, (snapshot) => {
      const users: string[] = []
      snapshot.forEach(doc => {
        const data = doc.data()
        // Don't show ourselves in the typing list
        if (doc.id !== user.uid) {
          users.push(data.displayName || 'Anonymous')
        }
      })
      setTypingUsers(users)
    })

    return () => unsubscribe()
  }, [roomId, user.uid])

  // Manage Online Presence
  useEffect(() => {
    const handleJoin = async () => {
      try {
        await updatePresence(roomId)
      } catch (err) {
        console.error('Presence error:', err)
      }
    }

    handleJoin()

    return () => {
      setOffline(roomId).catch(err => console.error('Offline error:', err))
    }
  }, [roomId])

  const handleSendMessage = async (text: string, isGhostMode: boolean = false, ttl: number = 30) => {
    try {
      // Send via backend (runs Gemini mood analysis + ephemeral scheduling)
      await sendMessageToServer(roomId, text, isGhostMode, ttl)
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }

  const handleTyping = async (isTyping: boolean) => {
    try {
      await setTypingStatus(roomId, isTyping)
    } catch (error) {
      console.error('Error updating typing status:', error)
    }
  }

  return (
    <div className="chat-room">
      <header className="chat-header">
        <div className="header-content">
          <h1>
            <span className="room-hash">#</span>
            {roomName}
          </h1>
          <p className="subtitle">Real-time messaging powered by Firebase + AI</p>
        </div>
        <div className="user-section">
          <div className="user-info">
            {user.photoURL && <img src={user.photoURL} alt={user.displayName || 'User'} />}
            <div className="user-details">
              <p className="user-name">{user.displayName}</p>
              <p className="user-id">{user.email}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="chat-main-container">
        <div className="chat-messages-section">
          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Loading messages...</p>
            </div>
          ) : (
            <>
              <MessageList messages={messages} currentUserId={user.uid} />
              <div className="chat-input-area">
                <TypingIndicator typingUsers={typingUsers} />
                <MessageInput onSendMessage={handleSendMessage} onTyping={handleTyping} />
              </div>
            </>
          )}
        </div>

        <MoodCore messages={messages} />
      </div>
    </div>
  )
}
