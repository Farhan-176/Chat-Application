import { useEffect, useState } from 'react'
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { User, Message } from '../types'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import './ChatRoom.css'

const ROOM_ID = 'general' // Single room for v1.0
const MESSAGES_LIMIT = 50

interface ChatRoomProps {
  user: User
  onLogout: () => void
}

export const ChatRoom = ({ user, onLogout }: ChatRoomProps) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const messagesCollection = collection(db, 'chatRooms', ROOM_ID, 'messages')
    const q = query(messagesCollection, orderBy('createdAt', 'asc'), limit(MESSAGES_LIMIT))

    // Set up real-time listener
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
  }, [])

  const handleSendMessage = async (text: string) => {
    const messagesCollection = collection(db, 'chatRooms', ROOM_ID, 'messages')

    try {
      await addDoc(messagesCollection, {
        text,
        uid: user.uid,
        displayName: user.displayName || 'Anonymous',
        photoURL: user.photoURL || null,
        createdAt: serverTimestamp(),
      })
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }

  return (
    <div className="chat-room">
      <header className="chat-header">
        <div className="header-content">
          <h1>General Chat</h1>
          <p className="subtitle">Real-time messaging powered by Firebase</p>
        </div>
        <div className="user-section">
          <div className="user-info">
            {user.photoURL && <img src={user.photoURL} alt={user.displayName || 'User'} />}
            <div className="user-details">
              <p className="user-name">{user.displayName}</p>
              <p className="user-id">{user.email}</p>
            </div>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading messages...</p>
        </div>
      ) : (
        <>
          <MessageList messages={messages} currentUserId={user.uid} />
          <MessageInput onSendMessage={handleSendMessage} />
        </>
      )}
    </div>
  )
}
