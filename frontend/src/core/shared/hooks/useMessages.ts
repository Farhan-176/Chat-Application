import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface UnifiedMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  timestamp: any;
  status?: string;
}

export const useMessages = (roomId: string, chatType: 'chats' | 'radar', currentUser: any, anonymousAlias?: string, avatarUrl?: string) => {
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;

    let q;
    if (chatType === 'chats') {
      // Private Messages Collection
      q = query(
        collection(db, 'private_messages'),
        where('conversationId', '==', roomId),
        orderBy('timestamp', 'asc')
      );
    } else {
      // Public Rooms Collection
      q = query(
        collection(db, 'rooms', roomId, 'messages'),
        orderBy('timestamp', 'asc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          senderId: data.senderId,
          senderName: chatType === 'radar' ? (data.senderAlias || 'Anonymous') : (data.senderName || 'User'),
          senderAvatar: data.senderAvatar || data.photoURL,
          text: data.text,
          timestamp: data.timestamp,
          status: data.status
        };
      }) as UnifiedMessage[];
      
      setMessages(fetchedMessages);
      setLoading(false);
    }, (error) => {
      console.error(`Messages Sync Error (${chatType}):`, error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [roomId, chatType]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !currentUser) return;

    try {
      if (chatType === 'chats') {
        await addDoc(collection(db, 'private_messages'), {
          conversationId: roomId,
          senderId: currentUser?.uid,
          senderName: currentUser?.displayName || 'User',
          text,
          timestamp: serverTimestamp(),
          status: 'sent'
        });
      } else {
        // Radar/Public: Use anonymous identity
        await addDoc(collection(db, 'rooms', roomId, 'messages'), {
          senderId: currentUser?.uid,
          senderAlias: anonymousAlias || 'Anonymous',
          senderAvatar: avatarUrl,
          text,
          timestamp: serverTimestamp()
        });
      }
    } catch (error) {
      console.error(`Send Error (${chatType}):`, error);
    }
  }, [roomId, chatType, currentUser, anonymousAlias, avatarUrl]);

  return { messages, sendMessage, loading };
};
