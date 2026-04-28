import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface RoomMessage {
  id: string;
  senderId: string;
  senderAlias: string;
  senderAvatar?: string;
  text: string;
  timestamp: any;
}

export const useRoomMessages = (roomId: string) => {
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;

    const q = query(
      collection(db, 'rooms', roomId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RoomMessage[];
      
      setMessages(fetchedMessages);
      setLoading(false);
    }, (error) => {
      console.error('Room Messages Error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [roomId]);

  const sendMessage = useCallback(async (text: string, senderId: string, senderAlias: string, senderAvatar?: string) => {
    try {
      await addDoc(collection(db, 'rooms', roomId, 'messages'), {
        senderId,
        senderAlias,
        senderAvatar,
        text,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Room Send Error:', error);
    }
  }, [roomId]);

  return { messages, sendMessage, loading };
};
