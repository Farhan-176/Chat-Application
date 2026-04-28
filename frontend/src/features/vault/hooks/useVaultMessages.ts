import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../core/shared/config/firebase'; // Corrected path
import { Message } from '../components/VaultChat';

export const useVaultMessages = (contactId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contactId) return;

    // Constraint: Query only private_messages collection
    const q = query(
      collection(db, 'private_messages'),
      where('conversationId', '==', contactId), // Or however conversations are tracked
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      
      setMessages(fetchedMessages);
      setLoading(false);
    }, (error) => {
      console.error('Vault Firebase Error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [contactId]);

  const sendMessage = useCallback(async (text: string, senderId: string, senderName: string) => {
    // Constraint: Save only to private_messages
    try {
      await addDoc(collection(db, 'private_messages'), {
        conversationId: contactId,
        senderId,
        senderName,
        text,
        timestamp: serverTimestamp(),
        status: 'sent'
      });
    } catch (error) {
      console.error('Send Error:', error);
    }
  }, [contactId]);

  return { messages, sendMessage, loading };
};
