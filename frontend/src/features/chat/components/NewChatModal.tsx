import React, { useState } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, or, and } from 'firebase/firestore';
import { db } from '../../../core/shared/config/firebase';
import { useAuth } from '../../../core/auth/AuthContext';
import { X, Search, UserPlus } from 'lucide-react';

interface NewChatModalProps {
  onClose: () => void;
  onChatSelected: (chatId: string) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ onClose, onChatSelected }) => {
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError('');
    try {
      const q = query(
        collection(db, 'users'),
        where('email', '==', searchQuery.toLowerCase().trim())
      );
      const snapshot = await getDocs(q);
      const users = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.id !== currentUser?.uid);
      
      setResults(users);
      if (users.length === 0) setError('No user found with this email.');
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search users.');
    } finally {
      setLoading(false);
    }
  };

  const startPrivateChat = async (targetUser: any) => {
    if (!currentUser) return;

    try {
      // 1. Check if a 1:1 room already exists
      // We check rooms where type is private and members contains both
      const roomsRef = collection(db, 'rooms');
      const q = query(
        roomsRef,
        where('type', '==', 'private'),
        where('members', 'array-contains', currentUser.uid)
      );

      const snapshot = await getDocs(q);
      let existingRoomId = null;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.members.includes(targetUser.id)) {
          existingRoomId = doc.id;
        }
      });

      if (existingRoomId) {
        onChatSelected(existingRoomId);
        onClose();
        return;
      }

      // 2. Create new private room
      const newRoom = await addDoc(collection(db, 'rooms'), {
        type: 'private',
        name: targetUser.displayName || targetUser.name || 'Private Chat',
        members: [currentUser.uid, targetUser.id],
        createdAt: serverTimestamp(),
        lastMessage: '',
        lastMessageTimestamp: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      onChatSelected(newRoom.id);
      onClose();
    } catch (err) {
      console.error('Start chat error:', err);
      setError('Could not start chat.');
    }
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="modal-content" style={{
        background: '#ffffff', width: '400px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}>
        <header style={{
          padding: '16px', background: '#f0f2f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #d1d7db'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#111b21' }}>New Chat</h3>
          <X size={20} onClick={onClose} style={{ cursor: 'pointer', color: '#54656f' }} />
        </header>

        <div style={{ padding: '16px' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="email"
                placeholder="Search friend's email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px', border: '1px solid #d1d7db',
                  background: '#f0f2f5', outline: 'none'
                }}
              />
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#8696a0' }} />
            </div>
            <button type="submit" disabled={loading} style={{
              padding: '8px 16px', borderRadius: '8px', background: '#00a884', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer'
            }}>
              {loading ? '...' : 'Search'}
            </button>
          </form>

          {error && <div style={{ color: '#ea0038', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}

          <div className="search-results" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {results.map((user) => (
              <div 
                key={user.id} 
                onClick={() => startPrivateChat(user)}
                style={{
                  display: 'flex', alignItems: 'center', padding: '10px', borderRadius: '8px', cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#f5f6f6'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%', background: '#d1d7db', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold', marginRight: '12px'
                }}>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                  ) : (
                    (user.displayName || user.name || '?').charAt(0).toUpperCase()
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', color: '#111b21' }}>{user.displayName || user.name}</div>
                  <div style={{ fontSize: '12px', color: '#667781' }}>{user.email}</div>
                </div>
                <UserPlus size={18} color="#00a884" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
