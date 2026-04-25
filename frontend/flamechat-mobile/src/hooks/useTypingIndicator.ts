import { useEffect, useState, useRef } from 'react'
import { collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { User } from 'firebase/auth'

export interface TypingUser {
  uid: string
  displayName: string
  timestamp: number
}

export function useTypingIndicator(roomId: string | null, user: User | null) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Subscribe to typing users
  useEffect(() => {
    if (!roomId) {
      setTypingUsers([])
      return
    }

    const typingRef = collection(db, 'chatRooms', roomId, 'typing')
    const unsubscribe = onSnapshot(typingRef, (snapshot) => {
      const now = Date.now()
      const users: TypingUser[] = []

      snapshot.docs.forEach((doc) => {
        const data = doc.data()
        const timestamp = data.timestamp?.toMillis?.() || 0
        
        // Only show typing indicator if timestamp is recent (within 5 seconds)
        if (now - timestamp < 5000) {
          users.push({
            uid: data.uid,
            displayName: data.displayName,
            timestamp,
          })
        }
      })

      setTypingUsers(users)
    })

    return () => unsubscribe()
  }, [roomId])

  const setTyping = async (isTyping: boolean) => {
    if (!roomId || !user) {
      return
    }

    try {
      if (isTyping) {
        // Update typing status
        const typingRef = doc(db, 'chatRooms', roomId, 'typing', user.uid)
        await setDoc(typingRef, {
          uid: user.uid,
          displayName: user.displayName || user.email || 'Anonymous',
          timestamp: serverTimestamp(),
        }, { merge: true })

        // Clear previous timer
        if (typingTimerRef.current) {
          clearTimeout(typingTimerRef.current)
        }

        // Auto-clear typing status after 3 seconds of inactivity
        typingTimerRef.current = setTimeout(() => {
          clearTyping()
        }, 3000)
      } else {
        clearTyping()
      }
    } catch (error) {
      console.error('Failed to set typing status:', error)
    }
  }

  const clearTyping = async () => {
    if (!roomId || !user) {
      return
    }

    try {
      const typingRef = doc(db, 'chatRooms', roomId, 'typing', user.uid)
      await deleteDoc(typingRef)
    } catch (error) {
      console.error('Failed to clear typing status:', error)
    }
  }

  return { typingUsers, setTyping, clearTyping }
}
