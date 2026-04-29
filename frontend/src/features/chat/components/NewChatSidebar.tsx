import React, { useState, useMemo } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../core/shared/config/firebase';
import { useAuth } from '../../../core/auth/AuthContext';
import { ArrowLeft, Search, Users, UserPlus, Mail, Phone } from 'lucide-react';

interface NewChatSidebarProps {
  onClose: () => void;
  onChatSelected: (chatId: string) => void;
}

export const NewChatSidebar: React.FC<NewChatSidebarProps> = ({ onClose, onChatSelected }) => {
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Smart Detection Logic
  const searchContext = useMemo(() => {
    const input = searchQuery.trim();
    if (!input) return { type: 'none', label: 'none' };
    
    if (input.includes('@')) {
      return { type: 'email', value: input.toLowerCase(), icon: <Mail size={16} /> };
    }
    if (/[0-9]/.test(input)) {
      const formatted = input.replace(/[^\d+]/g, '');
      return { type: 'phone', value: formatted, icon: <Phone size={16} /> };
    }
    return { type: 'unknown', icon: <Search size={16} /> };
  }, [searchQuery]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchContext.type === 'none') return;

    setLoading(true);
    setError('');
    try {
      let q;
      const usersRef = collection(db, 'users');

      if (searchContext.type === 'email') {
        q = query(usersRef, where('email', '==', searchContext.value));
      } else if (searchContext.type === 'phone') {
        q = query(usersRef, where('phoneNumber', '==', searchContext.value));
      } else {
        setError('Please enter a valid email or phone number.');
        setLoading(false);
        return;
      }

      const snapshot = await getDocs(q);
      const users = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.id !== currentUser?.uid);
      
      setResults(users);
      if (users.length === 0) {
        setError(`No user found with this ${searchContext.type}.`);
      }
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
    <div className="new-chat-sidebar" style={{ 
      display: 'flex', flexDirection: 'column', height: '100%', background: '#ffffff',
      animation: 'slideIn 0.3s ease-out'
    }}>
      {/* WhatsApp Green Header */}
      <header style={{ 
        height: '108px', background: '#008069', color: '#ffffff', 
        display: 'flex', alignItems: 'flex-end', padding: '0 20px 20px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <ArrowLeft size={24} onClick={onClose} style={{ cursor: 'pointer' }} />
          <h2 style={{ margin: 0, fontSize: '19px', fontWeight: '500' }}>New chat</h2>
        </div>
      </header>

      {/* Smart Search Bar Area */}
      <div style={{ padding: '10px 12px', background: '#ffffff', borderBottom: '1px solid #f0f2f5' }}>
        <form onSubmit={handleSearch} style={{ position: 'relative' }}>
          <input 
            type="text" 
            placeholder="Search phone number or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px 8px 40px', borderRadius: '8px',
              border: 'none', background: '#f0f2f5', outline: 'none', fontSize: '14px'
            }}
          />
          <div style={{ position: 'absolute', left: '12px', top: '10px', color: '#54656f', display: 'flex', alignItems: 'center' }}>
            {searchContext.icon || <Search size={16} />}
          </div>
          {loading && (
            <div style={{ position: 'absolute', right: '12px', top: '10px', fontSize: '12px', color: '#00a884' }}>...</div>
          )}
        </form>
      </div>

      {/* Scrollable Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* New Group Action */}
        {!searchQuery && (
          <div style={{ 
            display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer',
            transition: 'background 0.2s'
          }} onMouseOver={e => e.currentTarget.style.background = '#f5f6f6'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
            <div style={{ 
              width: '40px', height: '40px', borderRadius: '50%', background: '#00a884',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '15px'
            }}>
              <Users size={20} color="#fff" />
            </div>
            <span style={{ fontSize: '16px', color: '#111b21' }}>New group</span>
          </div>
        )}

        {error && <div style={{ padding: '16px', color: '#ea0038', fontSize: '14px' }}>{error}</div>}

        {/* Results List */}
        <div className="results-list">
          {results.map((user) => (
            <div 
              key={user.id} 
              className="contact-row" 
              onClick={() => startPrivateChat(user)}
              style={{
                display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer',
                borderBottom: '1px solid #f0f2f5'
              }}
            >
              <div className="row-avatar" style={{ 
                width: '40px', height: '40px', borderRadius: '50%', background: '#d1d7db',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '15px',
                fontSize: '18px', fontWeight: 'bold'
              }}>
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                ) : (
                  (user.displayName || user.name || '?').charAt(0).toUpperCase()
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', color: '#111b21' }}>{user.displayName || user.name}</div>
                <div style={{ fontSize: '13px', color: '#667781' }}>
                  {searchContext.type === 'phone' ? (user.phoneNumber || user.email) : user.email}
                </div>
              </div>
              <UserPlus size={18} color="#00a884" />
            </div>
          ))}
        </div>
      </div>
      
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};
