import { useEffect, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Message } from '../types'

export function useMessages(roomId: string | null, pageSize: number = 50) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)

  // Subscribe to the first page of messages
  useEffect(() => {
    if (!roomId) {
      setMessages([])
      setLoading(false)
      return
    }

    setLoading(true)
    const q = query(
      collection(db, 'chatRooms', roomId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const mapped: Message[] = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<Message, 'id'>),
          }))
          .reverse() // Reverse to show oldest first

        setMessages(mapped)
        
        // Store last doc for pagination
        if (snapshot.docs.length > 0) {
          setLastDoc(snapshot.docs[snapshot.docs.length - 1])
          setHasMore(snapshot.docs.length === pageSize)
        } else {
          setHasMore(false)
        }
        
        setLoading(false)
      },
      () => {
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [roomId, pageSize])

  const loadMore = async () => {
    if (!roomId || !lastDoc || !hasMore) {
      return
    }

    try {
      const q = query(
        collection(db, 'chatRooms', roomId, 'messages'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(pageSize)
      )

      const snapshot = await new Promise<any>((resolve) => {
        const unsubscribe = onSnapshot(q, resolve)
        return unsubscribe
      })

      if (snapshot.docs.length === 0) {
        setHasMore(false)
        return
      }

      const newMessages: Message[] = snapshot.docs
        .map((doc: any) => ({
          id: doc.id,
          ...(doc.data() as Omit<Message, 'id'>),
        }))
        .reverse()

      setMessages((prev) => [...newMessages, ...prev])
      setLastDoc(snapshot.docs[snapshot.docs.length - 1])
      setHasMore(snapshot.docs.length === pageSize)
    } catch (error) {
      console.error('Failed to load more messages:', error)
    }
  }

  return { messages, loading, hasMore, loadMore }
}