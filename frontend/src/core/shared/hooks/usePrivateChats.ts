import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../../auth/AuthContext';

export interface ChatRoom {
  id: string;
  name: string;
  lastMessage?: string;
  lastMessageTimestamp?: any;
  members: string[];
  photoURL?: string;
}

export const usePrivateChats = () => {
  const { currentUser } = useAuth();
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    // Listen for rooms where the current user is a member
    const q = query(
      collection(db, 'rooms'),
      where('members', 'array-contains', currentUser.uid),
      orderBy('lastMessageTimestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatRoom[];
      
      setChats(chatList);
      setLoading(false);
    }, (error) => {
      console.error('Firestore Chats Error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  return { chats, loading };
};
